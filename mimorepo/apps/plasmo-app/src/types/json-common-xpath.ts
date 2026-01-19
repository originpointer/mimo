export const JSON_COMMON_XPATH_FIND = "JSON_COMMON_XPATH_FIND" as const

export type JsonCommonXpathFindOptions = {
  /**
   * 每个 key 最多保留多少个命中元素
   */
  maxHitsPerKey: number
  /**
   * 最多扫描多少个元素（防止极端页面卡死）
   */
  maxElementsScanned: number
  /**
   * contains 匹配是否区分大小写
   */
  caseSensitive: boolean
  /**
   * 是否遍历 open shadowRoot（只处理 open shadow DOM）
   */
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

