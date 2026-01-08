# Stagehand DOM 序列化 - 文档索引

## 文档概览

本文档索引整理了 Stagehand v3 DOM 元素序列化实现的相关分析文档，方便快速定位和查阅。

## 文档列表

### 1. 实现梳理文档

**文件**：`stagehand-dom序列化-实现梳理.md`

**内容**：通过苏格拉底式提问的方式，梳理 DOM 序列化的核心概念和实现机制。

**关键问题**：
- 什么是 DOM 序列化？为什么要序列化？
- captureHybridSnapshot 是什么？输入输出是什么？
- "Hybrid" 的含义是什么？
- 使用了哪些 CDP 方法？
- 这些方法在哪些文件中被使用？
- 完整的调用链是什么？
- 当前项目中哪些代码实现了类似功能？
- 如果要完整实现，需要哪些组件？

**适用场景**：
- 初次了解 DOM 序列化概念
- 理解 Stagehand 的序列化机制
- 了解当前项目实现状态

### 2. 缺失功能分析文档

**文件**：`stagehand-dom序列化-缺失功能分析.md`

**内容**：详细分析当前项目缺失的 DOM 序列化功能，包括实现优先级和建议。

**关键内容**：
- 当前实现状态（已实现/未实现）
- 缺失的核心功能详细分析
- 实现优先级（高/中/低）
- 分阶段实现建议
- 参考实现位置
- 数据流图

**适用场景**：
- 规划实现路线
- 确定开发优先级
- 了解需要实现的具体功能

### 3. CDP 方法分析文档

**文件**：`stagehand-dom序列化-CDP方法分析.md`

**内容**：详细分析 DOM 序列化过程中使用的 CDP 方法，包括参数、返回值和使用场景。

**关键内容**：
- Accessibility 域方法（enable, getFullAXTree）
- DOM 域方法（enable, getDocument, describeNode, getFrameOwner 等）
- Runtime 域方法（enable, evaluate）
- CDP 方法调用顺序
- 依赖关系图
- 当前项目实现状态

**适用场景**：
- 实现 CDP 方法封装
- 理解 CDP 调用流程
- 调试 CDP 相关问题

### 4. 调用链分析文档

**文件**：`stagehand-dom序列化-调用链分析.md`

**内容**：详细分析从顶层 API 到底层 CDP 调用的完整调用链。

**关键内容**：
- V3.act/extract/observe 的调用链
- captureHybridSnapshot 详细调用链
- domMapsForSession 详细调用链
- a11yForFrame 详细调用链
- XPath 生成调用链
- 数据流图
- 当前项目调用链对比

**适用场景**：
- 理解代码执行流程
- 调试调用链问题
- 设计新的实现方案

## 快速查找指南

### 按需求查找

#### 我想了解 DOM 序列化的基本概念
→ 阅读：`stagehand-dom序列化-实现梳理.md` 的问题 1-3

#### 我想知道需要实现哪些功能
→ 阅读：`stagehand-dom序列化-缺失功能分析.md`

#### 我想了解如何调用 CDP 方法
→ 阅读：`stagehand-dom序列化-CDP方法分析.md`

#### 我想理解代码的执行流程
→ 阅读：`stagehand-dom序列化-调用链分析.md`

#### 我想开始实现某个功能
→ 阅读：`stagehand-dom序列化-缺失功能分析.md` 的实现建议部分

### 按角色查找

#### 架构师/技术负责人
1. `stagehand-dom序列化-实现梳理.md` - 了解整体架构
2. `stagehand-dom序列化-缺失功能分析.md` - 规划实现路线
3. `stagehand-dom序列化-调用链分析.md` - 理解数据流

#### 开发工程师
1. `stagehand-dom序列化-缺失功能分析.md` - 了解需要实现的功能
2. `stagehand-dom序列化-CDP方法分析.md` - 实现 CDP 封装
3. `stagehand-dom序列化-调用链分析.md` - 理解调用关系

