import { eventHandler, getQuery } from "h3"
import { getRecentEvents, clearEvents } from "./events.post"

/**
 * GET /control/events
 * 查询最近的 CDP 事件
 * 
 * Query params:
 * - tabId: 过滤特定 tab
 * - sessionId: 过滤特定 session
 * - method: 模糊匹配 method 名称
 * - clear: 如果为 "1" 则清空事件
 */
export default eventHandler((event) => {
  const query = getQuery(event)
  
  if (query.clear === "1") {
    clearEvents()
    return { ok: true, message: "Events cleared" }
  }
  
  const filter: { tabId?: number; sessionId?: string; method?: string } = {}
  
  if (query.tabId !== undefined) {
    filter.tabId = Number(query.tabId)
  }
  if (query.sessionId !== undefined) {
    filter.sessionId = String(query.sessionId)
  }
  if (query.method !== undefined) {
    filter.method = String(query.method)
  }
  
  const events = getRecentEvents(filter)
  
  return {
    ok: true,
    count: events.length,
    events
  }
})



