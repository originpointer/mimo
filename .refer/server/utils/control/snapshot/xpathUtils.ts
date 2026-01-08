/**
 * XPath 工具函数
 * 
 * 用于 DOM 序列化过程中的 XPath 构建、标准化和前缀处理。
 * 参考：Stagehand v3 understudy/a11y/snapshot/xpathUtils.ts
 */

import type { DomNode } from "../driverAdapter"

/**
 * 标准化 XPath
 * - 去除 'xpath=' 前缀
 * - 确保以 '/' 开头
 * - 去除尾部的 '/'
 */
export function normalizeXPath(x?: string): string {
  if (!x) return ""
  let s = x.trim().replace(/^xpath=/i, "")
  if (!s.startsWith("/")) s = "/" + s
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1)
  return s
}

/**
 * 为 XPath 添加前缀
 * 用于将相对 XPath 转换为绝对 XPath（通过 iframe 路径前缀）
 * 
 * @param parentAbs 父级 iframe 的绝对 XPath
 * @param child 子元素的相对 XPath
 * @returns 合并后的绝对 XPath
 */
export function prefixXPath(parentAbs: string, child: string): string {
  const p = parentAbs === "/" ? "" : parentAbs.replace(/\/$/, "")
  if (!child || child === "/") return p || "/"
  // 处理 shadow DOM 的 "//" 标记
  if (child.startsWith("//")) {
    return p ? `${p}//${child.slice(2)}` : `//${child.slice(2)}`
  }
  const c = child.replace(/^\//, "")
  return p ? `${p}/${c}` : `/${c}`
}

/**
 * 连接 XPath 片段
 * 处理 shadow-root 的特殊 "//" 跳转
 */
export function joinXPath(base: string, step: string): string {
  // 处理 shadow root 标记
  if (step === "//") {
    if (!base || base === "/") return "//"
    return base.endsWith("/") ? `${base}/` : `${base}//`
  }
  if (!base || base === "/") return step ? `/${step}` : "/"
  if (base.endsWith("//")) return `${base}${step}`
  if (!step) return base
  return `${base}/${step}`
}

/**
 * 构建子节点的 XPath 段
 * 为 DOM 遍历生成每个同级节点的 XPath 步骤
 * 
 * @param kids 子节点数组
 * @returns XPath 段数组，与 kids 一一对应
 */
export function buildChildXPathSegments(kids: DomNode[]): string[] {
  const segs: string[] = []
  const ctr: Record<string, number> = {}
  
  for (const child of kids) {
    const tag = String(child.nodeName).toLowerCase()
    const key = `${child.nodeType}:${tag}`
    const idx = (ctr[key] = (ctr[key] ?? 0) + 1)
    
    // nodeType 3 = TEXT_NODE
    if (child.nodeType === 3) {
      segs.push(`text()[${idx}]`)
    }
    // nodeType 8 = COMMENT_NODE
    else if (child.nodeType === 8) {
      segs.push(`comment()[${idx}]`)
    }
    // 处理带命名空间的标签名
    else if (tag.includes(":")) {
      segs.push(`*[name()='${tag}'][${idx}]`)
    }
    else {
      segs.push(`${tag}[${idx}]`)
    }
  }
  
  return segs
}

/**
 * 将绝对 XPath 相对化为基于文档根的相对 XPath
 * 
 * @param baseAbs 文档根的绝对 XPath
 * @param nodeAbs 节点的绝对 XPath
 * @returns 相对于文档根的 XPath
 */
export function relativizeXPath(baseAbs: string, nodeAbs: string): string {
  const base = normalizeXPath(baseAbs)
  const abs = normalizeXPath(nodeAbs)
  
  if (abs === base) return "/"
  
  if (abs.startsWith(base)) {
    const tail = abs.slice(base.length)
    if (!tail) return "/"
    return tail.startsWith("/") || tail.startsWith("//") ? tail : `/${tail}`
  }
  
  // 如果 base 是根，返回绝对路径
  if (base === "/") return abs
  
  // 其他情况返回绝对路径
  return abs
}

/**
 * 修剪尾部的文本节点
 * 用于 XPath 表达式的清理
 */
export function trimTrailingTextNode(xpath: string): string {
  return xpath.replace(/\/text\(\)\[\d+\]$/, "")
}

/**
 * 判断 XPath 是否看起来像 XPath 表达式
 */
export function looksLikeXPath(selector: string): boolean {
  const s = selector.trim()
  return /^xpath=/i.test(s) || s.startsWith("/")
}

/**
 * 从选择器中提取实际的 XPath 表达式
 */
export function extractXPath(selector: string): string {
  return selector.trim().replace(/^xpath=/i, "")
}
