/**
 * Service Worker 保活模块
 *
 * 原理：
 * 1. Chrome 规定任何 Chrome Extension API 调用都会重置闲置计时器
 * 2. 10 秒轮询确保在 30 秒超时前至少有 2-3 次重置机会
 * 3. 容错率：30/10 = 3 倍，即使某次延迟也能保持存活
 */

const KEEPALIVE_INTERVAL = 10000 // 10 秒
let keepaliveTimer: ReturnType<typeof setInterval> | null = null

/**
 * 启动保活机制
 */
export function startKeepalive(): void {
  if (keepaliveTimer) return

  console.log('[Keepalive] Starting...')

  keepaliveTimer = setInterval(async () => {
    try {
    // 调用 Chrome API 重置闲置计时器
    await chrome.tabs.query({ active: true, currentWindow: true })
    console.log('[Keepalive] Heartbeat sent')
  } catch (error) {
    console.error('[Keepalive] Error:', error)
  }
  }, KEEPALIVE_INTERVAL)
}

/**
 * 停止保活机制
 */
export function stopKeepalive(): void {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer)
    keepaliveTimer = null
    console.log('[Keepalive] Stopped')
  }
}

/**
 * 双向保活：监听来自 Content Script 的消息
 * 收到消息同样会重置 Service Worker 计时器
 */
export function setupKeepaliveListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    // 任何消息都会重置计时器
    if (message.type === 'CONTENT_HEARTBEAT') {
      console.log('[Keepalive] Received content heartbeat')
    }
    return false
  })
}

/**
 * 处理价格更新消息
 */
export function setupPriceUpdateListener(uploadPrice: (data: Record<string, unknown>) => void): void {
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'PRICE_UPDATE') {
      console.log('[Background] Received price update:', message.data)
      uploadPrice(message.data)
    }
    return false
  })
}
