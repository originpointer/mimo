import { eventHandler, readBody, createError } from "h3"
import { registerChildSession, unregisterChildSession, clearTabSession } from "@/utils/control/sessionRegistry"
import { createLogger } from "@/utils/logger"

const logger = createLogger('events')

/**
 * CDP Event Store
 * 存储最近的 CDP 事件，供调试和验证
 */
interface CdpEvent {
  tabId: number
  sessionId: string | null
  method: string
  params: unknown
  ts: number
  receivedAt: number
}

const eventStore: CdpEvent[] = []
const MAX_EVENTS = 500

export function getRecentEvents(filter?: { tabId?: number; sessionId?: string; method?: string }): CdpEvent[] {
  let events = eventStore
  if (filter?.tabId !== undefined) {
    events = events.filter((e) => e.tabId === filter.tabId)
  }
  if (filter?.sessionId !== undefined) {
    events = events.filter((e) => e.sessionId === filter.sessionId)
  }
  if (filter?.method !== undefined) {
    events = events.filter((e) => e.method.includes(filter.method))
  }
  return events.slice(-100) // 返回最近 100 条
}

export function clearEvents(): void {
  eventStore.length = 0
}

/**
 * 处理 Target 事件，更新 session registry
 */
function handleTargetEvent(tabId: number, method: string, params: Record<string, unknown>): void {
  if (method === "Target.attachedToTarget") {
    const sessionId = params.sessionId as string
    const targetInfo = params.targetInfo as { targetId: string; type: string; url: string } | undefined
    if (sessionId && targetInfo) {
      registerChildSession(tabId, sessionId, targetInfo)
    }
  } else if (method === "Target.detachedFromTarget") {
    const sessionId = params.sessionId as string
    if (sessionId) {
      unregisterChildSession(tabId, sessionId)
    }
  } else if (method === "Target.targetDestroyed") {
    // 当整个 target 被销毁时，可能需要清理
    // 暂不处理，依赖 detachedFromTarget
  }
}

/**
 * POST /control/events
 * 接收扩展侧通过 chrome.debugger.onEvent 回传的事件流
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, statusMessage: "Invalid body" })
  }

  const { tabId, sessionId, method, params, ts } = body
  const receivedAt = Date.now()

  // 存储事件
  const cdpEvent: CdpEvent = {
    tabId: Number(tabId),
    sessionId: sessionId || null,
    method: String(method || ""),
    params,
    ts: Number(ts) || receivedAt,
    receivedAt
  }
  
  eventStore.push(cdpEvent)
  if (eventStore.length > MAX_EVENTS) {
    eventStore.shift()
  }

  // 处理 Target 事件，更新 session registry
  if (method?.startsWith("Target.")) {
    handleTargetEvent(cdpEvent.tabId, method, (params as Record<string, unknown>) || {})
  }

  // 打印关键事件到控制台
  const isImportant = 
    method?.startsWith("Target.") || 
    method?.startsWith("Page.frame") || 
    method?.startsWith("Page.load") || 
    method?.startsWith("Page.domContent") ||
    method?.startsWith("Runtime.execution") ||
    method?.startsWith("Runtime.executionContext")

  if (isImportant) {
    logger.info({
      tabId,
      sessionId: sessionId || "(root)",
      method,
      params
    }, 'Important event received')
  }

  return { ok: true, received: { tabId, sessionId, method, ts } }
})

