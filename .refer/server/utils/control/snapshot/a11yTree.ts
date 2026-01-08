/**
 * 可访问性树处理模块
 * 
 * 处理可访问性（Accessibility）树的获取和文本大纲生成。
 * 参考：Stagehand v3 understudy/a11y/snapshot/a11yTree.ts
 */

import type { DriverAdapter, AXNode } from "../driverAdapter"
import { formatTreeLine, normaliseSpaces } from "./treeFormatUtils"

/**
 * 可访问性树选项
 */
export interface A11yOptions {
  /** 聚焦选择器（可选） */
  focusSelector?: string
  /** 标签名映射 */
  tagNameMap: Record<string, string>
  /** 可滚动映射 */
  scrollableMap: Record<string, boolean>
  /** 是否启用实验性功能 */
  experimental?: boolean
  /** 编码函数 */
  encode: (backendNodeId: number) => string
}

/**
 * 可访问性树结果
 */
export interface AccessibilityTreeResult {
  /** 文本大纲 */
  outline: string
  /** URL 映射 */
  urlMap: Record<string, string>
  /** 是否应用了范围限制 */
  scopeApplied: boolean
}

/**
 * 内部使用的 A11y 节点结构
 */
export interface A11yNodeInternal {
  role: string
  name?: string
  description?: string
  value?: string
  nodeId: string
  backendDOMNodeId?: number
  parentId?: string
  childIds?: string[]
  encodedId?: string
  children?: A11yNodeInternal[]
}

/**
 * 获取 frame 的可访问性树并生成文本大纲
 */
export async function a11yForFrame(
  driver: DriverAdapter,
  frameId: string | undefined,
  opts: A11yOptions,
  options?: { sessionId?: string; tabId?: number }
): Promise<AccessibilityTreeResult> {
  // 启用必要的 CDP 域
  await driver.enableAccessibility(options).catch(() => {})
  await driver.enableRuntime(options).catch(() => {})
  await driver.enableDOM(options).catch(() => {})

  // 获取可访问性树
  let nodes: AXNode[] = []
  try {
    nodes = await driver.getFullAXTree({
      frameId,
      sessionId: options?.sessionId,
      tabId: options?.tabId
    })
  } catch (e) {
    const msg = String((e as Error)?.message ?? e ?? "")
    const isFrameScopeError =
      msg.includes("Frame with the given") ||
      msg.includes("does not belong to the target") ||
      msg.includes("is not found")
    
    // 如果是 frame 范围错误，尝试不带 frameId 重新获取
    if (!isFrameScopeError || !frameId) throw e
    
    nodes = await driver.getFullAXTree({
      sessionId: options?.sessionId,
      tabId: options?.tabId
    })
  }

  // 构建 URL 映射
  const urlMap: Record<string, string> = {}
  for (const n of nodes) {
    const be = n.backendDOMNodeId
    if (typeof be !== "number") continue
    const url = extractUrlFromAXNode(n)
    if (!url) continue
    const enc = opts.encode(be)
    urlMap[enc] = url
  }

  // 检查是否应用了范围限制
  let scopeApplied = false
  const nodesForOutline = nodes // TODO: 实现 focusSelector 过滤

  // 装饰角色信息
  const decorated = decorateRoles(nodesForOutline, opts)
  
  // 构建层级树
  const { tree } = buildHierarchicalTree(decorated, opts)

  // 生成文本大纲
  const simplified = tree.map((n) => formatTreeLine(n)).join("\n")
  
  return { outline: simplified.trimEnd(), urlMap, scopeApplied }
}

/**
 * 装饰节点的角色信息
 * 添加 encodedId，处理可滚动标记等
 */
export function decorateRoles(
  nodes: AXNode[],
  opts: A11yOptions
): A11yNodeInternal[] {
  const asRole = (n: AXNode) => String(n.role?.value ?? "")

  return nodes.map((n) => {
    let encodedId: string | undefined
    if (typeof n.backendDOMNodeId === "number") {
      try {
        encodedId = opts.encode(n.backendDOMNodeId)
      } catch {
        // ignore
      }
    }

    let role = asRole(n)

    // 处理可滚动元素
    const domIsScrollable = encodedId ? opts.scrollableMap[encodedId] === true : false
    const tag = encodedId ? opts.tagNameMap[encodedId] : undefined
    const isHtmlElement = tag === "html"
    
    if ((domIsScrollable || isHtmlElement) && tag !== "#document") {
      const tagLabel = tag && tag.startsWith("#") ? tag.slice(1) : tag
      role = tagLabel
        ? `scrollable, ${tagLabel}`
        : `scrollable${role ? `, ${role}` : ""}`
    }

    return {
      role,
      name: n.name?.value,
      description: n.description?.value,
      value: n.value?.value,
      nodeId: n.nodeId,
      backendDOMNodeId: n.backendDOMNodeId,
      parentId: n.parentId,
      childIds: n.childIds,
      encodedId
    }
  })
}

