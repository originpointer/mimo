import type {
  XPathMarkByXpathResult,
  XPathMarkElementsResponse,
  XPathMarkMode
} from "../../types/xpath-mark"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

const STYLE_ID = "mimo-xpath-mark-style"
const MARK_ATTR = "data-mimo-xpath-mark"

export class XpathMarker {
  private readonly inFlightByTabId: Map<number, Promise<XPathMarkElementsResponse>> = new Map()

  public async run(tabId: number, input: { mode: XPathMarkMode; xpaths: string[] }): Promise<XPathMarkElementsResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing
    const promise = this.runImpl(tabId, input).finally(() => this.inFlightByTabId.delete(tabId))
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

  private buildExpression(input: { mode: XPathMarkMode; xpaths: string[] }): string {
    const payload = JSON.stringify({
      mode: input.mode,
      xpaths: (input.xpaths || []).slice(0, 1500)
    })

    // NOTE: 该表达式运行在目标页面上下文中（Runtime.evaluate）
    return `(() => {
  const payload = ${payload};
  const STYLE_ID = ${JSON.stringify(STYLE_ID)};
  const MARK_ATTR = ${JSON.stringify(MARK_ATTR)};
  const PALETTE = [
    "#FF3B30",
    "#34C759",
    "#007AFF",
    "#FF9500",
    "#AF52DE",
    "#5AC8FA",
    "#FF2D55",
    "#5856D6",
    "#FFCC00",
    "#32D74B",
    "#0A84FF",
    "#BF5AF2"
  ];

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        "[data-mimo-xpath-mark=\\"1\\"]{",
        "  outline: 2px solid var(--mimoMarkColor, #FF3B30) !important;",
        "  outline-offset: 2px !important;",
        "  box-shadow: 0 0 0 2px rgba(0,0,0,0.06) !important;",
        "}",
        // 让标记在一些 outline 被覆盖的场景更可见，但不阻断交互
        "[data-mimo-xpath-mark=\\"1\\"]::before{",
        "  content: \\"\\";",
        "  position: absolute;",
        "  pointer-events: none;",
        "}"
      ].join("\\n");
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function clearAll() {
    try {
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    } catch {}
    try {
      const els = document.querySelectorAll("[" + MARK_ATTR + "=\\"1\\"]");
      for (const el of Array.from(els)) {
        try {
          el.removeAttribute(MARK_ATTR);
          if (el && el.style && typeof el.style.removeProperty === "function") {
            el.style.removeProperty("--mimoMarkColor");
          }
        } catch {}
      }
    } catch {}
  }

  const mode = payload && payload.mode === "clear" ? "clear" : "mark";
  const xpaths = Array.isArray(payload && payload.xpaths) ? payload.xpaths : [];

  if (mode === "clear") {
    clearAll();
    return { ok: true, matchedCount: 0, markedCount: 0, byXpath: [], meta: { cleared: true } };
  }

  ensureStyle();

  /** @type {Array<{xpath:string, matchedCount:number, markedCount:number, error?:string}>} */
  const byXpath = [];
  let matchedCount = 0;
  let markedCount = 0;

  for (let i = 0; i < xpaths.length; i++) {
    const xp = String(xpaths[i] || "").trim();
    if (!xp) continue;
    const color = PALETTE[i % PALETTE.length];
    let localMatched = 0;
    let localMarked = 0;
    try {
      const snap = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const cnt = snap ? snap.snapshotLength : 0;
      localMatched = cnt;
      matchedCount += cnt;
      for (let j = 0; j < cnt; j++) {
        const n = snap.snapshotItem(j);
        if (!n || n.nodeType !== 1) continue;
        const el = /** @type {HTMLElement} */ (n);
        try {
          el.setAttribute(MARK_ATTR, "1");
          if (el && el.style && typeof el.style.setProperty === "function") {
            el.style.setProperty("--mimoMarkColor", color);
          }
          localMarked += 1;
          markedCount += 1;
        } catch {}
      }
      byXpath.push({ xpath: xp, matchedCount: localMatched, markedCount: localMarked });
    } catch (e) {
      byXpath.push({ xpath: xp, matchedCount: 0, markedCount: 0, error: (e && e.message) ? String(e.message) : String(e) });
    }
  }

  return { ok: true, matchedCount, markedCount, byXpath, meta: { cleared: false } };
})()`
  }

  private async runImpl(tabId: number, input: { mode: XPathMarkMode; xpaths: string[] }): Promise<XPathMarkElementsResponse> {
    const started = Date.now()
    try {
      await this.attach(tabId)
      await this.sendCdp(tabId, "Runtime.enable").catch(() => {})
      const expr = this.buildExpression(input)
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

      // page side returns { ok:true, matchedCount, markedCount, byXpath, meta }
      const ok = Boolean((value as any).ok)
      if (!ok) {
        return { ok: false, error: String((value as any).error || "mark failed") }
      }

      const byXpathRaw = Array.isArray((value as any).byXpath) ? (value as any).byXpath : []
      const byXpath: XPathMarkByXpathResult[] = byXpathRaw
        .map((r: any) => ({
          xpath: String(r?.xpath || ""),
          matchedCount: typeof r?.matchedCount === "number" ? r.matchedCount : 0,
          markedCount: typeof r?.markedCount === "number" ? r.markedCount : 0,
          ...(typeof r?.error === "string" && r.error ? { error: r.error } : {})
        }))
        .filter((r: XPathMarkByXpathResult) => r.xpath)

      const matchedCount = typeof (value as any).matchedCount === "number" ? (value as any).matchedCount : 0
      const markedCount = typeof (value as any).markedCount === "number" ? (value as any).markedCount : 0

      return {
        ok: true,
        matchedCount,
        markedCount,
        byXpath,
        meta: { tabId, durationMs: Date.now() - started }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}

