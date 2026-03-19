import type { FieldWatcher } from '@mimo/shared'

/**
 * 根据选择器配置获取 DOM 元素值
 */
export function selectValue(watcher: FieldWatcher): string | null {
  const { selector } = watcher

  try {
    if (selector.type === 'xpath') {
      return selectByXPath(selector.value, selector.attribute)
    } else {
      return selectByCss(selector.value, selector.attribute)
    }
  } catch (error) {
    console.error('[Selector] Error:', error)
    return null
  }
}

/**
 * XPath 选择器
 */
function selectByXPath(xpath: string, attribute?: string): string | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )

  const node = result.singleNodeValue
  if (!node) return null

  return getNodeValue(node, attribute)
}

/**
 * CSS 选择器
 */
function selectByCss(cssSelector: string, attribute?: string): string | null {
  const element = document.querySelector(cssSelector)
  if (!element) return null

  return getNodeValue(element, attribute)
}

/**
 * 获取节点值
 */
function getNodeValue(node: Node, attribute?: string): string | null {
  if (attribute) {
    return (node as Element).getAttribute(attribute)
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() ?? null
  }

  return (node as Element).textContent?.trim() ?? null
}
