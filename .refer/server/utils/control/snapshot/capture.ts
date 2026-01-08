/**
 * Hybrid Snapshot 捕获模块
 * 
 * 实现 DOM + Accessibility 树的合并序列化。
 * 参考：Stagehand v3 understudy/a11y/snapshot/capture.ts
 */

import type { DriverAdapter } from "../driverAdapter"
import { domMapsForSession, buildSessionDomIndex, extractDomMapsFromIndex } from "./domTree"
import type { SessionDomIndex, DomMaps } from "./domTree"
import { a11yForFrame } from "./a11yTree"
import { prefixXPath, normalizeXPath } from "./xpathUtils"
import { injectSubtrees } from "./treeFormatUtils"

/**
 * Hybrid Snapshot 结果
 */
export interface HybridSnapshot {
  /** 合并后的文本大纲（供 LLM 使用） */
  combinedTree: string
  /** elementId -> XPath 映射 */
  combinedXpathMap: Record<string, string>
  /** elementId -> URL 映射 */
  combinedUrlMap: Record<string, string>
  /** 每个 frame 的详细数据（可选） */
  perFrame?: Array<{
    frameId: string
    outline: string
    xpathMap: Record<string, string>
    urlMap: Record<string, string>
  }>
}

/**
 * Snapshot 选项
 */
export interface SnapshotOptions {
  /** 是否穿透 shadow DOM */
  pierceShadow?: boolean
  /** 聚焦选择器（可选） */
  focusSelector?: string
  /** 是否启用实验性功能 */
  experimental?: boolean
}

/**
 * Frame 上下文
 */
export interface FrameContext {
  /** 根 frame ID */
  rootId: string
  /** frameId -> parentFrameId 映射 */
  parentByFrame: Map<string, string | null>
  /** 所有 frame ID 列表 */
  frames: string[]
}

/**
 * Frame DOM 映射
 */
export interface FrameDomMaps extends DomMaps {
  /** URL 映射 */
  urlMap: Record<string, string>
}

/**
 * 捕获 Hybrid Snapshot（单 Frame 版本）
 * 
 * @param driver DriverAdapter 实例
 * @param options 快照选项
 * @returns HybridSnapshot 结果
 */
export async function captureHybridSnapshot(
  driver: DriverAdapter,
  options?: SnapshotOptions & { sessionId?: string; tabId?: number }
): Promise<HybridSnapshot> {
  const pierce = options?.pierceShadow ?? true
  const sessionId = options?.sessionId
  const tabId = options?.tabId

  // 获取 frame 上下文
  const context = await buildFrameContext(driver, { tabId })

  // 为每个 session 构建 DOM 索引
  const sessionToIndex = await buildSessionIndexes(driver, context, pierce, { sessionId, tabId })

  // 收集每个 frame 的映射和大纲
  const { perFrameMaps, perFrameOutlines } = await collectPerFrameMaps(
    driver,
    context,
    sessionToIndex,
    options,
    pierce,
    { sessionId, tabId }
  )

  // 计算 iframe 前缀
  const { absPrefix, iframeHostEncByChild } = await computeFramePrefixes(
    driver,
    context,
    perFrameMaps,
    { sessionId, tabId }
  )

  // 合并所有 frame 数据
  return mergeFramesIntoSnapshot(
    context,
    perFrameMaps,
    perFrameOutlines,
    absPrefix,
    iframeHostEncByChild
  )
}

/**
 * 构建 Frame 上下文
 * 获取页面的 frame 树结构
 */
export async function buildFrameContext(
  driver: DriverAdapter,
  options?: { tabId?: number }
): Promise<FrameContext> {
  interface FrameTreeNode {
    frame: { id: string; parentId?: string }
    childFrames?: FrameTreeNode[]
  }

  const frameTree = await driver.getFrameTree(options?.tabId) as FrameTreeNode
  
  const parentByFrame = new Map<string, string | null>()
  const frames: string[] = []

  function indexFrameTree(node: FrameTreeNode, parent: string | null): void {
    parentByFrame.set(node.frame.id, parent)
    frames.push(node.frame.id)
    for (const child of node.childFrames ?? []) {
      indexFrameTree(child, node.frame.id)
    }
  }

  indexFrameTree(frameTree, null)

  const rootId = frameTree.frame.id

  return { rootId, parentByFrame, frames }
}

/**
 * 为所有唯一的 CDP session 构建 DOM 索引
 */
