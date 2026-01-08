/**
 * DOM 树处理模块
 * 
 * 处理 DOM 树的获取、水合（hydrate）和映射生成。
 * 参考：Stagehand v3 understudy/a11y/snapshot/domTree.ts
 */

import type { DriverAdapter, DomNode } from "../driverAdapter"
import { buildChildXPathSegments, joinXPath, relativizeXPath } from "./xpathUtils"

/**
 * DOM 映射结果
 */
export interface DomMaps {
  /** encodedId -> 标签名 */
  tagNameMap: Record<string, string>
  /** encodedId -> 相对 XPath */
  xpathMap: Record<string, string>
  /** encodedId -> 是否可滚动 */
  scrollableMap: Record<string, boolean>
}

/**
 * Session DOM 索引
 * 用于缓存一个 CDP session 的完整 DOM 树信息
 */
export interface SessionDomIndex {
  /** 根节点的 backendNodeId */
  rootBackend: number
  /** backendNodeId -> 绝对 XPath */
  absByBe: Map<number, string>
  /** backendNodeId -> 标签名 */
  tagByBe: Map<number, string>
  /** backendNodeId -> 是否可滚动 */
  scrollByBe: Map<number, boolean>
  /** backendNodeId -> 所属文档根的 backendNodeId */
  docRootOf: Map<number, number>
  /** iframe 的 backendNodeId -> 其 contentDocument 根的 backendNodeId */
  contentDocRootByIframe: Map<number, number>
}

// DOM.getDocument 深度回退策略
const DOM_DEPTH_ATTEMPTS = [-1, 256, 128, 64, 32, 16, 8, 4, 2, 1]
const DESCRIBE_DEPTH_ATTEMPTS = [-1, 64, 32, 16, 8, 4, 2, 1]

/**
 * 判断是否为 CBOR 栈溢出错误
 */
function isCborStackError(message: string): boolean {
  return message.includes("CBOR: stack limit exceeded")
}

/**
 * 判断节点是否需要扩展（子节点被截断）
 */
export function shouldExpandNode(node: DomNode): boolean {
  const declaredChildren = node.childNodeCount ?? 0
  const realizedChildren = node.children?.length ?? 0
  return declaredChildren > realizedChildren
}

/**
 * 合并 describeNode 返回的节点信息
 */
export function mergeDomNodes(target: DomNode, source: DomNode): void {
  target.childNodeCount = source.childNodeCount ?? target.childNodeCount
  target.children = source.children ?? target.children
  target.shadowRoots = source.shadowRoots ?? target.shadowRoots
  target.contentDocument = source.contentDocument ?? target.contentDocument
}

/**
 * 收集节点的所有可遍历目标
 */
export function collectDomTraversalTargets(node: DomNode): DomNode[] {
  const targets: DomNode[] = []
  if (node.children) targets.push(...node.children)
  if (node.shadowRoots) targets.push(...node.shadowRoots)
  if (node.contentDocument) targets.push(node.contentDocument)
  return targets
}

/**
 * 水合 DOM 树
 * 通过反复调用 DOM.describeNode 填充被截断的子节点
 */
export async function hydrateDomTree(
  driver: DriverAdapter,
  root: DomNode,
  pierce: boolean,
  options?: { sessionId?: string; tabId?: number }
): Promise<void> {
  const stack: DomNode[] = [root]
  const expandedNodeIds = new Set<number>()
  const expandedBackendIds = new Set<number>()

  while (stack.length) {
    const node = stack.pop()!
    const nodeId = typeof node.nodeId === "number" && node.nodeId > 0 ? node.nodeId : undefined
    const backendId = typeof node.backendNodeId === "number" && node.backendNodeId > 0 
      ? node.backendNodeId 
      : undefined

    // 避免重复处理
    const seenByNode = nodeId ? expandedNodeIds.has(nodeId) : false
    const seenByBackend = !nodeId && backendId ? expandedBackendIds.has(backendId) : false
    if (seenByNode || seenByBackend) continue
    if (nodeId) expandedNodeIds.add(nodeId)
    else if (backendId) expandedBackendIds.add(backendId)

    // 检查是否需要扩展
    const needsExpansion = shouldExpandNode(node)
    if (needsExpansion && (nodeId || backendId)) {
      let expanded = false
      
      for (const depth of DESCRIBE_DEPTH_ATTEMPTS) {
        try {
          const described = await driver.describeNode({
            nodeId,
            backendNodeId: backendId,
            depth,
            pierce,
            sessionId: options?.sessionId,
            tabId: options?.tabId
          })
          
          mergeDomNodes(node, described)
          
          // 更新 nodeId（如果之前没有）
          if (!nodeId && described.nodeId && described.nodeId > 0) {
            node.nodeId = described.nodeId
            expandedNodeIds.add(described.nodeId)
          }
          
          expanded = true
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (isCborStackError(message)) {
            continue // 尝试更小的深度
          }
          throw new Error(`Failed to expand DOM node ${nodeId ?? backendId ?? "unknown"}: ${message}`)
        }
      }
      
      if (!expanded) {
        throw new Error(`Unable to expand DOM node ${nodeId ?? backendId ?? "unknown"} after depth retries`)
      }
    }

    // 添加子节点到栈
    for (const child of collectDomTraversalTargets(node)) {
      stack.push(child)
    }
  }
}

