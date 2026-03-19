import type { PlasmoCSConfig } from 'plasmo'
import { WatchEngine } from '~lib/engine'
import type { PageWatchStrategy } from '@mimo/shared'

// Plasmo content script config
export const config: PlasmoCSConfig = {
  matches: ['https://cn.investing.com/commodities/gold*'],
  run_at: 'document_idle'
}

/**
 * 查找黄金价格 - 使用多种策略确保找到正确的价格
 * 黄金期货价格在 2026 年大约在 4000-6000 范围
 */
function findGoldPrice(): { price: number | null; rawText: string | null } {
  // 策略1: 尝试常见的 data-test 属性
  const testDataSelectors = [
    '[data-test="last"]',
    '[data-test="instrument-header-last"]',
    '[data-test="price"]',
    '[data-test="instrument-price"]',
  ]

  for (const selector of testDataSelectors) {
    const el = document.querySelector(selector)
    if (el) {
      const text = el.textContent?.trim() || ''
      const price = parsePrice(text)
      if (price && isValidGoldPrice(price)) {
        console.log(`[GoldPrice] Found via ${selector}: ${price} (raw: "${text}")`)
        return { price, rawText: text }
      }
    }
  }

  // 策略2: 遍历所有 span，查找匹配价格格式的元素
  const spans = document.querySelectorAll('span')
  const priceRegex = /^[4-6],\d{3}\.\d{2}$/ // 匹配 "4,509.96" 格式

  for (const span of spans) {
    const text = span.textContent?.trim() || ''
    if (priceRegex.test(text)) {
      const price = parsePrice(text)
      if (price && isValidGoldPrice(price)) {
        console.log(`[GoldPrice] Found via scan: ${price} (raw: "${text}")`)
        return { price, rawText: text }
      }
    }
  }

  // 策略3: 查找 class 包含 "price" 的元素
  const priceElements = document.querySelectorAll('[class*="price" i], [class*="last" i]')
  for (const el of priceElements) {
    const text = el.textContent?.trim() || ''
    // 检查是否是纯价格文本（不要太长）
    if (text.length < 20) {
      const price = parsePrice(text)
      if (price && isValidGoldPrice(price)) {
        console.log(`[GoldPrice] Found via class: ${price} (raw: "${text}")`)
        return { price, rawText: text }
      }
    }
  }

  console.warn('[GoldPrice] No valid price found')
  return { price: null, rawText: null }
}

/**
 * 解析价格文本
 */
function parsePrice(text: string): number | null {
  // 移除逗号和空格
  const cleaned = text.replace(/,/g, '').replace(/\s/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * 验证是否是有效的黄金价格（4000-7000 范围）
 */
function isValidGoldPrice(price: number): boolean {
  return price >= 4000 && price <= 7000
}

/**
 * 查找涨跌幅
 */
function findChange(): number | null {
  const selectors = [
    '[data-test="chg"]',
    '[data-test="change"]',
    '[class*="change" i]',
  ]

  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) {
      const text = el.textContent?.trim() || ''
      // 提取第一个数字（可能是绝对变化或百分比）
      const match = text.match(/([+-]?\d+\.?\d*)/)
      if (match) {
        const value = parseFloat(match[1])
        if (!isNaN(value)) {
          return value
        }
      }
    }
  }
  return null
}

// 投资策略配置
const investingGoldStrategy: PageWatchStrategy = {
  id: 'investing-gold',
  version: '1.3.0',
  name: 'Investing Gold Price',
  fields: {
    price: {
      selector: {
        type: 'css',
        value: '[data-test="last"], [data-test="instrument-header-last"]',
      },
      transform: {
        type: 'number',
        replace: [[',', ''], ['\\s+', '']],
      },
      sampling: {
        mode: 'mutation',
        debounce: 500
      }
    },
    change: {
      selector: {
        type: 'css',
        value: '[data-test="chg"], [class*="change" i]',
      },
      transform: {
        type: 'number'
      },
      sampling: {
        mode: 'mutation'
      }
    }
  }
}

let engine: WatchEngine | null = null
let lastValidPrice: number = 0
let directMonitorInterval: ReturnType<typeof setInterval> | null = null

// 启动引擎
console.log('[Content] Strategy matched, starting engine...')
console.log('[Content] Initial price scan:', findGoldPrice())

// 使用标准引擎
engine = new WatchEngine(investingGoldStrategy)
engine.start()

// 直接监控 - 每3秒扫描页面并发送有效价格
// 这确保即使引擎的选择器失败，我们也能获取正确的价格
directMonitorInterval = setInterval(() => {
  const found = findGoldPrice()
  if (found.price && isValidGoldPrice(found.price)) {
    // 只在价格变化时发送
    if (found.price !== lastValidPrice) {
      lastValidPrice = found.price
      console.log(`[GoldPrice] Sending price update: ${found.price}`)

      chrome.runtime.sendMessage({
        type: 'PRICE_UPDATE',
        data: {
          price: found.price,
          change: findChange(),
          source: 'investing-gold',
          timestamp: Date.now(),
          currency: 'USD'
        }
      }).catch(err => console.error('[GoldPrice] Send error:', err))
    }
  }
}, 3000)

// Cleanup
window.addEventListener('beforeunload', () => {
  engine?.stop()
  if (directMonitorInterval) {
    clearInterval(directMonitorInterval)
  }
})