export async function buildSessionIndexes(
  driver: DriverAdapter,
  context: FrameContext,
  pierce: boolean,
  options?: { sessionId?: string; tabId?: number }
): Promise<Map<string, SessionDomIndex>> {
  const sessionToIndex = new Map<string, SessionDomIndex>()
  
  // 对于单 session 场景，只需要构建一次索引
  // TODO: 多 session 支持（OOPIF）
  const sid = options?.sessionId ?? "root"
  const idx = await buildSessionDomIndex(driver, pierce, options)
  sessionToIndex.set(sid, idx)

  return sessionToIndex
}

/**
 * 收集每个 frame 的 DOM 映射和可访问性大纲
 */
export async function collectPerFrameMaps(
  driver: DriverAdapter,
  context: FrameContext,
  sessionToIndex: Map<string, SessionDomIndex>,
  options: SnapshotOptions | undefined,
  pierce: boolean,
  driverOptions?: { sessionId?: string; tabId?: number }
): Promise<{
  perFrameMaps: Map<string, FrameDomMaps>
  perFrameOutlines: Array<{ frameId: string; outline: string }>
}> {
  const perFrameMaps = new Map<string, FrameDomMaps>()
  const perFrameOutlines: Array<{ frameId: string; outline: string }> = []

  // 生成 frame 序号映射
  const frameOrdinals = new Map<string, number>()
  context.frames.forEach((fid, idx) => frameOrdinals.set(fid, idx))

  for (const frameId of context.frames) {
    const sid = driverOptions?.sessionId ?? "root"
    let idx = sessionToIndex.get(sid)
    
    if (!idx) {
      idx = await buildSessionDomIndex(driver, pierce, driverOptions)
      sessionToIndex.set(sid, idx)
    }

    // 确定文档根
    const parentId = context.parentByFrame.get(frameId)
    const isRootFrame = !parentId
    let docRootBe = idx.rootBackend

    // 对于非根 frame，尝试找到其文档根
    if (!isRootFrame) {
      try {
        const owner = await driver.getFrameOwner(frameId, driverOptions)
        const ownerBe = owner.backendNodeId
        const cdBe = idx.contentDocRootByIframe.get(ownerBe)
        if (typeof cdBe === "number") {
          docRootBe = cdBe
        }
      } catch {
        // 跨进程 iframe 或竞态条件
      }
    }

    // 生成编码函数
    const ordinal = frameOrdinals.get(frameId) ?? 0
    const encode = (be: number) => `${ordinal}-${be}`

    // 从索引中提取 DOM 映射
    const domMaps = extractDomMapsFromIndex(idx, docRootBe, encode)

    // 获取可访问性树
    const { outline, urlMap } = await a11yForFrame(
      driver,
      frameId,
      {
        experimental: options?.experimental ?? false,
        tagNameMap: domMaps.tagNameMap,
        scrollableMap: domMaps.scrollableMap,
        encode
      },
      driverOptions
    )

    perFrameOutlines.push({ frameId, outline })
    perFrameMaps.set(frameId, {
      ...domMaps,
      urlMap
    })
  }

  return { perFrameMaps, perFrameOutlines }
}

/**
 * 计算每个 frame 的绝对路径前缀
 * 用于将相对 XPath 转换为跨 frame 的绝对 XPath
 */
export async function computeFramePrefixes(
  driver: DriverAdapter,
  context: FrameContext,
  perFrameMaps: Map<string, FrameDomMaps>,
  options?: { sessionId?: string; tabId?: number }
): Promise<{
  absPrefix: Map<string, string>
  iframeHostEncByChild: Map<string, string>
}> {
  const absPrefix = new Map<string, string>()
  const iframeHostEncByChild = new Map<string, string>()
  
  // 根 frame 没有前缀
  absPrefix.set(context.rootId, "")

  // 生成 frame 序号映射
  const frameOrdinals = new Map<string, number>()
  context.frames.forEach((fid, idx) => frameOrdinals.set(fid, idx))

  // BFS 遍历 frame 树
  const queue: string[] = [context.rootId]
  
  while (queue.length) {
    const parent = queue.shift()!
    const parentAbs = absPrefix.get(parent)!

    for (const child of context.frames) {
      if (context.parentByFrame.get(child) !== parent) continue
      queue.push(child)

      // 尝试获取 iframe 宿主元素
      let ownerBackendNodeId: number | undefined
      try {
        const owner = await driver.getFrameOwner(child, options)
        ownerBackendNodeId = owner.backendNodeId
      } catch {
        // OOPIF 或跨进程 iframe
      }

      if (!ownerBackendNodeId) {
        // 继承父级前缀
        absPrefix.set(child, parentAbs)
        continue
      }

      // 获取 iframe 的 XPath
      const parentDom = perFrameMaps.get(parent)
      const parentOrdinal = frameOrdinals.get(parent) ?? 0
      const iframeEnc = `${parentOrdinal}-${ownerBackendNodeId}`
      const iframeXPath = parentDom?.xpathMap[iframeEnc]

      // 计算子 frame 的绝对前缀
      const childAbs = iframeXPath
        ? prefixXPath(parentAbs || "/", iframeXPath)
        : parentAbs

      absPrefix.set(child, childAbs)
      iframeHostEncByChild.set(child, iframeEnc)
    }
  }

  return { absPrefix, iframeHostEncByChild }
}

