# Stagehand DOM 序列化 - 调用链分析

## 概述

本文档详细分析 Stagehand v3 中 DOM 序列化的完整调用链，从顶层 API（`V3.act/extract/observe`）到底层 CDP 调用，帮助理解数据流转和函数依赖关系。

## 顶层 API 入口

### 1. V3.act(instruction, options?)

**文件位置**：`.sources/stagehand/packages/core/lib/v3/v3.ts`

**调用链**：
```
V3.act(instruction, options?)
  ├─> resolvePage(options?.page)  // 归一化 page 对象
  ├─> ActCache.prepareContext(...) // 准备缓存上下文（如果启用）
  ├─> ActCache.tryReplay(...)      // 尝试缓存回放（如果启用）
  │   └─> ActHandler.takeDeterministicAction(...) // 缓存命中时
  └─> ActHandler.act({ instruction, page, variables, timeout, model })
      ├─> Page.waitForDomNetworkQuiet() // 等待 DOM 和网络稳定
      ├─> captureHybridSnapshot(page, { experimental: true })
      │   └─> [见下方详细调用链]
      ├─> actInference(combinedTree, xpathMap, instruction, ...)
      │   └─> LLMClient.generateObject(...) // LLM 推理
      │       └─> 返回 { elementId, description, method, arguments }
      ├─> combinedXpathMap[elementId] → xpath selector
      └─> performUnderstudyMethod(page, method, xpath, args)
          └─> Locator.click() / Locator.type() / ...
```

**关键数据流转**：
1. `captureHybridSnapshot` → `{ combinedTree, combinedXpathMap }`
2. `combinedTree` → LLM → `{ elementId, ... }`
3. `combinedXpathMap[elementId]` → `xpath` → 执行动作

### 2. V3.extract(instruction?, schema?, options?)

**文件位置**：`.sources/stagehand/packages/core/lib/v3/v3.ts`

**调用链**：
```
V3.extract(instruction?, schema?, options?)
  ├─> resolvePage(options?.page)
  └─> ExtractHandler.extract({ instruction, schema, page, timeout, model })
      ├─> captureHybridSnapshot(page, { experimental, focusSelector })
      │   └─> [见下方详细调用链]
      ├─> transformSchema(schema) // 处理 URL 类型
      ├─> extractInference(combinedTree, schema, instruction, ...)
      │   └─> LLMClient.generateObject(...) // LLM 推理
      │       └─> 返回解析后的对象
      ├─> injectUrls(parsedObject, combinedUrlMap) // 注入 URL（如果有）
      └─> 返回解析后的对象
```

**关键数据流转**：
1. `captureHybridSnapshot` → `{ combinedTree, combinedUrlMap? }`
2. `combinedTree` → LLM → 解析后的对象
3. `combinedUrlMap` → 注入 URL 值（如果 schema 包含 URL 类型）

### 3. V3.observe(instruction?, options?)

**文件位置**：`.sources/stagehand/packages/core/lib/v3/v3.ts`

**调用链**：
```
V3.observe(instruction?, options?)
  ├─> resolvePage(options?.page)
  └─> ObserveHandler.observe({ instruction, page, timeout, selector, model })
      ├─> captureHybridSnapshot(page, { experimental, focusSelector })
      │   └─> [见下方详细调用链]
      ├─> runObserve(combinedTree, instruction, ...)
      │   └─> LLMClient.generateObject(...) // LLM 推理
      │       └─> 返回 elements 数组（每个包含 elementId）
      ├─> combinedXpathMap[elementId] → xpath selector
      └─> 返回 Action[] (selector=xpath=...)
```

**关键数据流转**：
1. `captureHybridSnapshot` → `{ combinedTree, combinedXpathMap }`
2. `combinedTree` → LLM → `elements[]`（每个包含 `elementId`）
3. `combinedXpathMap[elementId]` → `xpath` → `Action[]`

## captureHybridSnapshot 详细调用链

**文件位置**：`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/capture.ts`

**主函数签名**：
```typescript
export async function captureHybridSnapshot(
  page: Page,
  options?: SnapshotOptions,
): Promise<HybridSnapshot>
```

