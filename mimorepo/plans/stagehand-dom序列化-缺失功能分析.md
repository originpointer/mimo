# Stagehand DOM 序列化 - 缺失功能分析

## 概述

本文档分析当前项目（`.refer`）中缺失的 DOM 序列化功能，基于 Stagehand v3 的实现机制，确定需要补充的关键组件和实现细节。

## 当前实现状态

### 已实现的功能

1. **基础 CDP 调用能力**
   - 文件：`.refer/server/utils/control/driverAdapter.ts`
   - 功能：封装了 `DOM.getDocument`、`Accessibility.getFullAXTree` 等 CDP 方法
   - 状态：✅ 已完成

2. **原始数据获取**
   - 文件：`.refer/server/routes/control/observe.post.ts`
   - 功能：可以获取原始 DOM 树和可访问性树数据
   - 状态：✅ 已完成

### 缺失的核心功能

基于 Stagehand v3 的实现（`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/capture.ts`），以下功能尚未实现：

## 缺失功能详细分析

### 1. captureHybridSnapshot 核心函数

**功能描述**：协调 DOM 和可访问性树的获取，合并为统一的快照格式。

**实现位置**（Stagehand）：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/capture.ts`

**核心流程**（基于源代码分析）：
```
1. 构建 Frame Context（frame 树结构）
2. 尝试 Scoped Snapshot（如果有 focusSelector，只获取特定子树）
3. 构建 Session Indexes（为每个 CDP session 构建 DOM 索引）
4. 收集每个 Frame 的 Maps（DOM + AX 树，生成相对 XPath）
5. 计算 Frame Prefixes（iframe 的绝对路径前缀）
6. 合并所有 Frame 到 Snapshot（生成 combinedTree + combinedXpathMap）
```

**需要实现的关键函数**：
- `buildFrameContext(page)`: 构建 frame 树上下文
- `tryScopedSnapshot(...)`: 尝试获取聚焦的快照
- `buildSessionIndexes(...)`: 为每个 session 构建 DOM 索引
- `collectPerFrameMaps(...)`: 收集每个 frame 的 DOM 和 AX 数据
- `computeFramePrefixes(...)`: 计算 iframe 的绝对路径前缀
- `mergeFramesIntoSnapshot(...)`: 合并所有 frame 数据

**依赖文件**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/xpathUtils.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/focusSelectors.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/treeFormatUtils.ts`

### 2. DOM 树处理模块 (domTree.ts)

**功能描述**：处理 DOM 树的获取、水合（hydrate）和映射生成。

**关键函数**（基于源代码）：
- `hydrateDomTree(session, root, pierce)`: 水合 DOM 树（填充子节点）
- `getDomTreeWithFallback(session, pierce)`: 获取 DOM 树（带回退）
- `domMapsForSession(session, frameId, pierce, encode)`: 为 session 生成 DOM 映射
- `buildSessionDomIndex(session, pierce)`: 构建 session 的 DOM 索引
- `relativizeXPath(xpath, rootXpath)`: 将绝对 XPath 转换为相对 XPath

**输出数据结构**：
```typescript
{
  tagNameMap: Record<string, string>;  // encodedId -> tagName
  xpathMap: Record<string, string>;    // encodedId -> relative XPath
  scrollableMap: Record<string, boolean>; // encodedId -> isScrollable
  urlMap: Record<string, string>;     // encodedId -> URL
}
```

**依赖的 CDP 方法**：
- `DOM.enable`
- `DOM.getDocument`
- `DOM.describeNode`
- `DOM.getBoxModel`（用于判断可滚动）

### 3. 可访问性树处理模块 (a11yTree.ts)

**功能描述**：处理可访问性树的获取和文本大纲生成。

**关键函数**（基于源代码）：
- `a11yForFrame(session, frameId, opts)`: 获取 frame 的可访问性树
- 生成文本大纲（text outline）用于 LLM 理解

**输出数据结构**：
```typescript
{
  outline: string;  // 文本大纲（供 LLM 使用）
  // 其他可访问性相关数据
}
```

