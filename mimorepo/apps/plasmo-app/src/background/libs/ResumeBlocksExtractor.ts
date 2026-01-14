import type { ResumeBlocksExtractOptions, ResumeBlocksExtractResponse } from "../../types/resume-blocks"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

export class ResumeBlocksExtractor {
  /**
   * 防抖/去重：同一个 tabId 的抽取不并发执行，避免重复 attach debugger。
   */
  private readonly inFlightByTabId: Map<number, Promise<ResumeBlocksExtractResponse>> = new Map()

  public async extract(tabId: number, options: ResumeBlocksExtractOptions): Promise<ResumeBlocksExtractResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing

    const promise = this.extractImpl(tabId, options).finally(() => {
      this.inFlightByTabId.delete(tabId)
    })
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

  private buildEvaluateExpression(options: ResumeBlocksExtractOptions): string {
    // 重要：这里的脚本会在页面上下文执行，尽量保持纯函数、限制输出大小，避免把整页 HTML 带出来。
    // options 通过 JSON 内联，避免依赖外部变量。
    const opt = JSON.stringify(options)
    return `(() => {
  const options = ${opt};

  const cleanText = (s) => String(s || "").replace(/\\s+/g, " ").trim();

  const tryGetStyle = (el) => {
    try { return getComputedStyle(el); } catch { return null; }
  };

  const isVisible = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const st = tryGetStyle(el);
    if (!st) return false;
    if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r && r.width > 6 && r.height > 6;
  };

  const toBBox = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };

  const isNoiseBySelectors = (el) => {
    const sel = String(options.noiseSelectors || "").trim();
    if (!sel) return false;
    try { return el.matches(sel) || Boolean(el.closest(sel)); } catch { return false; }
  };

  const noiseRe = (() => {
    try {
      const raw = String(options.noiseClassIdRegex || "").trim();
      if (!raw) return null;
      return new RegExp(raw, "i");
    } catch { return null; }
  })();

  const isNoiseByIdClass = (el) => {
    if (!noiseRe) return false;
    const s = (String(el.id || "") + " " + String(el.className || "")).toLowerCase();
    return noiseRe.test(s);
  };

  const xpathFor = (el) => {
    // 绝对 xpath，按 tagName 分桶计数（1-based），避免依赖 id/class。
    // 注意：页面可能有 Shadow DOM；此处仅按 light DOM 生成。
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
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
      parts.unshift(tag + "[" + idx + "]");
      cur = cur.parentElement;
      if (cur && cur.tagName && String(cur.tagName).toLowerCase() === "html") {
        parts.unshift("html[1]");
        break;
      }
      if (!cur) break;
      if (cur === document.body) {
        parts.unshift("body[1]");
        parts.unshift("html[1]");
        break;
      }
    }
    return "/" + parts.join("/");
  };

  const cssPathFor = (el) => {
    // 简易 css path：优先 id，否则逐级 tag:nth-of-type，限制层级避免过长。
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 8) {
      const id = cur.id ? String(cur.id) : "";
      if (id && /^[a-zA-Z][\\w:-]*$/.test(id)) {
        parts.unshift("#" + id);
        break;
      }
      const tag = String(cur.tagName || "").toLowerCase();
      if (!tag) break;
      let idx = 1;
      let sib = cur.previousElementSibling;
      while (sib) {
        if (String(sib.tagName || "").toLowerCase() === tag) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(tag + ":nth-of-type(" + idx + ")");
      cur = cur.parentElement;
      depth++;
      if (!cur || cur === document.body) break;
    }
    return parts.join(" > ");
  };

  const countDateHits = (text) => {
    const s = String(text || "");
    // 常见：2023.01 / 2023-01 / 2023/01 / 2023年 / 至今
    const r1 = s.match(/\\b20\\d{2}[.\\/-]\\d{1,2}\\b/g) || [];
    const r2 = s.match(/\\b20\\d{2}\\b/g) || [];
    const r3 = s.match(/至今|present|now/i) || [];
    return r1.length + Math.max(0, r2.length - r1.length) + r3.length;
  };

  const countKeywordHits = (text) => {
    const s = String(text || "").toLowerCase();
    const kws = [
      "工作经历","项目经历","教育经历","技能","证书","获奖","实习","校园","自我评价","个人总结","求职意向",
      "experience","project","education","skills","certification","award","intern","summary"
    ];
    let n = 0;
    for (const k of kws) if (s.includes(String(k).toLowerCase())) n++;
    return n;
  };

  const safeQueryAll = (el, sel) => {
    try { return Array.from(el.querySelectorAll(sel)); } catch { return []; }
  };

  const scoreBlock = (el, text) => {
    const textLen = text.length;
    const links = safeQueryAll(el, "a");
    let linkTextLen = 0;
    for (const a of links) linkTextLen += cleanText(a.innerText).length;
    const controlsCount = safeQueryAll(el, "input,button,select,textarea").length;
    const linkRatio = linkTextLen / Math.max(1, textLen);
    const dateHits = countDateHits(text);
    const keywordHits = countKeywordHits(text);
    // score：文本越多越好；导航/链接/控件越多越差；日期/关键词轻微加分
    const score = textLen - 5 * linkTextLen - 20 * controlsCount + 30 * Math.min(3, dateHits) + 40 * Math.min(3, keywordHits);
    return { score, signals: { textLen, linkRatio: Number(linkRatio.toFixed(3)), controlsCount, dateHits, keywordHits } };
  };

  const pickRoot = () => {
    const direct = document.querySelector("main,article,[role=main]");
    if (direct && isVisible(direct)) return direct;

    const candidates = Array.from(document.querySelectorAll("main,article,[role=main],section,div"))
      .filter((el) => el && el.nodeType === 1)
      .filter((el) => isVisible(el))
      .filter((el) => !isNoiseBySelectors(el) && !isNoiseByIdClass(el));

    let best = null;
    let bestScore = -1e18;
    for (const el of candidates.slice(0, 1500)) {
      const text = cleanText(el.innerText);
      if (text.length < 200) continue;
      const { score } = scoreBlock(el, text);
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best || document.body;
  };

  const root = pickRoot();
  const mainContainerXPath = xpathFor(root);
  const mainContainerCssPath = cssPathFor(root);
  const mainContainerBBox = toBBox(root);

  // collect candidates under root
  const rawCandidates = Array.from(root.querySelectorAll("section,article,div,li"))
    .filter((el) => isVisible(el))
    .filter((el) => !isNoiseBySelectors(el) && !isNoiseByIdClass(el));

  const minTextLen = Math.max(0, Number(options.minTextLen) || 0);
  const maxTextLen = Math.max(200, Number(options.maxTextLen) || 2000);
  const maxBlocks = Math.max(1, Math.floor(Number(options.maxBlocks) || 60));

  const items = [];
  for (const el of rawCandidates) {
    const text = cleanText(el.innerText);
    if (text.length < minTextLen) continue;
    if (text.length > maxTextLen * 3) continue; // 超大块先丢弃，避免把整页兜进来
    const clipped = text.length > maxTextLen ? text.slice(0, maxTextLen) : text;
    const { score, signals } = scoreBlock(el, clipped);
    if (signals.linkRatio > 0.55) continue;
    if (signals.controlsCount > 25) continue;
    items.push({ el, clipped, score, signals });
  }

  // 去重/去嵌套：优先保留高分块，避免返回一堆包含关系的容器
  items.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const it of items) {
    if (picked.length >= maxBlocks) break;
    let overlapped = false;
    for (const p of picked) {
      if (p.el === it.el) { overlapped = true; break; }
      if (p.el.contains(it.el) || it.el.contains(p.el)) { overlapped = true; break; }
    }
    if (overlapped) continue;
    picked.push(it);
  }

  const findHeading = (el) => {
    // 优先：块内最短的 h1/h2/h3/heading；否则回溯找最近的 heading
    const hs = safeQueryAll(el, "h1,h2,h3,[role=heading]")
      .filter((h) => isVisible(h))
      .map((h) => cleanText(h.innerText))
      .filter((t) => t && t.length <= 40);
    if (hs.length) return hs.sort((a, b) => a.length - b.length)[0];
    let cur = el;
    let hops = 0;
    while (cur && hops < 4) {
      const prev = cur.previousElementSibling;
      if (prev) {
        const hh = prev.matches && prev.matches("h1,h2,h3,[role=heading]") ? prev : prev.querySelector && prev.querySelector("h1,h2,h3,[role=heading]");
        if (hh && isVisible(hh)) {
          const t = cleanText(hh.innerText);
          if (t && t.length <= 40) return t;
        }
      }
      cur = cur.parentElement;
      hops++;
    }
    return "";
  };

  const blocks = picked.map((it, i) => {
    const el = it.el;
    const heading = findHeading(el);
    const xpath = xpathFor(el);
    const cssPath = cssPathFor(el);
    const bbox = toBBox(el);
    return {
      blockId: "b" + (i + 1),
      heading: heading || undefined,
      text: it.clipped,
      locator: { xpath, cssPath: cssPath || undefined },
      layout: bbox,
      score: Math.round(it.score),
      signals: it.signals
    };
  });

  // candidate nodes (for LLM selection)
  const maxCandidates = 500;
  const candidateEls = Array.from(root.querySelectorAll("h1,h2,h3,p,li,dt,dd,span,a,strong,em"))
    .filter((el) => isVisible(el))
    .filter((el) => !isNoiseBySelectors(el) && !isNoiseByIdClass(el));

  const candItems = [];
  for (const el of candidateEls) {
    if (candItems.length >= maxCandidates) break;
    const text = cleanText(el.innerText);
    if (!text) continue;
    // 过滤掉太长的节点（更像容器），但保留 heading
    const tag = String(el.tagName || "").toLowerCase();
    const isHeading = tag === "h1" || tag === "h2" || tag === "h3";
    if (!isHeading && (text.length < 2 || text.length > 120)) continue;
    const xpath = xpathFor(el);
    if (!xpath) continue;
    const cssPath = cssPathFor(el);
    const bbox = toBBox(el);
    candItems.push({
      id: "c" + candItems.length,
      xpath,
      cssPath: cssPath || undefined,
      tag,
      text: text.length > 200 ? text.slice(0, 200) : text,
      layout: bbox
    });
  }

  return {
    page: {
      url: location.href,
      title: document.title,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }
    },
    mainContainer: {
      xpath: mainContainerXPath,
      cssPath: mainContainerCssPath || undefined,
      layout: mainContainerBBox
    },
    candidates: candItems,
    blocks,
    meta: {
      totalCandidates: rawCandidates.length,
      rootPathHint: (root && root.tagName ? root.tagName.toLowerCase() : "unknown") + (root && root.id ? "#" + root.id : "")
    }
  };
})()`
  }

  private async extractImpl(tabId: number, options: ResumeBlocksExtractOptions): Promise<ResumeBlocksExtractResponse> {
    const started = Date.now()

    try {
      await this.attach(tabId)
      await this.sendCdp("Runtime.enable").catch(() => {})
      // Shadow DOM 支持：Runtime.evaluate 不需要额外参数；includeShadow 由页面脚本自行决定是否 querySelectorAll shadowRoot（本版先预留开关）
      const expr = this.buildEvaluateExpression(options)

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
      if (!value || typeof value !== "object") {
        return { ok: false, error: "Runtime.evaluate returned empty result" }
      }

      return {
        ok: true,
        page: value.page,
        mainContainer: value.mainContainer,
        candidates: Array.isArray(value.candidates) ? value.candidates : [],
        blocks: Array.isArray(value.blocks) ? value.blocks : [],
        meta: {
          tabId,
          durationMs: Date.now() - started,
          totalCandidates: value?.meta?.totalCandidates,
          rootPathHint: value?.meta?.rootPathHint
        }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}

