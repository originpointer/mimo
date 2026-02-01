export const STAGEHAND_XPATH_SCAN = 'STAGEHAND_XPATH_SCAN' as const;

export type StagehandXPathScanOptions = {
  /**
   * 最多返回多少个元素（按文档顺序截断）
   * 默认由调用方决定（建议 200）
   */
  maxItems: number;
  /**
   * querySelectorAll 用于选取候选“可交互元素”的 selector
   */
  selector: string;
  /**
   * 是否遍历 open shadowRoot（只处理 open shadow DOM）
   */
  includeShadow: boolean;
};

/**
 * Tab Page -> Background 的 payload：
 * - 允许携带 targetTabId（用于指定扫描哪个 tab）
 * - 其余字段为扫描参数
 */
export type StagehandXPathScanPayload = StagehandXPathScanOptions & {
  targetTabId?: number;
};

export type StagehandXPathItem = {
  xpath: string;
  tagName: string;
  id?: string;
  className?: string;
  textSnippet?: string;
};

export type StagehandXPathScanResponse =
  | {
      ok: true
      /**
       * Convenience field for downstream tools:
       * `xpaths === items.map(i => i.xpath)`
       */
      xpaths?: string[]
      items: StagehandXPathItem[]
      meta?: { totalCandidates?: number; durationMs?: number }
    }
  | { ok: false; error: string };

