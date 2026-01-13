export const STAGEHAND_VIEWPORT_SCREENSHOT = "STAGEHAND_VIEWPORT_SCREENSHOT" as const

export type StagehandViewportScreenshotPayload = {
  /**
   * 可选：指定要截图的 tabId；不传则由 background 使用“当前活动标签页”
   */
  targetTabId?: number
}

export type StagehandViewportScreenshotResponse =
  | {
      ok: true
      /**
       * 纯 base64（不带 data url 前缀）
       */
      base64: string
      /**
       * data:image/png;base64,...
       */
      dataUrl: string
      meta?: { durationMs?: number; tabId?: number; clip?: { x: number; y: number; width: number; height: number; scale: number } }
    }
  | { ok: false; error: string }

