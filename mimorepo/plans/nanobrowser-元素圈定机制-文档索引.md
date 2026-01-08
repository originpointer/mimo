# Nanobrowser 元素圈定机制 - 文档索引

## 文档概览

本文档集通过苏格拉底式提问的方式，系统梳理了 nanobrowser 中页面元素圈定的完整机制。

## 文档列表

### 1. [概述](./nanobrowser-元素圈定机制-概述.md)
**核心内容**：
- 什么是"圈定元素"
- 核心概念（视觉高亮、编号系统、触发时机）
- 实现方式（脚本注入、DOM 树构建、数据返回）
- 关键代码路径

**适合阅读场景**：快速了解整体机制

### 2. [判断标准](./nanobrowser-元素圈定机制-判断标准.md)
**核心内容**：
- 5 个判断条件详解
  - 交互性判断（`isInteractiveElement`）
  - 可见性判断（`isElementVisible`）
  - 顶层元素判断（`isTopElement`）
  - 视口内判断（`isInExpandedViewport`）
  - 独立交互判断（`isElementDistinctInteraction`）
- 综合判断流程（`handleHighlighting`）
- 关键判断函数索引

**适合阅读场景**：理解哪些元素会被圈定

### 3. [调用链路](./nanobrowser-元素圈定机制-调用链路.md)
**核心内容**：
- 完整调用链路（从 Executor 到 highlightElement）
- 关键节点详解
- 数据流向（Background ↔ Page Context）
- 特殊流程（iframe 处理、脚本注入）
- 性能优化点

**适合阅读场景**：追踪代码执行流程

### 4. [数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md)
**核心内容**：
- 核心数据结构（DOMState、DOMElementNode、BuildDomTreeResult 等）
- 数据转换流程（页面上下文 → Background）
- 数据使用场景（转换为文本、元素定位、选择器生成）
- 元素 Hash 机制（判断新元素）
- 数据存储位置

**适合阅读场景**：理解数据结构和存储方式

### 5. [特殊场景处理](./nanobrowser-元素圈定机制-特殊场景处理.md)
**核心内容**：
- iframe 处理（跨域访问、单独处理、合并树结构）
- Shadow DOM 处理（强制 open、递归遍历、顶层判断）
- 富文本编辑器处理
- 跨域限制处理
- 性能优化场景
- 特殊元素处理

**适合阅读场景**：处理复杂页面场景

### 6. [视觉表现实现](./nanobrowser-元素圈定机制-视觉表现实现.md)
**核心内容**：
- 高亮容器创建和管理
- 高亮覆盖层实现
- 编号标签实现
- 动态位置更新机制
- 高亮移除机制
- 焦点元素高亮
- 颜色方案
- 性能优化

**适合阅读场景**：理解视觉高亮的实现细节

## 快速查找指南

### 按问题查找

