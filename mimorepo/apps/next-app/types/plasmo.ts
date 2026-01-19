export const STAGEHAND_XPATH_SCAN = "STAGEHAND_XPATH_SCAN" as const
export const STAGEHAND_VIEWPORT_SCREENSHOT = "STAGEHAND_VIEWPORT_SCREENSHOT" as const
export const RESUME_BLOCKS_EXTRACT = "RESUME_BLOCKS_EXTRACT" as const
export const RESUME_XPATH_VALIDATE = "RESUME_XPATH_VALIDATE" as const
export const LIST_TABS = "LIST_TABS" as const
export const JSON_COMMON_XPATH_FIND = "JSON_COMMON_XPATH_FIND" as const
export const XPATH_MARK_ELEMENTS = "XPATH_MARK_ELEMENTS" as const

export type StagehandXPathScanOptions = {
  maxItems: number
  selector: string
  includeShadow: boolean
}

export type StagehandXPathScanPayload = StagehandXPathScanOptions & {
  targetTabId?: number
}

export type StagehandXPathItem = {
  xpath: string
  tagName: string
  id?: string
  className?: string
  textSnippet?: string
}

export type StagehandXPathScanResponse =
  | { ok: true; items: StagehandXPathItem[]; meta?: { totalCandidates?: number; durationMs?: number } }
  | { ok: false; error: string }

export type StagehandViewportScreenshotPayload = {
  targetTabId?: number
  taskId?: string
}

export type StagehandViewportScreenshotResponse =
  | {
      ok: true
      base64: string
      dataUrl: string
      meta?: { durationMs?: number; tabId?: number; clip?: { x: number; y: number; width: number; height: number; scale: number } }
    }
  | { ok: false; error: string }

export type ResumeBlocksExtractOptions = {
  maxBlocks: number
  minTextLen: number
  maxTextLen: number
  includeShadow: boolean
  noiseSelectors: string
  noiseClassIdRegex: string
}

export type ResumeBlocksExtractPayload = ResumeBlocksExtractOptions & {
  targetTabId?: number
}

export type ResumePageMeta = {
  url: string
  title: string
  viewport: { w: number; h: number; dpr: number }
}

export type ResumeMainContainer = {
  xpath: string
  cssPath?: string
  layout?: { x: number; y: number; w: number; h: number }
}

export type ResumeCandidateNode = {
  id: string
  xpath: string
  cssPath?: string
  tag?: string
  text: string
  layout?: { x: number; y: number; w: number; h: number }
}

export type ResumeBlock = {
  blockId: string
  heading?: string
  text: string
  locator: { xpath: string; cssPath?: string }
  layout: { x: number; y: number; w: number; h: number }
  score: number
  signals: {
    textLen: number
    linkRatio: number
    controlsCount: number
    dateHits: number
    keywordHits: number
  }
}

export type ResumeBlocksExtractResponse =
  | {
      ok: true
      page: ResumePageMeta
      mainContainer?: ResumeMainContainer
      candidates?: ResumeCandidateNode[]
      blocks: ResumeBlock[]
      meta?: { tabId?: number; durationMs?: number; totalCandidates?: number; rootPathHint?: string }
    }
  | { ok: false; error: string }

export type ResumeXpathValidatePayload = {
  targetTabId?: number
  xpaths: string[]
}

export type ResumeXpathValidateResult = {
  xpath: string
  matchedCount: number
  firstTextSnippet?: string
}

export type ResumeXpathValidateResponse =
  | { ok: true; results: ResumeXpathValidateResult[]; meta?: { durationMs?: number; tabId?: number } }
  | { ok: false; error: string }

export type ListTabsPayload = {
  includeAllWindows?: boolean
}

export type ListTabsItem = {
  id: number
  url?: string
  title?: string
  windowId?: number
  active?: boolean
}

export type ListTabsResponse =
  | { ok: true; tabs: ListTabsItem[] }
  | { ok: false; error: string }

export type JsonCommonXpathFindOptions = {
  maxHitsPerKey: number
  maxElementsScanned: number
  caseSensitive: boolean
  includeShadow: boolean
}

export type JsonCommonXpathFindPayload = {
  targetTabId?: number
  kv: Record<string, string>
  options?: Partial<JsonCommonXpathFindOptions>
}

export type JsonCommonXpathFindResponse =
  | {
      ok: true
      containerXpaths: string[]
      hitsByKey: Record<string, string[]>
      meta?: { durationMs?: number; tabId?: number; scannedElements?: number; missedKeys?: string[] }
    }
  | { ok: false; error: string }

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