/**
 * 构建层级树结构
 * 过滤掉纯结构性节点，保留有意义的内容
 */
export function buildHierarchicalTree(
  nodes: A11yNodeInternal[],
  opts: A11yOptions
): { tree: A11yNodeInternal[] } {
  const nodeMap = new Map<string, A11yNodeInternal>()

  // 第一遍：过滤并收集有意义的节点
  for (const n of nodes) {
    const keep =
      !!(n.name && n.name.trim()) ||
      !!(n.childIds && n.childIds.length) ||
      !isStructural(n.role)
    if (!keep) continue
    nodeMap.set(n.nodeId, { ...n })
  }

  // 第二遍：建立父子关系
  for (const n of nodes) {
    if (!n.parentId) continue
    const parent = nodeMap.get(n.parentId)
    const cur = nodeMap.get(n.nodeId)
    if (parent && cur) {
      (parent.children ??= []).push(cur)
    }
  }

  // 找出根节点
  const roots = nodes
    .filter((n) => !n.parentId && nodeMap.has(n.nodeId))
    .map((n) => nodeMap.get(n.nodeId)!) as A11yNodeInternal[]

  // 清理结构性节点
  const cleaned = roots
    .map((r) => pruneStructuralSafe(r, opts))
    .filter(Boolean) as A11yNodeInternal[]

  return { tree: cleaned }
}

/**
 * 递归清理纯结构性节点
 */
function pruneStructuralSafe(
  node: A11yNodeInternal,
  opts: A11yOptions
): A11yNodeInternal | null {
  if (+node.nodeId < 0) return null

  const children = node.children ?? []
  if (!children.length) {
    return isStructural(node.role) ? null : node
  }

  const cleanedKids = children
    .map((c) => pruneStructuralSafe(c, opts))
    .filter(Boolean) as A11yNodeInternal[]

  const prunedStatic = removeRedundantStaticTextChildren(node, cleanedKids)

  // 如果是结构性节点，尝试提升子节点
  if (isStructural(node.role)) {
    if (prunedStatic.length === 1) return prunedStatic[0]!
    if (prunedStatic.length === 0) return null
  }

  // 将 generic/none 角色替换为实际标签名
  let newRole = node.role
  if ((newRole === "generic" || newRole === "none") && node.encodedId) {
    const tagName = opts.tagNameMap[node.encodedId]
    if (tagName) newRole = tagName
  }

  // 将 combobox 的 select 标签特殊处理
  if (newRole === "combobox" && node.encodedId) {
    const tagName = opts.tagNameMap[node.encodedId]
    if (tagName === "select") newRole = "select"
  }

  return { ...node, role: newRole, children: prunedStatic }
}

/**
 * 判断角色是否为纯结构性（可省略）
 */
export function isStructural(role: string): boolean {
  const r = role?.toLowerCase()
  return r === "generic" || r === "none" || r === "inlinetextbox"
}

/**
 * 从 AX 节点提取 URL
 */
export function extractUrlFromAXNode(ax: AXNode): string | undefined {
  const props = ax.properties ?? []
  const urlProp = props.find((p) => p.name === "url")
  const value = urlProp?.value?.value
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

/**
 * 移除冗余的 StaticText 子节点
 * 当父节点的 name 与所有 StaticText 子节点组合相同时，移除这些子节点
 */
export function removeRedundantStaticTextChildren(
  parent: A11yNodeInternal,
  children: A11yNodeInternal[]
): A11yNodeInternal[] {
  if (!parent.name) return children
  
  const parentNorm = normaliseSpaces(parent.name).trim()
  let combined = ""
  
  for (const c of children) {
    if (c.role === "StaticText" && c.name) {
      combined += normaliseSpaces(c.name).trim()
    }
  }
  
  if (combined === parentNorm) {
    return children.filter((c) => c.role !== "StaticText")
  }
  
  return children
}
