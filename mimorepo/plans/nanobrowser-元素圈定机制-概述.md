# Nanobrowser 元素圈定机制概述

## 什么是"圈定元素"？

在页面上为可交互元素添加视觉高亮（highlight）和编号（highlightIndex），使 LLM 能够通过编号引用并操作这些元素。

## 核心概念

### 1. 视觉高亮
- 为每个可交互元素创建覆盖层（overlay）和编号标签
- 高亮容器：`#playwright-highlight-container`（固定定位，z-index: 2147483647）
- 动态更新：监听 scroll 和 resize 事件，实时更新位置

### 2. 编号系统
- 每个被圈定的元素都有唯一的 `highlightIndex`（从 0 开始递增）
- 通过 `selectorMap: Map<highlightIndex, DOMElementNode>` 建立映射关系
- LLM 通过 `[index]` 格式引用元素

### 3. 触发时机
每次需要获取页面状态时触发：
- `Page.getState()` 被调用
- 执行 `Page._updateState()`
- 调用 `Page.getClickableElements()`

## 实现方式

### 脚本注入
通过 Chrome Extension API 将 `buildDomTree.js` 注入到页面：

**关键文件**：
- `.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::injectBuildDomTreeScripts()`
- `.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

### DOM 树构建
在页面上下文中执行 `window.buildDomTree()`：
- 遍历 DOM 树
- 判断每个元素是否应该被圈定
- 为符合条件的元素分配 `highlightIndex`
- 创建视觉高亮

### 数据返回
将构建结果返回给 background service worker：
- `DOMState.elementTree`：完整的 DOM 树
- `DOMState.selectorMap`：highlightIndex 到元素的映射

## 关键代码路径

### 注入脚本
```
.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts
  → injectBuildDomTreeScripts(tabId)
    → chrome.scripting.executeScript({ files: ['buildDomTree.js'] })
```

### 执行构建
```
.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts
  → getClickableElements(tabId, url, ...)
    → _buildDomTree(...)
      → chrome.scripting.executeScript({ func: args => window.buildDomTree(args) })
        → .refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js
          → window.buildDomTree(args)
            → buildDomTree(document.body)
              → handleHighlighting(nodeData, node, ...)
                → highlightElement(element, index, ...)
```

### 高亮实现
```
.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js
  → highlightElement(element, index, parentIframe)
    → 创建覆盖层和标签
    → 添加到 #playwright-highlight-container
    → 监听 scroll/resize 事件更新位置
```

## 总结

元素圈定机制是 nanobrowser 实现浏览器自动化的核心基础：
1. **识别**：通过多层判断标准识别可交互元素
2. **标记**：为元素分配唯一编号并创建视觉高亮
3. **存储**：构建 DOM 树和映射表供后续使用
4. **定位**：通过 highlightIndex 快速定位元素执行操作

