import type { ResumeXpathValidateResponse } from "../../types/resume-validate"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

export class ResumeXpathValidator {
  private readonly inFlightByTabId: Map<number, Promise<ResumeXpathValidateResponse>> = new Map()

  public async validate(tabId: number, xpaths: string[]): Promise<ResumeXpathValidateResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing
    const promise = this.validateImpl(tabId, xpaths).finally(() => this.inFlightByTabId.delete(tabId))
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

  private buildExpression(xpaths: string[]): string {
    const xs = JSON.stringify(xpaths.slice(0, 1500))
    return `(() => {
  const xpaths = ${xs};
  const out = [];
  for (const xp of xpaths) {
    try {
      const snap = document.evaluate(String(xp), document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const cnt = snap ? snap.snapshotLength : 0;
      let firstText = "";
      if (cnt > 0) {
        const n = snap.snapshotItem(0);
        if (n && n.nodeType === 1) {
          const t = (n.innerText || n.textContent || "").replace(/\\s+/g, " ").trim();
          firstText = t ? t.slice(0, 120) : "";
        } else if (n && n.textContent) {
          firstText = String(n.textContent).replace(/\\s+/g, " ").trim().slice(0, 120);
        }
      }
      out.push({ xpath: String(xp), matchedCount: cnt, firstTextSnippet: firstText || undefined });
    } catch (e) {
      out.push({ xpath: String(xp), matchedCount: 0, firstTextSnippet: undefined });
    }
  }
  return out;
})()`
  }

  private async validateImpl(tabId: number, xpaths: string[]): Promise<ResumeXpathValidateResponse> {
    const started = Date.now()
    try {
      await this.attach(tabId)
      await this.sendCdp("Runtime.enable").catch(() => {})
      const expr = this.buildExpression(xpaths)
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
      const results = Array.isArray(value) ? value : []
      return { ok: true, results, meta: { tabId, durationMs: Date.now() - started } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}

