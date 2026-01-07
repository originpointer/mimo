import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"

type ObserveInclude = "document" | "axTree" | "screenshot" | "frameTree"

type ObserveBody = {
  extensionId: string
  tabId: number
  replyUrl?: string
  sessionId?: string
  include?: ObserveInclude[] | ObserveInclude
  depth?: number
  screenshot?: { format?: "png" | "jpeg"; quality?: number }
}

/**
 * POST /control/observe
 * Stagehand observe() 的最小实现：
 * - 可返回 DOM.getDocument / Accessibility.getFullAXTree / Page.captureScreenshot / Page.getFrameTree
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<ObserveBody> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`
  const includeRaw = body.include ?? ["document"]
  const include = (Array.isArray(includeRaw) ? includeRaw : [includeRaw]).filter(Boolean) as ObserveInclude[]

  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    keepAttached: true
  })

  try {
    const result: Record<string, unknown> = {
      tabId: body.tabId,
      sessionId: body.sessionId ?? null,
      include
    }

    const tasks: Array<Promise<void>> = []

    if (include.includes("frameTree")) {
      tasks.push(
        driver
          .getFrameTree(body.tabId)
          .then((frameTree) => {
            result.frameTree = frameTree
          })
      )
    }

    if (include.includes("document")) {
      tasks.push(
        driver
          .getDocument({ tabId: body.tabId, sessionId: body.sessionId, depth: body.depth ?? 1 })
          .then((doc) => {
            result.document = doc
          })
      )
    }

    if (include.includes("screenshot")) {
      tasks.push(
        driver
          .screenshot({ format: body.screenshot?.format ?? "png", quality: body.screenshot?.quality, sessionId: body.sessionId })
          .then((data) => {
            result.screenshot = data
          })
      )
    }

    if (include.includes("axTree")) {
      tasks.push(
        (async () => {
          // Ensure Accessibility domain enabled
          await driver.send("Accessibility.enable", {}, { tabId: body.tabId, sessionId: body.sessionId })
          const ax = await driver.send("Accessibility.getFullAXTree", {}, { tabId: body.tabId, sessionId: body.sessionId })
          if (!ax.ok) throw new Error(ax.error?.message ?? "Accessibility.getFullAXTree failed")
          result.axTree = ax.response
        })()
      )
    }

    await Promise.all(tasks)

    return { ok: true, result }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: { message } }
  }
})




