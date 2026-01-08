# Stagehand DOM 元素序列化实现梳理

## 概述

本文档通过苏格拉底式提问的方式，梳理 Stagehand v3 中 DOM 元素序列化的实现机制，确定关键函数、CDP 方法、数据结构以及相关源代码位置。

## 问题 1: 什么是 DOM 序列化？为什么要序列化？

**答案**：DOM 序列化是将浏览器中的 DOM 树结构转换为可序列化的数据格式（通常是文本或 JSON）的过程。

**目的**：
1. **供 LLM 理解**：将 DOM 转换为 LLM 可以理解的文本表示，用于推理和决策
2. **建立映射关系**：建立元素标识符（elementId）到选择器（xpath）的映射，便于后续定位和操作元素
3. **提取结构化信息**：从 DOM 中提取可交互元素、文本内容等结构化数据

**证据来源**：
- `.refer/docs/stagehand/v3-flows-act-extract-observe.md` 中描述了 act/extract/observe 都使用 snapshot
- `ActHandler.act()` 通过 `combinedXpathMap[elementId]` 将 LLM 返回的 elementId 映射为 xpath selector

## 问题 2: captureHybridSnapshot 是什么？它的输入和输出是什么？

**答案**：`captureHybridSnapshot` 是 Stagehand v3 中用于捕获页面快照的核心函数。

**输入**：
- `page`: Page 对象（Understudy 的 Page 实例）
- `options`: 包含 `experimental`, `focusSelector` 等选项

**输出**：
- `combinedTree`: 合并后的树结构（DOM + 可访问性树的组合）
- `combinedXpathMap`: elementId 到 xpath 的映射对象（用于 act/observe）
- 或 `combinedUrlMap`: elementId 到 URL 的映射对象（用于 extract 处理 URL schema）

**证据来源**：
- `.refer/docs/stagehand/v3-flows-act-extract-observe.md:64` - act() 使用 `captureHybridSnapshot(page, { experimental: true })` → `combinedTree` + `combinedXpathMap`
- `.refer/docs/stagehand/v3-flows-act-extract-observe.md:105` - extract() 使用 `captureHybridSnapshot(page, { experimental, focusSelector })` → `combinedTree` + `combinedUrlMap?`

## 问题 3: "Hybrid" 的含义是什么？它如何结合 DOM 和可访问性树？

**答案**："Hybrid" 指的是同时使用 DOM 树和可访问性（Accessibility/AX）树的组合表示。

**为什么需要 Hybrid**：
- **DOM 树**：提供完整的 HTML 结构和属性信息
- **可访问性树**：提供语义化信息（role, name, properties），更适合 LLM 理解元素的功能和意图

**证据来源**：
- `.refer/verification/inventory/cdp_methods_inventory.md:23-26` 列出了 `Accessibility.enable` 和 `Accessibility.getFullAXTree` 的使用
- `.refer/verification/inventory/cdp_methods_inventory.md:36-39` 列出了 `DOM.getDocument` 和 `DOM.describeNode` 的使用
- 这些方法都在 `understudy/a11y/snapshot/` 目录下的文件中使用

## 问题 4: 使用了哪些 CDP 方法来获取 DOM 和可访问性信息？

**答案**：主要使用以下 CDP 方法：

### Accessibility 域
- `Accessibility.enable`: 启用可访问性域
- `Accessibility.getFullAXTree`: 获取完整的可访问性树

### DOM 域
- `DOM.enable`: 启用 DOM 域
- `DOM.getDocument`: 获取 DOM 文档树结构
- `DOM.describeNode`: 描述节点的详细信息

**证据来源**：
- `.refer/verification/inventory/cdp_methods_inventory.md:23-39` 详细列出了这些方法
- `.refer/server/routes/control/observe.post.ts:85-87` 展示了如何使用这些方法：
```typescript
await driver.send("Accessibility.enable", {}, { tabId, sessionId })
const ax = await driver.send("Accessibility.getFullAXTree", {}, { tabId, sessionId })
```

