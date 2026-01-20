export const XPATH_GET_HTML = "XPATH_GET_HTML" as const

export type XPathGetHtmlPayload = {
  targetTabId?: number
  xpath: string
  /**
   * 最多返回多少个字符（用于避免超大 innerHTML 卡死 UI/消息通道）
   */
  maxChars?: number
}

export type XPathGetHtmlResponse =
  | {
      ok: true
      matched: boolean
      html?: string
      meta?: { durationMs?: number; tabId?: number; truncated?: boolean }
    }
  | { ok: false; error: string }

