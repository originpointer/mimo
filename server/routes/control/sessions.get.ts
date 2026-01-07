import { eventHandler, getQuery } from "h3"
import {
  getAllTabSessions,
  getTabSessionSummary,
  getChildSessionsByTabId,
  findSessionByUrl,
  findSessionByType
} from "@/utils/control/sessionRegistry"

/**
 * GET /control/sessions
 * 查询服务端维护的 session registry
 * 
 * Query params:
 * - tabId: 查询特定 tab 的子 sessions
 * - summary: 如果为 "1" 则只返回摘要
 * - url: 按 URL 模糊查找 session
 * - type: 按 type 查找 session (iframe, worker, etc.)
 */
export default eventHandler((event) => {
  const query = getQuery(event)
  
  // 返回摘要
  if (query.summary === "1") {
    return {
      ok: true,
      summary: getTabSessionSummary()
    }
  }
  
  // 查询特定 tab
  if (query.tabId !== undefined) {
    const tabId = Number(query.tabId)
    
    // 按 URL 查找
    if (query.url !== undefined) {
      const session = findSessionByUrl(tabId, String(query.url))
      return {
        ok: true,
        tabId,
        match: session || null
      }
    }
    
    // 按 type 查找
    if (query.type !== undefined) {
      const sessions = findSessionByType(tabId, query.type as "iframe" | "worker")
      return {
        ok: true,
        tabId,
        type: query.type,
        sessions
      }
    }
    
    // 返回所有子 sessions
    const children = getChildSessionsByTabId(tabId)
    return {
      ok: true,
      tabId,
      children
    }
  }
  
  // 返回所有 tab sessions
  const allSessions = getAllTabSessions().map((s) => ({
    tabId: s.tabId,
    rootSessionId: s.rootSessionId,
    childCount: s.children.size,
    children: Array.from(s.children.values()),
    lastActivity: s.lastActivity
  }))
  
  return {
    ok: true,
    count: allSessions.length,
    sessions: allSessions
  }
})



