export const RESUME_BLOCKS_EXTRACT = "RESUME_BLOCKS_EXTRACT" as const

export type ResumeBlocksExtractOptions = {
  /**
   * 最多返回多少个 blocks（按 score 排序后截断）
   */
  maxBlocks: number
  /**
   * block 最小文本长度（过滤掉很短的噪声块）
   */
  minTextLen: number
  /**
   * 单个 block 的最大文本长度（用于截断，避免 JSON 过大）
   */
  maxTextLen: number
  /**
   * 是否遍历 open shadowRoot（只处理 open shadow DOM）
   */
  includeShadow: boolean
  /**
   * 噪声区域 selector（被命中则整体过滤）
   */
  noiseSelectors: string
  /**
   * 噪声 class/id 正则（字符串形式，page 内用 new RegExp）
   */
  noiseClassIdRegex: string
}

/**
 * Tab Page -> Background 的 payload：
 * - 允许携带 targetTabId（用于指定抽取哪个 tab）
 * - 其余字段为抽取参数
 */
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

