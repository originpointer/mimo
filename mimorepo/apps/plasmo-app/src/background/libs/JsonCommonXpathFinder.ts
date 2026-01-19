import type { JsonCommonXpathFindOptions, JsonCommonXpathFindPayload, JsonCommonXpathFindResponse } from "../../types/json-common-xpath"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

const DEFAULTS: JsonCommonXpathFindOptions = {
  maxHitsPerKey: 20,
  maxElementsScanned: 12_000,
  caseSensitive: false,
  includeShadow: false
}

export class JsonCommonXpathFinder {
  private readonly inFlightByTabId: Map<number, Promise<JsonCommonXpathFindResponse>> = new Map()

  public async find(tabId: number, payload: JsonCommonXpathFindPayload): Promise<JsonCommonXpathFindResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing
    const promise = this.findImpl(tabId, payload).finally(() => this.inFlightByTabId.delete(tabId))
    this.inFlightByTabId.set(tabId, promise)
    return await promise
  }

  private async attach(tabId: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        chrome.debugger.attach({ tabId }, "1.3", () => {
          const err = chrome.runtime.lastError
          if (err) return reject(new Error(err.message))
          resolve()
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  private async detach(tabId: number): Promise<void> {
    await new Promise<void>((resolve) => {
      try {
        chrome.debugger.detach({ tabId }, () => resolve())
      } catch {
        resolve()
      }
    })
  }

  private async sendCdp<T = unknown>(tabId: number, method: string, params?: Record<string, unknown>): Promise<T> {
    const target = { tabId } as Debuggee
    return await new Promise<T>((resolve, reject) => {
      try {
        chrome.debugger.sendCommand(target, method as never, (params || {}) as never, (result) => {
          const err = chrome.runtime.lastError
          if (err) return reject(new Error(err.message))
          resolve(result as T)
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  private normalizePayload(payload: JsonCommonXpathFindPayload): { kv: Record<string, string>; options: JsonCommonXpathFindOptions } | { error: string } {
    const kvIn = (payload && typeof payload === "object" ? (payload as any).kv : null) as unknown
    if (!kvIn || typeof kvIn !== "object" || Array.isArray(kvIn)) return { error: "payload.kv 必须是对象（Record<string,string>）" }
    const kv: Record<string, string> = {}
    for (const k of Object.keys(kvIn as any)) {
      const v = (kvIn as any)[k]
      if (typeof v !== "string") continue
      const key = String(k).trim()
      const val = v.trim()
      if (!key || !val) continue
      kv[key] = val
    }
    const keys = Object.keys(kv)
    if (!keys.length) return { error: "payload.kv 为空或不包含任何有效的 { key: string -> value: string }" }
    if (keys.length > 80) return { error: "payload.kv key 数量过多（>80），请缩小范围" }

    const raw = (payload?.options || {}) as Partial<JsonCommonXpathFindOptions>
    const maxHitsPerKey =
      typeof raw.maxHitsPerKey === "number" && Number.isFinite(raw.maxHitsPerKey) && raw.maxHitsPerKey > 0
        ? Math.floor(raw.maxHitsPerKey)
        : DEFAULTS.maxHitsPerKey
    const maxElementsScanned =
      typeof raw.maxElementsScanned === "number" && Number.isFinite(raw.maxElementsScanned) && raw.maxElementsScanned > 0
        ? Math.floor(raw.maxElementsScanned)
        : DEFAULTS.maxElementsScanned
    const caseSensitive = Boolean(raw.caseSensitive)
    const includeShadow = Boolean(raw.includeShadow)

    return {
      kv,
      options: {
        maxHitsPerKey: Math.min(Math.max(maxHitsPerKey, 1), 200),
        maxElementsScanned: Math.min(Math.max(maxElementsScanned, 500), 200_000),
        caseSensitive,
        includeShadow
      }
    }
  }

  private buildExpression(input: { kv: Record<string, string>; options: JsonCommonXpathFindOptions }): string {
    const kv = JSON.stringify(input.kv)
    const opt = JSON.stringify(input.options)

    return `(() => {
  const kv = ${kv};
  const opt = ${opt};

  const parentOrHost = (el) => {
    if (!el) return null;
    if (el.parentElement) return el.parentElement;
    try {
      const rn = el.getRootNode ? el.getRootNode() : null;
      if (rn && rn.host && rn.host.nodeType === 1) return rn.host;
    } catch {}
    return null;
  };

  const xpathFor = (el) => {
    try {
      if (!el || el.nodeType !== 1) return "";
      const segs = [];
      let cur = el;
      while (cur && cur.nodeType === 1) {
        const tag = String(cur.tagName || "").toLowerCase();
        if (!tag) break;
        let idx = 1;
        let sib = cur.previousElementSibling;
        while (sib) {
          if (String(sib.tagName || "").toLowerCase() === tag) idx++;
          sib = sib.previousElementSibling;
        }
        segs.push(tag + "[" + idx + "]");
        cur = parentOrHost(cur);
      }
      return "/" + segs.reverse().join("/");
    } catch {
      return "";
    }
  };

  const depthOf = (el) => {
    let d = 0;
    let cur = el;
    while (cur && cur.nodeType === 1) {
      d++;
      cur = parentOrHost(cur);
    }
    return d;
  };

  const textOf = (el) => {
    try {
      const t = (el && typeof el.innerText === "string" ? el.innerText : (el && el.textContent)) || "";
      return String(t).replace(/\\s+/g, " ").trim();
    } catch {
      try {
        const t = (el && el.textContent) || "";
        return String(t).replace(/\\s+/g, " ").trim();
      } catch {
        return "";
      }
    }
  };

  const keys = Object.keys(kv || {});
  const hitsByKeyEls = Object.create(null);
  const hitsByKey = Object.create(null);
  for (const k of keys) {
    hitsByKeyEls[k] = [];
    hitsByKey[k] = [];
  }

  const norm = (s) => (opt.caseSensitive ? String(s) : String(s).toLowerCase());
  const needleByKey = Object.create(null);
  for (const k of keys) needleByKey[k] = norm(kv[k]);

  const maxHits = Math.max(1, Math.floor(opt.maxHitsPerKey || 20));
  const maxScan = Math.max(1, Math.floor(opt.maxElementsScanned || 12000));
  const includeShadow = Boolean(opt.includeShadow);

  const shouldSkip = (el) => {
    const tag = String(el.tagName || "").toUpperCase();
    return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT";
  };

  const roots = [];
  const start = document.body || document.documentElement;
  if (start) roots.push(start);

  let scanned = 0;

  const pushShadow = (el) => {
    if (!includeShadow) return;
    try {
      const sr = el && el.shadowRoot;
      if (sr) roots.push(sr);
    } catch {}
  };

  const tryMatch = (el, text) => {
    const hay = norm(text);
    for (const k of keys) {
      if (hitsByKey[k].length >= maxHits) continue;
      const nd = needleByKey[k];
      if (!nd) continue;
      if (hay.includes(nd)) {
        const xp = xpathFor(el);
        if (xp) {
          hitsByKeyEls[k].push(el);
          hitsByKey[k].push(xp);
        }
      }
    }
  };

  while (roots.length) {
    const root = roots.pop();
    if (!root) continue;

    // root 可能是 Element 或 ShadowRoot（DocumentFragment）
    if (root.nodeType === 1) {
      const el = root;
      if (!shouldSkip(el)) {
        scanned++;
        const t = textOf(el);
        if (t) tryMatch(el, t);
        pushShadow(el);
        if (scanned >= maxScan) break;
      }
    }

    let walker = null;
    try {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    } catch {
      walker = null;
    }
    if (!walker) continue;

    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (!el || el.nodeType !== 1) continue;
      if (shouldSkip(el)) continue;

      scanned++;
      const t = textOf(el);
      if (t) tryMatch(el, t);
      pushShadow(el);

      if (scanned >= maxScan) break;
    }
    if (scanned >= maxScan) break;
  }

  // 去重（保持顺序）
  for (const k of keys) {
    const arr = hitsByKey[k] || [];
    const seen = new Set();
    const out = [];
    for (const xp of arr) {
      if (!xp || seen.has(xp)) continue;
      seen.add(xp);
      out.push(xp);
    }
    hitsByKey[k] = out;
  }

  const missedKeys = keys.filter((k) => !hitsByKey[k] || hitsByKey[k].length === 0);

  const result = {
    ok: true,
    containerXpaths: [],
    hitsByKey,
    meta: { scannedElements: scanned, missedKeys }
  };

  if (missedKeys.length) return result;

  // 计算所有 key 的最小共同父容器（可能多个）
  const ancestorSetForKey = (k) => {
    const set = new Set();
    const els = hitsByKeyEls[k] || [];
    for (const el of els) {
      let cur = el;
      while (cur && cur.nodeType === 1) {
        set.add(cur);
        cur = parentOrHost(cur);
      }
    }
    return set;
  };

  let common = null;
  for (const k of keys) {
    const set = ancestorSetForKey(k);
    if (!common) {
      common = new Set(set);
    } else {
      for (const el of Array.from(common)) {
        if (!set.has(el)) common.delete(el);
      }
    }
    if (common.size === 0) break;
  }

  if (!common || common.size === 0) return result;

  let maxDepth = 0;
  const scored = [];
  for (const el of common) {
    const d = depthOf(el);
    if (d > maxDepth) maxDepth = d;
    scored.push([el, d]);
  }

  const xps = [];
  const seen = new Set();
  for (const pair of scored) {
    const el = pair[0];
    const d = pair[1];
    if (d !== maxDepth) continue;
    const xp = xpathFor(el);
    if (!xp || seen.has(xp)) continue;
    seen.add(xp);
    xps.push(xp);
  }

  result.containerXpaths = xps;
  return result;
})()`
  }

  private async findImpl(tabId: number, payload: JsonCommonXpathFindPayload): Promise<JsonCommonXpathFindResponse> {
    const started = Date.now()

    const normalized = this.normalizePayload(payload)
    if ("error" in normalized) return { ok: false, error: normalized.error }

    try {
      await this.attach(tabId)
      await this.sendCdp(tabId, "Runtime.enable").catch(() => {})

      const expr = this.buildExpression(normalized)
      const evaluated = await this.sendCdp<{
        result?: { value?: any }
        exceptionDetails?: { text?: string; exception?: { description?: string } }
      }>(tabId, "Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      })

      if (evaluated?.exceptionDetails) {
        const msg =
          evaluated.exceptionDetails.exception?.description ||
          evaluated.exceptionDetails.text ||
          "Runtime.evaluate failed with exception"
        return { ok: false, error: msg }
      }

      const value = evaluated?.result?.value
      const ok = value && typeof value === "object" ? (value as any).ok : false
      if (!ok) {
        const err = value && typeof value === "object" ? String((value as any).error || "unknown error") : "unknown error"
        return { ok: false, error: err }
      }

      const containerXpaths = Array.isArray((value as any).containerXpaths) ? ((value as any).containerXpaths as string[]) : []
      const hitsByKey = (value as any).hitsByKey && typeof (value as any).hitsByKey === "object" ? ((value as any).hitsByKey as Record<string, string[]>) : {}
      const metaIn = (value as any).meta && typeof (value as any).meta === "object" ? (value as any).meta : {}

      return {
        ok: true,
        containerXpaths,
        hitsByKey,
        meta: {
          tabId,
          durationMs: Date.now() - started,
          scannedElements: typeof metaIn.scannedElements === "number" ? metaIn.scannedElements : undefined,
          missedKeys: Array.isArray(metaIn.missedKeys) ? (metaIn.missedKeys as string[]) : undefined
        }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}

