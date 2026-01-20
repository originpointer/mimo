import type { XPathGetHtmlResponse } from "../../types/xpath-get-html"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

export class XpathHtmlGetter {
  private readonly inFlightByTabId: Map<number, Promise<XPathGetHtmlResponse>> = new Map()

  public async get(tabId: number, input: { xpath: string; maxChars?: number }): Promise<XPathGetHtmlResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing
    const promise = this.getImpl(tabId, input).finally(() => this.inFlightByTabId.delete(tabId))
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

  private buildExpression(input: { xpath: string; maxChars?: number }): string {
    const payload = JSON.stringify({
      xpath: String(input.xpath || ""),
      maxChars: typeof input.maxChars === "number" ? input.maxChars : undefined
    })

    // NOTE: 该表达式运行在目标页面上下文中（Runtime.evaluate）
    return `(() => {
  const payload = ${payload};
  const xpath = String(payload && payload.xpath ? payload.xpath : "").trim();
  const maxCharsRaw = payload && typeof payload.maxChars === "number" ? payload.maxChars : undefined;
  const maxChars = (typeof maxCharsRaw === "number" && isFinite(maxCharsRaw) && maxCharsRaw > 0) ? Math.floor(maxCharsRaw) : 200000;

  if (!xpath) return { ok: false, error: "xpath is empty" };

  try {
    const snap = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const cnt = snap ? snap.snapshotLength : 0;
    if (!cnt) return { ok: true, matched: false };
    const n = snap.snapshotItem(0);
    if (!n || n.nodeType !== 1) return { ok: true, matched: false };

    const el = /** @type {Element} */ (n);
    let html = "";
    try {
      // 用户要求 innerHTML
      html = String(el.innerHTML || "");
    } catch {
      html = "";
    }

    const truncated = html.length > maxChars;
    if (truncated) html = html.slice(0, maxChars);
    return { ok: true, matched: true, html, meta: { truncated } };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? String(e.message) : String(e) };
  }
})()`
  }

  private async getImpl(tabId: number, input: { xpath: string; maxChars?: number }): Promise<XPathGetHtmlResponse> {
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

      const ok = Boolean((value as any).ok)
      if (!ok) {
        return { ok: false, error: String((value as any).error || "get html failed") }
      }

      const matched = Boolean((value as any).matched)
      const html = typeof (value as any).html === "string" ? (value as any).html : undefined
      const truncated = Boolean((value as any)?.meta?.truncated)

      return {
        ok: true,
        matched,
        ...(matched ? { html: html ?? "" } : {}),
        meta: { tabId, durationMs: Date.now() - started, truncated }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}