## 问题 5: 这些 CDP 方法在 Stagehand 源代码的哪些文件中被使用？

**答案**：根据 `.refer/verification/inventory/cdp_methods_inventory.md` 的 `used_by` 字段：

### Accessibility 相关
- `Accessibility.enable` 和 `Accessibility.getFullAXTree` 使用位置：
  - `understudy/a11y/snapshot/a11yTree.ts`
  - `understudy/frame.ts`

### DOM 相关
- `DOM.enable` 使用位置：
  - `understudy/a11y/snapshot/a11yTree.ts`
  - `understudy/a11y/snapshot/coordinateResolver.ts`
  - `understudy/a11y/snapshot/domTree.ts`
  - `understudy/a11y/snapshot/focusSelectors.ts`
  - `understudy/frame.ts`
  - `understudy/frameLocator.ts`
  - `understudy/locator.ts`

- `DOM.getDocument` 使用位置：
  - `understudy/a11y/snapshot/domTree.ts`
  - `understudy/frame.ts`

- `DOM.describeNode` 使用位置：
  - `understudy/a11y/snapshot/a11yTree.ts`
  - `understudy/a11y/snapshot/domTree.ts`
  - `understudy/a11y/snapshot/focusSelectors.ts`
  - `understudy/frame.ts`
  - `understudy/frameLocator.ts`
  - `understudy/locator.ts`

### 核心 snapshot 文件（推测）
- `understudy/a11y/snapshot/capture.ts` - 可能是主要的捕获逻辑
- `understudy/a11y/snapshot/coordinateResolver.ts` - 坐标解析
- `understudy/a11y/snapshot/focusSelectors.ts` - 焦点选择器处理
- `understudy/a11y/snapshot/xpathUtils.ts` - XPath 工具函数

**源代码位置**（基于 `.refer/docs/stagehand/README.md:3`）：
- 完整路径：`.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/`

## 问题 6: 完整的调用链是什么？从 V3.act/extract/observe 到最终的序列化

### act() 调用链
```
V3.act(instruction)
  → ActHandler.act(params)
    → Page.waitForDomNetworkQuiet()
    → captureHybridSnapshot(page, { experimental: true })
      → (内部调用 CDP 方法获取 DOM 和 AX 树)
      → 返回 { combinedTree, combinedXpathMap }
    → actInference(...) (LLM 推理)
      → 返回 { elementId, description, method, arguments }
    → combinedXpathMap[elementId] → xpath selector
    → performUnderstudyMethod(page, method, xpath, args)
```

### extract() 调用链
```
V3.extract(instruction, schema)
  → ExtractHandler.extract(params)
    → captureHybridSnapshot(page, { experimental, focusSelector })
      → 返回 { combinedTree, combinedUrlMap? }
    → extractInference(...) (LLM 推理，基于 combinedTree)
      → 如果 schema 包含 URL 类型，使用 combinedUrlMap 注入 URL
    → 返回解析后的对象
```

### observe() 调用链
```
V3.observe(instruction?)
  → ObserveHandler.observe(params)
    → captureHybridSnapshot(page, { focusSelector? })
      → 返回 { combinedTree, combinedXpathMap }
    → runObserve(...) (LLM 推理)
      → 返回 elements 数组（每个包含 elementId）
    → combinedXpathMap[elementId] → xpath selector
    → 返回 Action[] (selector=xpath=...)
```

**证据来源**：
- `.refer/docs/stagehand/v3-flows-act-extract-observe.md` 详细描述了这些流程
- 时序图展示了调用关系

## 问题 7: 当前项目中哪些代码实现了类似的 DOM 序列化功能？

### 1. observe API 实现
- **文件**：`.refer/server/routes/control/observe.post.ts`
- **功能**：实现了 Stagehand observe() 的简化版本
- **实现方式**：
  - 调用 `DOM.getDocument` 获取 DOM 树（`driver.getDocument()`）
  - 调用 `Accessibility.getFullAXTree` 获取可访问性树（`driver.send("Accessibility.getFullAXTree")`）
  - 可选地获取截图和 frame tree
  - 返回原始 CDP 响应数据（未进行序列化合并）