**依赖的 CDP 方法**：
- `Accessibility.enable`
- `Accessibility.getFullAXTree`
- `DOM.describeNode`（用于关联 AX 节点和 DOM 节点）

### 4. XPath 工具模块 (xpathUtils.ts)

**功能描述**：处理 XPath 的生成、标准化和前缀处理。

**关键函数**（基于源代码）：
- `normalizeXPath(xpath)`: 标准化 XPath（去除冗余）
- `prefixXPath(prefix, xpath)`: 为 XPath 添加前缀（用于 iframe）
- `trimTrailingTextNode(xpath)`: 修剪尾部的文本节点

**使用场景**：
- 从 nodeId 生成 XPath 选择器
- 处理 iframe 嵌套时的绝对路径
- 优化 XPath 以减少 token 消耗

### 5. 焦点选择器处理模块 (focusSelectors.ts)

**功能描述**：处理 focusSelector 参数，优化快照以聚焦特定元素。

**关键函数**（基于源代码）：
- `resolveFocusFrameAndTail(page, selector)`: 解析焦点选择器对应的 frame
- `resolveCssFocusFrameAndTail(page, selector)`: 解析 CSS 选择器对应的 frame

**使用场景**：
- extract() 时聚焦特定元素
- 减少不必要的 DOM 数据，节省 token

### 6. 树格式工具模块 (treeFormatUtils.ts)

**功能描述**：处理树结构的合并和子树的注入。

**关键函数**（基于源代码）：
- `injectSubtrees(rootOutline, idToTree)`: 将子 frame 的树注入到父 frame 的树中

**使用场景**：
- 合并多个 frame 的文本大纲
- 处理 iframe 嵌套结构

### 7. ElementId 编码机制

**功能描述**：生成唯一的元素标识符，用于映射到 XPath。

**编码格式**（基于源代码分析）：
```
encodedId = `${frameOrdinal}-${backendNodeId}`
```

**使用场景**：
- LLM 返回 elementId，通过 `combinedXpathMap[elementId]` 映射到 XPath
- 支持多 frame 环境下的元素唯一标识

**实现位置**：
- 在 `domMapsForSession` 中生成
- 在 `mergeFramesIntoSnapshot` 中合并

### 8. Frame 前缀计算

**功能描述**：计算 iframe 的绝对路径前缀，用于合并多 frame 的 XPath。

**计算逻辑**（基于源代码）：
1. 遍历 frame 树，找到每个 child frame 的 parent iframe
2. 获取 iframe 元素的 XPath
3. 为 child frame 的所有 XPath 添加 iframe 前缀

**示例**：
```
Root frame: /html/body/div[1]
Child frame (iframe): /html/body/div[1]/iframe[1]
Child frame 内的元素: /div[1]
合并后: /html/body/div[1]/iframe[1]/div[1]
```

## 实现优先级

### 高优先级（核心功能）

1. **captureHybridSnapshot 主函数**
   - 必须实现，是序列化的入口
   - 依赖：domTree、a11yTree、xpathUtils

2. **DOM 树处理模块**
   - 必须实现，提供 DOM 数据
   - 依赖：CDP DOM 方法

3. **可访问性树处理模块**
   - 必须实现，提供语义化信息
   - 依赖：CDP Accessibility 方法

4. **XPath 工具模块**
   - 必须实现，生成选择器映射
   - 依赖：DOM 节点信息

### 中优先级（优化功能）

5. **Frame 前缀计算**
   - 需要实现，支持多 frame 环境
   - 依赖：frame 树结构

6. **ElementId 编码机制**
   - 需要实现，建立映射关系
   - 依赖：backendNodeId

### 低优先级（增强功能）

7. **焦点选择器处理**
   - 可选实现，优化 token 使用
   - 依赖：selector 解析

8. **树格式工具**
   - 可选实现，优化树结构
   - 依赖：文本大纲生成

## 实现建议

### 阶段 1：基础实现