#### 测试工程师
1. `stagehand-dom序列化-调用链分析.md` - 理解测试点
2. `stagehand-dom序列化-CDP方法分析.md` - 了解 CDP 方法行为

## 关键路径参考

### Stagehand v3 源代码位置

所有源代码位于：
```
.sources/stagehand/packages/core/lib/v3/
├── understudy/a11y/snapshot/
│   ├── capture.ts              # captureHybridSnapshot 主函数
│   ├── domTree.ts              # DOM 树处理
│   ├── a11yTree.ts             # 可访问性树处理
│   ├── xpathUtils.ts           # XPath 工具
│   ├── focusSelectors.ts       # 焦点选择器
│   └── treeFormatUtils.ts     # 树格式工具
├── handlers/
│   ├── actHandler.ts           # ActHandler
│   ├── extractHandler.ts       # ExtractHandler
│   └── observeHandler.ts      # ObserveHandler
└── v3.ts                       # 顶层入口
```

### 当前项目相关实现

```
.refer/
├── server/
│   ├── routes/control/
│   │   └── observe.post.ts     # 简化版 observe
│   └── utils/control/
│       └── driverAdapter.ts     # CDP 方法封装
└── docs/
    └── stagehand/               # Stagehand 文档
```

### 参考文档位置

```
.refer/
├── docs/stagehand/
│   ├── README.md
│   ├── v3-overview.md
│   ├── v3-flows-act-extract-observe.md
│   ├── v3-dependencies.md
│   └── v3-understudy.md
└── verification/inventory/
    └── cdp_methods_inventory.md
```

## 实现路线图

### 阶段 1：基础实现（单 Frame）

**目标**：实现单 frame 的 DOM 序列化

**需要阅读**：
1. `stagehand-dom序列化-缺失功能分析.md` - 阶段 1 部分
2. `stagehand-dom序列化-CDP方法分析.md` - DOM 和 Accessibility 方法
3. `stagehand-dom序列化-调用链分析.md` - domMapsForSession 和 a11yForFrame

**实现文件**：
- `.refer/server/utils/control/snapshot/domTree.ts`
- `.refer/server/utils/control/snapshot/a11yTree.ts`
- `.refer/server/utils/control/snapshot/capture.ts` (基础版本)

### 阶段 2：多 Frame 支持

**目标**：支持 iframe 嵌套的完整序列化

**需要阅读**：
1. `stagehand-dom序列化-缺失功能分析.md` - 阶段 2 部分
2. `stagehand-dom序列化-CDP方法分析.md` - DOM.getFrameOwner
3. `stagehand-dom序列化-调用链分析.md` - computeFramePrefixes 和 mergeFramesIntoSnapshot

**实现文件**：
- `.refer/server/utils/control/snapshot/capture.ts` (完整版本)
- `.refer/server/utils/control/snapshot/xpathUtils.ts`

### 阶段 3：优化功能

**目标**：实现聚焦快照和性能优化

**需要阅读**：
1. `stagehand-dom序列化-缺失功能分析.md` - 阶段 3 部分
2. `stagehand-dom序列化-调用链分析.md` - tryScopedSnapshot

**实现文件**：
- `.refer/server/utils/control/snapshot/focusSelectors.ts`
- `.refer/server/utils/control/snapshot/treeFormatUtils.ts`

## 相关资源

### 外部文档

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [Stagehand GitHub Repository](https://github.com/browserbase/stagehand)

### 内部文档

- `.refer/docs/stagehand/` - Stagehand v3 文档
- `.refer/docs/nanobrowser/` - Nanobrowser 文档（参考实现）
- `.refer/verification/inventory/` - CDP 方法清单

## 更新记录

- 2026-01-XX: 初始版本，包含 4 个分析文档

## 贡献指南

如需更新文档：
1. 修改对应的分析文档
2. 更新本文档索引（如有新增文档）
3. 更新实现路线图（如有进度）

