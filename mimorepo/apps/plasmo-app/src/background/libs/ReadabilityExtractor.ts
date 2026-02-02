import type { ReadabilityExtractPayload, ReadabilityExtractResponse, ReadabilityExtractOptions } from "../../types/readability-extract"
import { READABILITY_SOURCE, READABILITY_READABLE_SOURCE } from "./readability-source"

type Debuggee = chrome.debugger.Debuggee & { tabId: number }

const DEFAULTS: ReadabilityExtractOptions = {
  maxElemsToParse: 0,
  nbTopCandidates: 5,
  charThreshold: 500,
  keepClasses: false,
  classesToPreserve: [],
  disableJSONLD: false
}

export class ReadabilityExtractor {
  private readonly inFlightByTabId: Map<number, Promise<ReadabilityExtractResponse>> = new Map()

  public async extract(tabId: number, payload: ReadabilityExtractPayload): Promise<ReadabilityExtractResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing
    const promise = this.extractImpl(tabId, payload).finally(() => this.inFlightByTabId.delete(tabId))
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

  private normalizePayload(payload: ReadabilityExtractPayload): {
    options: ReadabilityExtractOptions
    format: 'html' | 'text' | 'both'
    maxChars: number
    includeMetadata: boolean
  } {
    const raw = (payload?.options || {}) as Partial<ReadabilityExtractOptions>

    const maxElemsToParse =
      typeof raw.maxElemsToParse === "number" && Number.isFinite(raw.maxElemsToParse) && raw.maxElemsToParse >= 0
        ? Math.floor(raw.maxElemsToParse)
        : DEFAULTS.maxElemsToParse
    const nbTopCandidates =
      typeof raw.nbTopCandidates === "number" && Number.isFinite(raw.nbTopCandidates) && raw.nbTopCandidates > 0
        ? Math.floor(raw.nbTopCandidates)
        : DEFAULTS.nbTopCandidates
    const charThreshold =
      typeof raw.charThreshold === "number" && Number.isFinite(raw.charThreshold) && raw.charThreshold >= 0
        ? Math.floor(raw.charThreshold)
        : DEFAULTS.charThreshold
    const keepClasses = Boolean(raw.keepClasses)
    const classesToPreserve = Array.isArray(raw.classesToPreserve) ? raw.classesToPreserve : DEFAULTS.classesToPreserve
    const disableJSONLD = Boolean(raw.disableJSONLD)

    const format = payload.format === 'html' || payload.format === 'text' ? payload.format : 'both'
    const maxChars = typeof payload.maxChars === "number" && Number.isFinite(payload.maxChars) && payload.maxChars >= 0
      ? Math.floor(payload.maxChars)
      : 0
    const includeMetadata = payload.includeMetadata !== false

    return {
      options: {
        maxElemsToParse,
        nbTopCandidates: Math.min(Math.max(nbTopCandidates, 1), 100),
        charThreshold,
        keepClasses,
        classesToPreserve,
        disableJSONLD
      },
      format,
      maxChars,
      includeMetadata
    }
  }

  private buildExpression(input: {
    options: ReadabilityExtractOptions
    format: 'html' | 'text' | 'both'
    maxChars: number
    includeMetadata: boolean
  }): string {
    const opts = JSON.stringify(input.options)
    const format = JSON.stringify(input.format)
    const maxChars = JSON.stringify(input.maxChars)
    const includeMetadata = JSON.stringify(input.includeMetadata)

    // The Readability library and isProbablyReaderable function will be injected here
    // We use the embedded source from readability-source.ts
    const readabilityLib = READABILITY_SOURCE
    const readerableLib = READABILITY_READABLE_SOURCE

    return `(() => {
      // Inject Readability library
      ${readabilityLib}
      ${readerableLib}

      const documentClone = document.cloneNode(true);
      const article = new Readability(documentClone, ${opts}).parse();
      const isProbablyReaderable = isProbablyReaderable(document);

      if (!article) {
        return {
          ok: true,
          article: null,
          isProbablyReaderable
        };
      }

      // Process based on format preference
      const result = {
        ok: true,
        article: {},
        isProbablyReaderable
      };

      if (${includeMetadata}) {
        result.article.title = article.title;
        result.article.byline = article.byline;
        result.article.dir = article.dir;
        result.article.siteName = article.siteName;
        result.article.lang = article.lang;
        result.article.publishedTime = article.publishedTime;
        result.article.excerpt = article.excerpt;
      }

      if (${format} === 'html' || ${format} === 'both') {
        result.article.content = article.content;
      }

      if (${format} === 'text' || ${format} === 'both') {
        let text = article.textContent || '';
        if (${maxChars} > 0 && text.length > ${maxChars}) {
          text = text.substring(0, ${maxChars});
        }
        result.article.textContent = text;
        result.article.length = text.length;
      }

      return result;
    })()`
  }

  private async extractImpl(tabId: number, payload: ReadabilityExtractPayload): Promise<ReadabilityExtractResponse> {
    const started = Date.now()

    const normalized = this.normalizePayload(payload)

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
      if (!value || typeof value !== 'object') {
        return { ok: false, error: "Invalid response from Readability" }
      }

      if (!value.ok) {
        return { ok: false, error: value.error || "Readability parsing failed" }
      }

      return {
        ok: true,
        article: value.article || null,
        isProbablyReaderable: value.isProbablyReaderable || false,
        meta: {
          tabId,
          durationMs: Date.now() - started
        }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      await this.detach(tabId)
    }
  }
}
