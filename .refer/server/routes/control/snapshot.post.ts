import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"
import { captureHybridSnapshot, captureSimpleSnapshot } from "@/utils/control/snapshot"

type SnapshotBody = {
  extensionId: string
  tabId: number
  replyUrl?: string
  sessionId?: string
  /** 是否使用完整的多 frame 快照 */
  fullSnapshot?: boolean
  /** 是否穿透 shadow DOM */
  pierceShadow?: boolean
  /** 聚焦选择器（可选） */
  focusSelector?: string
  /** 是否启用实验性功能 */
  experimental?: boolean
}

/**
 * POST /control/snapshot
 * 
 * Stagehand captureHybridSnapshot 的实现：
 * - 返回 combinedTree（文本大纲，供 LLM 使用）
 * - 返回 combinedXpathMap（elementId -> XPath 映射）
 * - 返回 combinedUrlMap（elementId -> URL 映射）
 * 
 * @example
 * ```bash
 * curl -X POST http://localhost:3000/control/snapshot \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "extensionId": "xxx",
 *     "tabId": 123
 *   }'
 * ```
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<SnapshotBody> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`

  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    keepAttached: true
  })

  try {
    const options = {
      pierceShadow: body.pierceShadow ?? true,
      focusSelector: body.focusSelector,
      experimental: body.experimental ?? false,
      sessionId: body.sessionId,
      tabId: body.tabId
    }

    // 根据选项决定使用完整快照还是简化快照
    const snapshot = body.fullSnapshot
      ? await captureHybridSnapshot(driver, options)
      : await captureSimpleSnapshot(driver, options)

    return {
      ok: true,
      result: {
        tabId: body.tabId,
        sessionId: body.sessionId ?? null,
        combinedTree: snapshot.combinedTree,
        combinedXpathMap: snapshot.combinedXpathMap,
        combinedUrlMap: snapshot.combinedUrlMap,
        perFrame: snapshot.perFrame,
        // 额外统计信息
        stats: {
          elementCount: Object.keys(snapshot.combinedXpathMap).length,
          urlCount: Object.keys(snapshot.combinedUrlMap).length,
          frameCount: snapshot.perFrame?.length ?? 1,
          treeLength: snapshot.combinedTree.length
        }
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: { message } }
  }
})
