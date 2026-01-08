/**
 * Snapshot 模块入口
 * 
 * 导出所有 DOM 序列化相关的功能。
 */

// 主要功能
export {
  captureHybridSnapshot,
  captureSimpleSnapshot,
  buildFrameContext,
  buildSessionIndexes,
  collectPerFrameMaps,
  computeFramePrefixes,
  mergeFramesIntoSnapshot
} from "./capture"

export type {
  HybridSnapshot,
  SnapshotOptions,
  FrameContext,
  FrameDomMaps
} from "./capture"

// DOM 树处理
export {
  domMapsForSession,
  buildSessionDomIndex,
  extractDomMapsFromIndex,
  getDomTreeWithFallback,
  hydrateDomTree,
  findNodeByBackendId,
  shouldExpandNode,
  mergeDomNodes,
  collectDomTraversalTargets
} from "./domTree"

export type {
  DomMaps,
  SessionDomIndex
} from "./domTree"

// 可访问性树处理
export {
  a11yForFrame,
  decorateRoles,
  buildHierarchicalTree,
  isStructural,
  extractUrlFromAXNode,
  removeRedundantStaticTextChildren
} from "./a11yTree"

export type {
  A11yOptions,
  AccessibilityTreeResult,
  A11yNodeInternal
} from "./a11yTree"

// XPath 工具
export {
  normalizeXPath,
  prefixXPath,
  joinXPath,
  buildChildXPathSegments,
  relativizeXPath,
  trimTrailingTextNode,
  looksLikeXPath,
  extractXPath
} from "./xpathUtils"

// 树格式化工具
export {
  cleanText,
  normaliseSpaces,
  formatTreeLine,
  indentBlock,
  injectSubtrees,
  diffCombinedTrees
} from "./treeFormatUtils"