1. 实现 `domMapsForSession`：获取单个 frame 的 DOM 映射
2. 实现 `a11yForFrame`：获取单个 frame 的可访问性树
3. 实现基础的 `captureHybridSnapshot`（单 frame 版本）

**目标**：能够获取单个 frame 的 `combinedTree` 和 `combinedXpathMap`

### 阶段 2：多 Frame 支持

1. 实现 `buildFrameContext`：构建 frame 树
2. 实现 `computeFramePrefixes`：计算 iframe 前缀
3. 实现 `mergeFramesIntoSnapshot`：合并多 frame 数据

**目标**：支持多 frame 环境的完整快照

### 阶段 3：优化功能

1. 实现 `tryScopedSnapshot`：聚焦快照
2. 实现 `resolveFocusFrameAndTail`：焦点选择器处理
3. 优化树结构压缩

**目标**：减少 token 消耗，提升性能

## 参考实现位置

### Stagehand v3 源代码

所有实现参考位于：
```
.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/
├── capture.ts              # 主入口（460 行）
├── domTree.ts              # DOM 树处理
├── a11yTree.ts             # 可访问性树处理
├── xpathUtils.ts           # XPath 工具
├── focusSelectors.ts       # 焦点选择器
├── treeFormatUtils.ts      # 树格式工具
├── coordinateResolver.ts  # 坐标解析（可选）
└── sessions.ts             # Session 管理（可选）
```

### 当前项目实现位置建议

建议在以下位置实现：
```
.refer/server/utils/control/
├── snapshot/
│   ├── capture.ts          # captureHybridSnapshot 主函数
│   ├── domTree.ts          # DOM 树处理
│   ├── a11yTree.ts         # 可访问性树处理
│   ├── xpathUtils.ts       # XPath 工具
│   ├── focusSelectors.ts   # 焦点选择器（可选）
│   └── treeFormatUtils.ts  # 树格式工具（可选）
```

## 数据流图

```
captureHybridSnapshot(page, options)
  ├─> buildFrameContext(page)
  ├─> tryScopedSnapshot(...) [可选]
  ├─> buildSessionIndexes(...)
  │   └─> domMapsForSession(...)
  │       ├─> DOM.getDocument
  │       ├─> DOM.describeNode
  │       └─> 生成 xpathMap, tagNameMap, urlMap
  ├─> collectPerFrameMaps(...)
  │   ├─> a11yForFrame(...)
  │   │   ├─> Accessibility.getFullAXTree
  │   │   └─> 生成 outline
  │   └─> 关联 DOM 和 AX 数据
  ├─> computeFramePrefixes(...)
  │   └─> 计算 iframe 绝对路径
  └─> mergeFramesIntoSnapshot(...)
      ├─> 合并 xpathMap（添加前缀）
      ├─> 合并 urlMap
      └─> 合并 outline（注入子树）
      └─> 返回 { combinedTree, combinedXpathMap, combinedUrlMap }
```

## 测试建议

### 单元测试

1. **DOM 映射测试**
   - 测试 `domMapsForSession` 生成的 xpathMap 正确性
   - 测试 encodedId 的唯一性

2. **XPath 工具测试**
   - 测试 `normalizeXPath` 的标准化
   - 测试 `prefixXPath` 的前缀添加

3. **合并测试**
   - 测试单 frame 快照
   - 测试多 frame 快照合并

### 集成测试

1. **完整流程测试**
   - 测试 `captureHybridSnapshot` 的完整流程
   - 验证 `combinedTree` 和 `combinedXpathMap` 的正确性

2. **多 Frame 测试**
   - 测试包含 iframe 的页面
   - 验证 frame 前缀计算的正确性

## 注意事项

1. **Session 管理**：需要正确处理多 session 环境（iframe/OOPIF）
2. **异步处理**：所有 CDP 调用都是异步的，需要正确处理 Promise
3. **错误处理**：需要处理 CDP 调用失败的情况
4. **性能优化**：DOM 树可能很大，需要考虑分块处理或压缩
5. **Token 优化**：`combinedTree` 会发送给 LLM，需要优化以减少 token 消耗