**完整调用链**：
```
captureHybridSnapshot(page, options?)
  ├─> buildFrameContext(page)
  │   └─> Page.getFrameTree()
  │       └─> CDP: Page.getFrameTree
  │           └─> 返回 frame 树结构
  │
  ├─> tryScopedSnapshot(page, options, context, pierce) [可选]
  │   ├─> resolveFocusFrameAndTail(page, focusSelector)
  │   │   ├─> DOM.enable()
  │   │   ├─> DOM.getDocument({ depth: 0 })
  │   │   ├─> DOM.querySelector({ nodeId, selector })
  │   │   └─> DOM.describeNode({ nodeId, depth: -1 })
  │   ├─> a11yForFrame(session, frameId, opts)
  │   │   └─> [见 a11yForFrame 调用链]
  │   └─> domMapsForSession(session, frameId, pierce, encode)
  │       └─> [见 domMapsForSession 调用链]
  │
  ├─> buildSessionIndexes(page, frames, pierce)
  │   └─> 对每个 session:
  │       └─> buildSessionDomIndex(session, pierce)
  │           ├─> DOM.enable()
  │           ├─> DOM.getDocument({ depth: -1, pierce })
  │           └─> hydrateDomTree(session, root, pierce)
  │               └─> DOM.describeNode({ nodeId, depth: -1, pierce })
  │                   └─> 递归处理子节点
  │
  ├─> collectPerFrameMaps(page, context, sessionToIndex, options, pierce)
  │   └─> 对每个 frame:
  │       ├─> ownerSession(frameId) // 获取拥有该 frame 的 session
  │       ├─> domMapsForSession(session, frameId, pierce, encode)
  │       │   └─> [见 domMapsForSession 调用链]
  │       └─> a11yForFrame(session, frameId, opts)
  │           └─> [见 a11yForFrame 调用链]
  │
  ├─> computeFramePrefixes(page, context, perFrameMaps)
  │   └─> 遍历 frame 树:
  │       ├─> DOM.getFrameOwner({ frameId })
  │       └─> DOM.describeNode({ backendNodeId })
  │           └─> 生成 iframe 的 XPath
  │
  └─> mergeFramesIntoSnapshot(context, perFrameMaps, perFrameOutlines, absPrefix, iframeHostEncByChild)
      ├─> 合并 xpathMap（添加 iframe 前缀）
      ├─> 合并 urlMap
      ├─> 合并 outline（注入子树）
      └─> 返回 { combinedTree, combinedXpathMap, combinedUrlMap }
```

## domMapsForSession 详细调用链

**文件位置**：`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`

**函数签名**：
```typescript
export async function domMapsForSession(
  session: CDPSessionLike,
  frameId: string,
  pierce: boolean,
  encode: (fid: string, backendNodeId: number) => string,
  attemptOwnerLookup = true,
): Promise<{
  tagNameMap: Record<string, string>;
  xpathMap: Record<string, string>;
  scrollableMap: Record<string, boolean>;
  urlMap: Record<string, string>;
}>
```

**调用链**：
```
domMapsForSession(session, frameId, pierce, encode, attemptOwnerLookup)
  ├─> getDomTreeWithFallback(session, pierce)
  │   ├─> DOM.enable()
  │   ├─> DOM.getDocument({ depth: -1, pierce })
  │   │   └─> 如果失败，尝试 owner session
  │   └─> 返回 root node
  │
  ├─> buildSessionDomIndex(session, pierce) [如果 sessionToIndex 未提供]
  │   └─> hydrateDomTree(session, root, pierce)
  │       └─> DOM.describeNode({ nodeId, depth: -1, pierce })
  │           └─> 递归处理子节点
  │
  ├─> 遍历 DOM 节点树:
  │   ├─> encode(frameId, node.backendNodeId) → encodedId
  │   ├─> 生成 XPath（通过 xpathUtils）
  │   ├─> 提取 tagName
  │   ├─> 提取 URL（从 attributes 或 href）
  │   └─> 判断可滚动性（通过 DOM.getBoxModel）
  │
  └─> 返回 { tagNameMap, xpathMap, scrollableMap, urlMap }
```

## a11yForFrame 详细调用链

**文件位置**：`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`

**函数签名**：
```typescript
export async function a11yForFrame(
  session: CDPSessionLike,
  frameId: string | undefined,
  opts: A11yOptions,
): Promise<AccessibilityTreeResult>
```

**调用链**：
```
a11yForFrame(session, frameId, opts)
  ├─> Accessibility.enable()
  ├─> Accessibility.getFullAXTree({ depth: -1, frameId })
  │   └─> 返回 AX 节点树
  │
  ├─> 遍历 AX 节点:
  │   ├─> 提取 role, name, description, value
  │   ├─> 提取 properties (href, value 等)
  │   └─> 关联 backendDOMNodeId
  │
  ├─> 生成文本大纲（outline）:
  │   ├─> 格式化节点为文本表示
  │   ├─> 包含 role, name, description
  │   └─> 嵌套结构表示父子关系
  │
  └─> 返回 { outline, ... }
```

## XPath 生成调用链

**文件位置**：`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/xpathUtils.ts`