| 问题 | 对应文档 |
|------|----------|
| 什么是元素圈定？ | [概述](./nanobrowser-元素圈定机制-概述.md) |
| 哪些元素会被圈定？ | [判断标准](./nanobrowser-元素圈定机制-判断标准.md) |
| 如何判断元素是否可交互？ | [判断标准 - 交互性判断](./nanobrowser-元素圈定机制-判断标准.md#1-交互性判断-isinteractiveelement) |
| 圈定流程是如何触发的？ | [调用链路](./nanobrowser-元素圈定机制-调用链路.md) |
| 数据是如何存储的？ | [数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md) |
| 如何处理 iframe？ | [特殊场景处理 - iframe](./nanobrowser-元素圈定机制-特殊场景处理.md#1-iframe-处理) |
| 如何处理 Shadow DOM？ | [特殊场景处理 - Shadow DOM](./nanobrowser-元素圈定机制-特殊场景处理.md#2-shadow-dom-处理) |
| 高亮是如何实现的？ | [视觉表现实现](./nanobrowser-元素圈定机制-视觉表现实现.md) |

### 按代码文件查找

| 文件路径（相对于 `.refer/.sources/nanobrowser/`） | 相关文档 |
|---------------------------------------------------|----------|
| `chrome-extension/public/buildDomTree.js` | [概述](./nanobrowser-元素圈定机制-概述.md)、[判断标准](./nanobrowser-元素圈定机制-判断标准.md)、[视觉表现实现](./nanobrowser-元素圈定机制-视觉表现实现.md) |
| `chrome-extension/src/background/browser/dom/service.ts` | [调用链路](./nanobrowser-元素圈定机制-调用链路.md)、[特殊场景处理](./nanobrowser-元素圈定机制-特殊场景处理.md) |
| `chrome-extension/src/background/browser/dom/views.ts` | [数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md) |
| `chrome-extension/src/background/browser/page.ts` | [调用链路](./nanobrowser-元素圈定机制-调用链路.md)、[数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md) |
| `chrome-extension/src/background/browser/dom/clickable/service.ts` | [数据结构与存储 - Hash 机制](./nanobrowser-元素圈定机制-数据结构与存储.md#元素-hash-机制) |

### 按功能模块查找

| 功能模块 | 相关文档 |
|----------|----------|
| 元素判断 | [判断标准](./nanobrowser-元素圈定机制-判断标准.md) |
| 调用流程 | [调用链路](./nanobrowser-元素圈定机制-调用链路.md) |
| 数据存储 | [数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md) |
| iframe 支持 | [特殊场景处理 - iframe](./nanobrowser-元素圈定机制-特殊场景处理.md#1-iframe-处理) |
| Shadow DOM 支持 | [特殊场景处理 - Shadow DOM](./nanobrowser-元素圈定机制-特殊场景处理.md#2-shadow-dom-处理) |
| 视觉高亮 | [视觉表现实现](./nanobrowser-元素圈定机制-视觉表现实现.md) |

## 学习路径建议

### 初学者路径
1. [概述](./nanobrowser-元素圈定机制-概述.md) - 了解整体机制
2. [判断标准](./nanobrowser-元素圈定机制-判断标准.md) - 理解判断逻辑
3. [调用链路](./nanobrowser-元素圈定机制-调用链路.md) - 追踪执行流程

### 深入理解路径
1. [数据结构与存储](./nanobrowser-元素圈定机制-数据结构与存储.md) - 理解数据模型
2. [特殊场景处理](./nanobrowser-元素圈定机制-特殊场景处理.md) - 处理复杂场景
3. [视觉表现实现](./nanobrowser-元素圈定机制-视觉表现实现.md) - 理解视觉实现

### 问题排查路径
1. [调用链路](./nanobrowser-元素圈定机制-调用链路.md) - 定位问题节点
2. [判断标准](./nanobrowser-元素圈定机制-判断标准.md) - 检查判断逻辑
3. [特殊场景处理](./nanobrowser-元素圈定机制-特殊场景处理.md) - 检查特殊场景

## 关键概念速查

### highlightIndex
- **定义**：元素的唯一编号，从 0 开始递增
- **用途**：LLM 通过编号引用元素
- **存储**：`DOMElementNode.highlightIndex`
- **映射**：`selectorMap: Map<highlightIndex, DOMElementNode>`

### DOMState
- **定义**：包含 DOM 树和选择器映射的状态对象
- **结构**：`{ elementTree: DOMElementNode, selectorMap: Map<number, DOMElementNode> }`
- **用途**：存储圈定结果

### buildDomTree
- **定义**：在页面上下文中执行的函数，构建 DOM 树并圈定元素
- **位置**：`chrome-extension/public/buildDomTree.js`
- **返回**：`{ rootId: string, map: Record<string, RawDomTreeNode> }`

### isInteractiveElement
- **定义**：判断元素是否可交互的函数
- **判断依据**：标签名、光标样式、ARIA role、事件监听器等
- **位置**：`buildDomTree.js::isInteractiveElement()`

### highlightElement
- **定义**：在页面上创建视觉高亮的函数
- **功能**：创建覆盖层、编号标签、监听事件更新位置
- **位置**：`buildDomTree.js::highlightElement()`

## 相关资源

### 代码仓库
- 主目录：`.refer/.sources/nanobrowser/`
- 核心代码：`chrome-extension/src/background/browser/dom/`
- 页面脚本：`chrome-extension/public/buildDomTree.js`

### 相关文档
- [Nanobrowser 架构概览](../.refer/docs/nanobrowser/overview.md)
- [DOM 注入与观察链路](../.refer/docs/nanobrowser/flows-dom-and-observation.md)

## 更新记录

- 2025-01-XX：初始版本，通过苏格拉底式提问梳理完整机制