### 2. DriverAdapter 封装
- **文件**：`.refer/server/utils/control/driverAdapter.ts`
- **功能**：封装 CDP 方法调用
- **相关方法**：
  - `getDocument(options?)`: 封装 `DOM.getDocument`
  - `screenshot(options?)`: 封装 `Page.captureScreenshot`
  - `send(method, params, options)`: 通用 CDP 发送方法

### 3. 与 Stagehand 的差异
当前项目实现：
- ✅ 获取了原始 DOM 和 AX 树数据
- ❌ **未实现** `captureHybridSnapshot` 的合并逻辑
- ❌ **未实现** `combinedTree` 的构建
- ❌ **未实现** `combinedXpathMap` 的生成

**缺失的关键功能**：
1. DOM 树和可访问性树的合并算法
2. elementId 的生成和映射机制
3. XPath 选择器的生成（从 nodeId 到 xpath）
4. 树结构的优化和压缩（减少 LLM token 消耗）

## 问题 8: 如果要完整实现 DOM 序列化，需要哪些组件？

### 核心组件

1. **DOM 树获取器** (`domTree.ts`)
   - 使用 `DOM.getDocument` 获取 DOM 树
   - 处理深度参数和节点过滤

2. **可访问性树获取器** (`a11yTree.ts`)
   - 使用 `Accessibility.getFullAXTree` 获取 AX 树
   - 处理可访问性节点的属性

3. **快照捕获器** (`capture.ts`)
   - 协调 DOM 和 AX 树的获取
   - 合并两个树结构为 `combinedTree`
   - 生成 `combinedXpathMap`（elementId → xpath）

4. **XPath 工具** (`xpathUtils.ts`)
   - 从 nodeId 生成 xpath 选择器
   - 处理文本节点的 xpath 修剪

5. **坐标解析器** (`coordinateResolver.ts`)
   - 从 elementId 解析元素坐标
   - 用于可视化或坐标点击

6. **焦点选择器** (`focusSelectors.ts`)
   - 处理 focusSelector 参数
   - 优化快照内容以聚焦特定元素

### 依赖的 CDP 能力
- DOM 域：`DOM.enable`, `DOM.getDocument`, `DOM.describeNode`
- Accessibility 域：`Accessibility.enable`, `Accessibility.getFullAXTree`
- Runtime 域：`Runtime.enable`（用于某些高级特性）

**证据来源**：
- `.refer/verification/inventory/cdp_methods_inventory.md` 列出了所有使用的方法
- `.refer/docs/stagehand/v3-dependencies.md` 描述了依赖关系

---

## 总结：实现 DOM 序列化的关键代码位置

### Stagehand v3 源代码（需要同步 `.sources/stagehand`）
```
.sources/stagehand/packages/core/lib/v3/
├── understudy/a11y/snapshot/
│   ├── capture.ts           # 主要的 captureHybridSnapshot 实现
│   ├── a11yTree.ts          # 可访问性树处理
│   ├── domTree.ts           # DOM 树处理
│   ├── xpathUtils.ts        # XPath 生成工具
│   ├── coordinateResolver.ts # 坐标解析
│   └── focusSelectors.ts    # 焦点选择器处理
├── handlers/
│   ├── actHandler.ts        # 调用 captureHybridSnapshot
│   ├── extractHandler.ts    # 调用 captureHybridSnapshot
│   └── observeHandler.ts    # 调用 captureHybridSnapshot
└── v3.ts                    # 顶层入口
```

### 当前项目中的相关实现
```
.refer/server/
├── routes/control/
│   └── observe.post.ts      # 简化版 observe，获取原始 DOM/AX 树
└── utils/control/
    └── driverAdapter.ts     # CDP 方法封装
```

### 需要补充的功能
详见：[缺失功能分析文档](./stagehand-dom序列化-缺失功能分析.md)

