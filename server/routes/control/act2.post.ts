import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"

type Act2Action =
  | "click.selector"
  | "type.selector"
  | "click.iframeSelector"
  | "type.iframeSelector"

type Act2Body = {
  extensionId: string
  tabId: number
  replyUrl?: string
  action: Act2Action
  selector?: string
  text?: string
  frameSelector?: string
  timeoutMs?: number
  wait?: "stable" | "domReady" | "none"
  idleMs?: number
}

/**
 * POST /control/act2
 * 确定性“语义 act”最小实现（不依赖 LLM）：
 * - click/type by selector（同文档）
 * - click/type inside same-origin iframe（通过 iframeRect + elRect 推导页面坐标）
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<Act2Body> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }
  if (!body.action) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.action" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`
  const timeoutMs = typeof body.timeoutMs === "number" ? body.timeoutMs : 30000

  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    defaultTtlMs: timeoutMs,
    keepAttached: true
  })

  try {
    // Optional wait before action
    const waitMode = body.wait ?? "none"
    if (waitMode === "domReady") {
      await driver.waitForDomReady(body.tabId, timeoutMs)
    } else if (waitMode === "stable") {
      await driver.waitForStable(body.tabId, { timeoutMs, idleMs: body.idleMs })
    }

    let resolved: unknown = null
    let performed: unknown = null

    switch (body.action) {
      case "click.selector": {
        if (typeof body.selector !== "string" || !body.selector) {
          throw createError({ statusCode: 400, statusMessage: "Missing selector for click.selector" })
        }
        const r = await driver.clickSelector(body.selector, { tabId: body.tabId, timeoutMs })
        resolved = { nodeId: r.nodeId, x: r.x, y: r.y }
        performed = { clicked: true }
        break
      }
      case "type.selector": {
        if (typeof body.selector !== "string" || !body.selector) {
          throw createError({ statusCode: 400, statusMessage: "Missing selector for type.selector" })
        }
        if (typeof body.text !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing text for type.selector" })
        }
        const r = await driver.typeSelector(body.selector, body.text, { tabId: body.tabId })
        resolved = { nodeId: r.nodeId, x: r.x, y: r.y }
        performed = { typed: true, text: body.text }
        break
      }
      case "click.iframeSelector": {
        if (typeof body.frameSelector !== "string" || !body.frameSelector) {
          throw createError({ statusCode: 400, statusMessage: "Missing frameSelector for click.iframeSelector" })
        }
        if (typeof body.selector !== "string" || !body.selector) {
          throw createError({ statusCode: 400, statusMessage: "Missing selector for click.iframeSelector" })
        }
        const r = await driver.clickIframeSelector(body.frameSelector, body.selector, { tabId: body.tabId })
        resolved = { x: r.x, y: r.y }
        performed = { clicked: true }
        break
      }
      case "type.iframeSelector": {
        if (typeof body.frameSelector !== "string" || !body.frameSelector) {
          throw createError({ statusCode: 400, statusMessage: "Missing frameSelector for type.iframeSelector" })
        }
        if (typeof body.selector !== "string" || !body.selector) {
          throw createError({ statusCode: 400, statusMessage: "Missing selector for type.iframeSelector" })
        }
        if (typeof body.text !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing text for type.iframeSelector" })
        }
        const r = await driver.typeIframeSelector(body.frameSelector, body.selector, body.text, { tabId: body.tabId })
        resolved = { x: r.x, y: r.y }
        performed = { typed: true, text: body.text }
        break
      }
      default:
        throw createError({ statusCode: 400, statusMessage: `Unknown action: ${String(body.action)}` })
    }

    return { ok: true, action: body.action, resolved, performed }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Keep same style as /control/act: ok:false payload
    return { ok: false, action: body.action, error: { message } }
  }
})