/**
 * 带回退的 DOM 树获取
 * 使用渐进的深度尝试来处理 CBOR 栈溢出问题
 */
export async function getDomTreeWithFallback(
  driver: DriverAdapter,
  pierce: boolean,
  options?: { sessionId?: string; tabId?: number }
): Promise<DomNode> {
  let lastCborMessage = ""

  for (const depth of DOM_DEPTH_ATTEMPTS) {
    try {
      const root = await driver.getDocument({
        depth,
        sessionId: options?.sessionId,
        tabId: options?.tabId
      }) as DomNode

      // 如果使用了较浅的深度，需要水合剩余部分
      if (depth !== -1) {
        await hydrateDomTree(driver, root, pierce, options)
      }

      return root
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isCborStackError(message)) {
        lastCborMessage = message
        continue
      }
      throw err
    }
  }

  throw new Error(
    lastCborMessage
      ? `CDP DOM.getDocument failed after adaptive depth retries: ${lastCborMessage}`
      : "CDP DOM.getDocument failed after adaptive depth retries."
  )
}

/**
 * 为单个 frame 构建 DOM 映射
 * 
 * @param driver DriverAdapter 实例
 * @param frameId Frame ID
 * @param pierce 是否穿透 shadow DOM
 * @param encode 编码函数，将 (frameId, backendNodeId) 转换为 encodedId
 * @param attemptOwnerLookup 是否尝试查找 frame owner
 */
export async function domMapsForSession(
  driver: DriverAdapter,
  frameId: string,
  pierce: boolean,
  encode: (fid: string, backendNodeId: number) => string,
  attemptOwnerLookup = true,
  options?: { sessionId?: string; tabId?: number }
): Promise<DomMaps> {
  // 启用 DOM 域
  await driver.enableDOM(options).catch(() => {})
  
  // 获取 DOM 树
  const root = await getDomTreeWithFallback(driver, pierce, options)

  let startNode: DomNode = root
  
  // 尝试找到 frame 对应的文档根
  if (attemptOwnerLookup) {
    try {
      const owner = await driver.getFrameOwner(frameId, options)
      const ownerBackendId = owner.backendNodeId
      if (typeof ownerBackendId === "number") {
        const ownerEl = findNodeByBackendId(root, ownerBackendId)
        if (ownerEl?.contentDocument) {
          startNode = ownerEl.contentDocument
        }
      }
    } catch {
      // OOPIF 或竞态条件 → 保持 startNode = root
    }
  }

  const tagNameMap: Record<string, string> = {}
  const xpathMap: Record<string, string> = {}
  const scrollableMap: Record<string, boolean> = {}

  type StackEntry = { node: DomNode; xpath: string }
  const stack: StackEntry[] = [{ node: startNode, xpath: "" }]

  while (stack.length) {
    const { node, xpath } = stack.pop()!

    if (node.backendNodeId) {
      const encId = encode(frameId, node.backendNodeId)
      tagNameMap[encId] = String(node.nodeName).toLowerCase()
      xpathMap[encId] = xpath || "/"
      
      if (node.isScrollable === true) {
        scrollableMap[encId] = true
      }
    }

    // 处理子节点
    const kids = node.children ?? []
    if (kids.length) {
      const segs = buildChildXPathSegments(kids)
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i]!
        const step = segs[i]!
        stack.push({
          node: child,
          xpath: joinXPath(xpath, step)
        })
      }
    }

    // 处理 shadow roots
    for (const sr of node.shadowRoots ?? []) {
      stack.push({
        node: sr,
        xpath: joinXPath(xpath, "//")
      })
    }
  }

  return { tagNameMap, xpathMap, scrollableMap }
}

