/**
 * Session Registry
 * 
 * 服务端维护的会话注册表，用于追踪：
 * - 每个 tab 的根会话
 * - 子会话（iframe、worker 等）
 * 
 * 数据来源：扩展侧通过 /control/events POST 的 Target.attachedToTarget / Target.detachedFromTarget 事件
 */

export interface TargetInfo {
  targetId: string
  sessionId: string
  type: "page" | "iframe" | "worker" | "service_worker" | "other"
  url: string
  attachedAt: number
}

export interface TabSession {
  tabId: number
  rootSessionId: string | null
  children: Map<string, TargetInfo> // sessionId -> TargetInfo
  lastActivity: number
}

import { createLogger } from "@/utils/logger"

const logger = createLogger('sessionRegistry')

const tabSessions = new Map<number, TabSession>()

export function getOrCreateTabSession(tabId: number): TabSession {
  if (!tabSessions.has(tabId)) {
    tabSessions.set(tabId, {
      tabId,
      rootSessionId: null,
      children: new Map(),
      lastActivity: Date.now()
    })
  }
  return tabSessions.get(tabId)!
}

export function registerChildSession(
  tabId: number,
  sessionId: string,
  targetInfo: { targetId: string; type: string; url: string }
): void {
  const session = getOrCreateTabSession(tabId)
  session.children.set(sessionId, {
    targetId: targetInfo.targetId,
    sessionId,
    type: (targetInfo.type as TargetInfo["type"]) || "other",
    url: targetInfo.url || "",
    attachedAt: Date.now()
  })
  session.lastActivity = Date.now()
  logger.info({ tabId, sessionId, type: targetInfo.type }, 'Child registered')
}

export function unregisterChildSession(tabId: number, sessionId: string): void {
  const session = tabSessions.get(tabId)
  if (session) {
    session.children.delete(sessionId)
    session.lastActivity = Date.now()
    logger.info({ tabId, sessionId }, 'Child unregistered')
  }
}

export function clearTabSession(tabId: number): void {
  tabSessions.delete(tabId)
  logger.info({ tabId }, 'Tab session cleared')
}

export function getChildSessionsByTabId(tabId: number): TargetInfo[] {
  const session = tabSessions.get(tabId)
  if (!session) return []
  return Array.from(session.children.values())
}

export function findSessionByUrl(tabId: number, urlPattern: string): TargetInfo | undefined {
  const session = tabSessions.get(tabId)
  if (!session) return undefined
  for (const child of session.children.values()) {
    if (child.url.includes(urlPattern)) {
      return child
    }
  }
  return undefined
}

export function findSessionByType(tabId: number, type: TargetInfo["type"]): TargetInfo[] {
  const session = tabSessions.get(tabId)
  if (!session) return []
  return Array.from(session.children.values()).filter((c) => c.type === type)
}

export function getAllTabSessions(): TabSession[] {
  return Array.from(tabSessions.values())
}

export function getTabSessionSummary(): Array<{ tabId: number; childCount: number; lastActivity: number }> {
  return Array.from(tabSessions.values()).map((s) => ({
    tabId: s.tabId,
    childCount: s.children.size,
    lastActivity: s.lastActivity
  }))
}