/**
 * 合并所有 frame 数据为最终的 Snapshot
 */
export function mergeFramesIntoSnapshot(
  context: FrameContext,
  perFrameMaps: Map<string, FrameDomMaps>,
  perFrameOutlines: Array<{ frameId: string; outline: string }>,
  absPrefix: Map<string, string>,
  iframeHostEncByChild: Map<string, string>
): HybridSnapshot {
  const combinedXpathMap: Record<string, string> = {}
  const combinedUrlMap: Record<string, string> = {}

  // 合并每个 frame 的映射
  for (const frameId of context.frames) {
    const maps = perFrameMaps.get(frameId)
    if (!maps) continue

    const abs = absPrefix.get(frameId) ?? ""
    const isRoot = abs === "" || abs === "/"

    if (isRoot) {
      Object.assign(combinedXpathMap, maps.xpathMap)
      Object.assign(combinedUrlMap, maps.urlMap)
      continue
    }

    // 为非根 frame 的 XPath 添加前缀
    for (const [encId, xp] of Object.entries(maps.xpathMap)) {
      combinedXpathMap[encId] = prefixXPath(abs, xp)
    }
    Object.assign(combinedUrlMap, maps.urlMap)
  }

  // 构建子树映射（用于注入）
  const idToTree = new Map<string, string>()
  for (const { frameId, outline } of perFrameOutlines) {
    const parentEnc = iframeHostEncByChild.get(frameId)
    if (parentEnc) {
      idToTree.set(parentEnc, outline)
    }
  }

  // 获取根 frame 的大纲
  const rootOutline =
    perFrameOutlines.find((o) => o.frameId === context.rootId)?.outline ??
    perFrameOutlines[0]?.outline ??
    ""

  // 注入子 frame 大纲
  const combinedTree = injectSubtrees(rootOutline, idToTree)

  return {
    combinedTree,
    combinedXpathMap,
    combinedUrlMap,
    perFrame: perFrameOutlines.map(({ frameId, outline }) => {
      const maps = perFrameMaps.get(frameId)
      return {
        frameId,
        outline,
        xpathMap: maps?.xpathMap ?? {},
        urlMap: maps?.urlMap ?? {}
      }
    })
  }
}

/**
 * 捕获单 Frame 的 Hybrid Snapshot（简化版本）
 * 适用于只需要主 frame 数据的场景
 */
export async function captureSimpleSnapshot(
  driver: DriverAdapter,
  options?: SnapshotOptions & { sessionId?: string; tabId?: number }
): Promise<HybridSnapshot> {
  const pierce = options?.pierceShadow ?? true
  const sessionId = options?.sessionId
  const tabId = options?.tabId

  // 获取 DOM 映射
  const domMaps = await domMapsForSession(
    driver,
    "main",
    pierce,
    (_fid, be) => `0-${be}`,
    false,
    { sessionId, tabId }
  )

  // 获取可访问性大纲
  const { outline, urlMap } = await a11yForFrame(
    driver,
    undefined,
    {
      experimental: options?.experimental ?? false,
      tagNameMap: domMaps.tagNameMap,
      scrollableMap: domMaps.scrollableMap,
      encode: (be) => `0-${be}`
    },
    { sessionId, tabId }
  )

  return {
    combinedTree: outline,
    combinedXpathMap: domMaps.xpathMap,
    combinedUrlMap: urlMap,
    perFrame: [{
      frameId: "main",
      outline,
      xpathMap: domMaps.xpathMap,
      urlMap
    }]
  }
}