/**
 * 构建 Session DOM 索引
 * 一次性索引整个 CDP session 的 DOM 树
 */
export async function buildSessionDomIndex(
  driver: DriverAdapter,
  pierce: boolean,
  options?: { sessionId?: string; tabId?: number }
): Promise<SessionDomIndex> {
  // 启用 DOM 域
  await driver.enableDOM(options).catch(() => {})
  
  // 获取完整 DOM 树
  const root = await getDomTreeWithFallback(driver, pierce, options)

  const absByBe = new Map<number, string>()
  const tagByBe = new Map<number, string>()
  const scrollByBe = new Map<number, boolean>()
  const docRootOf = new Map<number, number>()
  const contentDocRootByIframe = new Map<number, number>()

  type Entry = { node: DomNode; xp: string; docRootBe: number }
  const rootBe = root.backendNodeId!
  const stack: Entry[] = [{ node: root, xp: "/", docRootBe: rootBe }]

  while (stack.length) {
    const { node, xp, docRootBe } = stack.pop()!
    
    if (node.backendNodeId) {
      absByBe.set(node.backendNodeId, xp || "/")
      tagByBe.set(node.backendNodeId, String(node.nodeName).toLowerCase())
      if (node.isScrollable === true) {
        scrollByBe.set(node.backendNodeId, true)
      }
      docRootOf.set(node.backendNodeId, docRootBe)
    }

    // 处理子节点
    const kids = node.children ?? []
    if (kids.length) {
      const segs = buildChildXPathSegments(kids)
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i]!
        const step = segs[i]!
        stack.push({ node: child, xp: joinXPath(xp, step), docRootBe })
      }
    }

    // 处理 shadow roots
    for (const sr of node.shadowRoots ?? []) {
      stack.push({ node: sr, xp: joinXPath(xp, "//"), docRootBe })
    }

    // 处理 contentDocument (iframe)
    const cd = node.contentDocument
    if (cd && typeof cd.backendNodeId === "number") {
      contentDocRootByIframe.set(node.backendNodeId!, cd.backendNodeId)
      stack.push({ node: cd, xp, docRootBe: cd.backendNodeId })
    }
  }

  return {
    rootBackend: rootBe,
    absByBe,
    tagByBe,
    scrollByBe,
    docRootOf,
    contentDocRootByIframe
  }
}

/**
 * 通过 backendNodeId 在 DOM 树中查找节点
 */
export function findNodeByBackendId(
  root: DomNode,
  backendNodeId: number
): DomNode | undefined {
  const stack: DomNode[] = [root]
  while (stack.length) {
    const n = stack.pop()!
    if (n.backendNodeId === backendNodeId) return n
    if (n.children) {
      for (const c of n.children) stack.push(c)
    }
    if (n.shadowRoots) {
      for (const s of n.shadowRoots) stack.push(s)
    }
    if (n.contentDocument) {
      stack.push(n.contentDocument)
    }
  }
  return undefined
}

/**
 * 从 Session 索引中提取指定文档根下的 DOM 映射
 */
export function extractDomMapsFromIndex(
  index: SessionDomIndex,
  docRootBe: number,
  encode: (backendNodeId: number) => string
): DomMaps {
  const tagNameMap: Record<string, string> = {}
  const xpathMap: Record<string, string> = {}
  const scrollableMap: Record<string, boolean> = {}

  const baseAbs = index.absByBe.get(docRootBe) ?? "/"

  for (const [be, nodeAbs] of index.absByBe.entries()) {
    const nodeDocRoot = index.docRootOf.get(be)
    if (nodeDocRoot !== docRootBe) continue

    // 将绝对 XPath 转换为相对于文档根的路径
    const rel = relativizeXPath(baseAbs, nodeAbs)
    const key = encode(be)
    xpathMap[key] = rel
    
    const tag = index.tagByBe.get(be)
    if (tag) tagNameMap[key] = tag
    
    if (index.scrollByBe.get(be)) scrollableMap[key] = true
  }

  return { tagNameMap, xpathMap, scrollableMap }
}
