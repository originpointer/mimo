import type { PageWatchStrategy, FieldWatcher } from '@mimo/shared'
import { selectValue } from './selector'
import { transformValue } from './transformer'

export class WatchEngine {
  private strategy: PageWatchStrategy
  private observer: MutationObserver | null = null
  private lastData: Record<string, unknown> = {}
  private pollingTimers: ReturnType<typeof setInterval>[] = []

  constructor(strategy: PageWatchStrategy) {
    this.strategy = strategy
  }

  start(): void {
    console.log('[WatchEngine] Starting with strategy:', this.strategy.name)

    const collectData = (): void => {
    const data: Record<string, unknown> = {}

    for (const [fieldName, watcher] of Object.entries(this.strategy.fields)) {
      const rawValue = selectValue(watcher)
      if (rawValue !== null) {
        data[fieldName] = transformValue(rawValue, watcher)
      }
    }

    // 检查数据是否变化
    if (JSON.stringify(data) !== JSON.stringify(this.lastData)) {
      this.lastData = data
      this.sendToBackground(data)
    }
  }

  // 初始采集
  collectData()

  // 根据采样模式启动监听
  for (const watcher of Object.values(this.strategy.fields)) {
    const mode = watcher.sampling?.mode ?? 'mutation'

    if (mode === 'polling') {
      const timer = setInterval(collectData, watcher.sampling?.interval ?? 5000)
      this.pollingTimers.push(timer)
    }
  }

  // MutationObserver 监听所有字段
  const hasMutation = Object.values(this.strategy.fields).some(
    w => (w.sampling?.mode ?? 'mutation') === 'mutation'
  )

  if (hasMutation) {
    this.observer = new MutationObserver(() => {
      // 防抖处理
      setTimeout(collectData, 100)
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
  }

  stop(): void {
    console.log('[WatchEngine] Stopping')

    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    for (const timer of this.pollingTimers) {
      clearInterval(timer)
    }
    this.pollingTimers = []
  }

  private sendToBackground(data: Record<string, unknown>): void {
    // 发送心跳（顺便保活）
    chrome.runtime.sendMessage({
      type: 'PRICE_UPDATE',
      data
    }).catch((error) => {
      console.error('[WatchEngine] Failed to send message:', error)
    })
  }
}