**关键函数**：
```
generateXPath(node, parentXPath)
  ├─> 计算节点在同级中的索引
  ├─> 构建 XPath: parentXPath + "/" + tagName + "[" + index + "]"
  ├─> normalizeXPath(xpath) // 标准化
  └─> 返回 XPath

prefixXPath(prefix, xpath)
  ├─> 如果 prefix 为空，返回原 xpath
  ├─> 如果 xpath 以 "/" 开头，替换为 prefix + xpath
  └─> 否则返回 prefix + "/" + xpath

trimTrailingTextNode(xpath)
  └─> 移除尾部的文本节点部分（如 "/text()[1]"）
```

## 数据流图

### 完整数据流

```
Page (浏览器页面)
  │
  ├─> captureHybridSnapshot()
  │   │
  │   ├─> DOM.getDocument()
  │   │   └─> DOM Node Tree
  │   │       │
  │   │       ├─> domMapsForSession()
  │   │       │   ├─> tagNameMap: encodedId → tagName
  │   │       │   ├─> xpathMap: encodedId → xpath
  │   │       │   ├─> urlMap: encodedId → url
  │   │       │   └─> scrollableMap: encodedId → boolean
  │   │       │
  │   │       └─> XPath 生成
  │   │
  │   └─> Accessibility.getFullAXTree()
  │       └─> AX Node Tree
  │           │
  │           └─> a11yForFrame()
  │               └─> outline: string (文本大纲)
  │
  ├─> mergeFramesIntoSnapshot()
  │   ├─> 合并所有 frame 的 xpathMap → combinedXpathMap
  │   ├─> 合并所有 frame 的 urlMap → combinedUrlMap
  │   └─> 合并所有 frame 的 outline → combinedTree
  │
  └─> 返回 HybridSnapshot
      ├─> combinedTree: string
      ├─> combinedXpathMap: Record<string, string>
      └─> combinedUrlMap: Record<string, string>
```

### LLM 交互数据流

```
HybridSnapshot
  │
  ├─> combinedTree → LLM
  │   └─> LLM 推理
  │       └─> 返回 { elementId, ... }
  │
  └─> combinedXpathMap[elementId] → xpath selector
      └─> 执行动作
```

## 当前项目调用链

### observe.post.ts 的简化调用链

```
POST /control/observe
  ├─> createDriverAdapter()
  │   └─> DriverAdapter 实例
  │
  ├─> driver.getDocument()
  │   └─> CDP: DOM.getDocument
  │       └─> 返回原始 DOM 数据
  │
  ├─> driver.send("Accessibility.enable")
  │   └─> CDP: Accessibility.enable
  │
  └─> driver.send("Accessibility.getFullAXTree")
      └─> CDP: Accessibility.getFullAXTree
          └─> 返回原始 AX 数据
```

**与 Stagehand 的差异**：
- ❌ 未调用 `captureHybridSnapshot`
- ❌ 未生成 `combinedTree`
- ❌ 未生成 `combinedXpathMap`
- ❌ 未处理多 frame 情况
- ✅ 获取了原始数据

## 实现路径建议

### 阶段 1：单 Frame 基础实现

```
实现 domMapsForSession()
  └─> 生成 xpathMap, tagNameMap, urlMap

实现 a11yForFrame()
  └─> 生成 outline

实现基础 captureHybridSnapshot()
  └─> 合并单 frame 数据
      └─> 返回 { combinedTree, combinedXpathMap }
```

### 阶段 2：多 Frame 支持

```
实现 buildFrameContext()
  └─> 获取 frame 树

实现 computeFramePrefixes()
  └─> 计算 iframe 前缀

实现 mergeFramesIntoSnapshot()
  └─> 合并多 frame 数据
```

### 阶段 3：优化功能

```
实现 tryScopedSnapshot()
  └─> 聚焦快照

实现 focusSelector 处理
  └─> 优化 token 使用
```

## 关键依赖关系

```
captureHybridSnapshot
  ├─> 依赖: Page (Understudy)
  │   └─> 依赖: V3Context
  │       └─> 依赖: CDP Connection
  │
  ├─> 依赖: domMapsForSession
  │   └─> 依赖: DOM CDP 方法
  │
  ├─> 依赖: a11yForFrame
  │   └─> 依赖: Accessibility CDP 方法
  │
  └─> 依赖: xpathUtils
      └─> 依赖: DOM 节点信息
```

## 性能考虑

1. **DOM.getDocument** 可能返回大量数据，考虑：
   - 使用 `depth` 参数限制深度
   - 分块处理大型 DOM 树

2. **Accessibility.getFullAXTree** 可能返回大量节点，考虑：
   - 过滤不可见节点
   - 压缩文本大纲

3. **多 Frame 处理** 需要：
   - 并行处理多个 frame（如果可能）
   - 缓存 session 索引

4. **XPath 生成** 可能耗时，考虑：
   - 缓存已生成的 XPath
   - 优化 XPath 生成算法

