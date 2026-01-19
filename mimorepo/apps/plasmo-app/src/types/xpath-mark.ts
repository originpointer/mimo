export const XPATH_MARK_ELEMENTS = "XPATH_MARK_ELEMENTS" as const

export type XPathMarkMode = "mark" | "clear"

export type XPathMarkElementsPayload = {
  targetTabId?: number
  xpaths: string[]
  mode?: XPathMarkMode
}

export type XPathMarkByXpathResult = {
  xpath: string
  matchedCount: number
  markedCount: number
  error?: string
}

export type XPathMarkElementsResponse =
  | {
      ok: true
      matchedCount: number
      markedCount: number
      byXpath: XPathMarkByXpathResult[]
      meta?: { durationMs?: number; tabId?: number }
    }
  | { ok: false; error: string }

