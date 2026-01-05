import { eventHandler, readBody, createError } from "h3"
import {
  waitForPageLoad,
  waitForDomReady,
  waitForNetworkIdle,
  waitForStable,
  hasPageLoaded,
  hasDomContentLoaded,
  isNetworkIdle
} from "@/utils/control/waitHelpers"

type WaitBody = {
  tabId: number
  condition: "pageLoad" | "domReady" | "networkIdle" | "stable" | "check"
  timeoutMs?: number
  idleMs?: number
}

/**
 * POST /control/wait
 * 等待指定条件满足
 * 
 * Body:
 * - tabId: 目标 tab
 * - condition: 等待条件
 *   - "pageLoad": 等待 Page.loadEventFired
 *   - "domReady": 等待 Page.domContentEventFired
 *   - "networkIdle": 等待网络空闲
 *   - "stable": 等待 DOM 和网络都稳定
 *   - "check": 仅检查当前状态，不等待
 * - timeoutMs: 超时时间（默认 30000）
 * - idleMs: 网络空闲判断时间（默认 500）
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<WaitBody> | null

  if (!body || typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }

  if (!body.condition || typeof body.condition !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.condition" })
  }

  const tabId = body.tabId
  const timeoutMs = body.timeoutMs ?? 30000
  const idleMs = body.idleMs ?? 500

  // 仅检查当前状态
  if (body.condition === "check") {
    return {
      ok: true,
      tabId,
      status: {
        pageLoaded: hasPageLoaded(tabId),
        domReady: hasDomContentLoaded(tabId),
        networkIdle: isNetworkIdle(tabId, idleMs)
      }
    }
  }

  const startTime = Date.now()
  let result: boolean | { domReady: boolean; networkIdle: boolean }

  switch (body.condition) {
    case "pageLoad":
      result = await waitForPageLoad(tabId, { timeoutMs })
      break
    case "domReady":
      result = await waitForDomReady(tabId, { timeoutMs })
      break
    case "networkIdle":
      result = await waitForNetworkIdle(tabId, { idleMs, timeoutMs })
      break
    case "stable":
      result = await waitForStable(tabId, { idleMs, timeoutMs })
      break
    default:
      throw createError({ statusCode: 400, statusMessage: `Unknown condition: ${body.condition}` })
  }

  const durationMs = Date.now() - startTime

  return {
    ok: true,
    tabId,
    condition: body.condition,
    satisfied: typeof result === "boolean" ? result : result.domReady && result.networkIdle,
    result,
    durationMs
  }
})

