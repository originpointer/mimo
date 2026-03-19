import type { FieldWatcher } from '@mimo/shared'

/**
 * 数据转换
 */
export function transformValue(rawValue: string, watcher: FieldWatcher): unknown {
  const { transform } = watcher
  if (!transform) return rawValue

  let value: string | number = rawValue

  // 应用替换规则
  if (transform.replace) {
    for (const [pattern, replacement] of transform.replace) {
      value = value.replace(new RegExp(pattern, 'g'), replacement)
    }
  }

  // 应用正则提取
  if (transform.pattern) {
    const match = value.match(new RegExp(transform.pattern))
    if (match?.[1]) {
      value = match[1]
    }
  }

  // 类型转换
  if (transform.type === 'number') {
    return parseFloat(value) || 0
  }

  return value.trim()
}
