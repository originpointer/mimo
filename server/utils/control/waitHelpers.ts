/**
 * Wait Helpers
 * 
 * 等待页面加载和稳定的工具函数。
 * 用于 orchestrator 在多步执行中等待适当时机。
 */

import { getRecentEvents } from "../../routes/control/events.post"

/**
 * 检查最近的事件中是否包含指定事件
 */
export function hasRecentEvent(
  tabId: number,
  method: string,
  options?: { withinMs?: number; sessionId?: string }
): boolean {
  const withinMs = options?.withinMs ?? 5000
  const cutoff = Date.now() - withinMs
  
  const events = getRecentEvents({ tabId, method })
  
  return events.some((e) => {
    if (e.receivedAt < cutoff) return false
    if (options?.sessionId && e.sessionId !== options.sessionId) return false
    return true
  })
}

/**
 * 检查页面是否已加载完成（收到 Page.loadEventFired）
 */
export function hasPageLoaded(tabId: number, withinMs = 10000): boolean {
  return hasRecentEvent(tabId, "Page.loadEventFired", { withinMs })
}

/**
 * 检查 DOM 是否就绪（收到 Page.domContentEventFired）
 */
export function hasDomContentLoaded(tabId: number, withinMs = 10000): boolean {
  return hasRecentEvent(tabId, "Page.domContentEventFired", { withinMs })
}

/**
 * 检查网络是否空闲（最近 idleMs 内没有新的网络请求）
 */
export function isNetworkIdle(tabId: number, idleMs = 500): boolean {
  const events = getRecentEvents({ tabId, method: "Network." })
  const cutoff = Date.now() - idleMs
  
  // 检查是否有进行中的请求
  const loadingEvents = events.filter((e) => 
    e.method === "Network.requestWillBeSent" && e.receivedAt > cutoff
  )
  
  const finishedEvents = events.filter((e) =>
    (e.method === "Network.loadingFinished" || e.method === "Network.loadingFailed") &&
    e.receivedAt > cutoff
  )
  
  // 简单判断：如果最近没有新请求，认为网络空闲
  return loadingEvents.length === 0 || finishedEvents.length >= loadingEvents.length
}

/**
 * 等待条件满足
 */
export async function waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 10000
  const intervalMs = options?.intervalMs ?? 100
  
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    if (await predicate()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  
  return false
}

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(
  tabId: number,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  return waitForCondition(
    () => hasPageLoaded(tabId),
    { timeoutMs: options?.timeoutMs ?? 30000, intervalMs: 200 }
  )
}

/**
 * 等待 DOM 就绪
 */
export async function waitForDomReady(
  tabId: number,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  return waitForCondition(
    () => hasDomContentLoaded(tabId),
    { timeoutMs: options?.timeoutMs ?? 30000, intervalMs: 200 }
  )
}

/**
 * 等待网络空闲
 */
export async function waitForNetworkIdle(
  tabId: number,
  options?: { idleMs?: number; timeoutMs?: number }
): Promise<boolean> {
  const idleMs = options?.idleMs ?? 500
  return waitForCondition(
    () => isNetworkIdle(tabId, idleMs),
    { timeoutMs: options?.timeoutMs ?? 30000, intervalMs: 200 }
  )
}

/**
 * 等待 DOM 和网络都稳定
 */
export async function waitForStable(
  tabId: number,
  options?: { idleMs?: number; timeoutMs?: number }
): Promise<{ domReady: boolean; networkIdle: boolean }> {
  const [domReady, networkIdle] = await Promise.all([
    waitForDomReady(tabId, options),
    waitForNetworkIdle(tabId, options)
  ])
  
  return { domReady, networkIdle }
}



