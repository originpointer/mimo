# Nanobrowser 元素圈定机制 - 调用链路

## 完整调用链路

### 主调用链

```
.refer/.sources/nanobrowser/chrome-extension/src/background/agent/executor.ts
  → Executor.execute()
    → NavigatorAgent.act()
      → .refer/.sources/nanobrowser/chrome-extension/src/background/browser/context.ts
        → BrowserContext.getState(useVision)
          → .refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts
            → Page.getState(useVision, cacheClickableElementsHashes)
              → Page._updateState(useVision, focusElement)
                → Page.getClickableElements(displayHighlights, focusElement)
                  → .refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts
                    → getClickableElements(tabId, url, showHighlightElements, focusElement, ...)
                      → _buildDomTree(tabId, url, showHighlightElements, focusElement, ...)
                        → injectBuildDomTreeScripts(tabId)
                        → chrome.scripting.executeScript({ func: args => window.buildDomTree(args) })
                          → .refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js
                            → window.buildDomTree(args)
                              → buildDomTree(document.body, parentIframe, isParentHighlighted, depth)
                                → handleHighlighting(nodeData, node, parentIframe, isParentHighlighted)
                                  → highlightElement(element, index, parentIframe)
```

## 关键节点详解

### 1. 入口：Executor.execute()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/agent/executor.ts`

**作用**：任务执行器，协调 Planner 和 Navigator 的工作

**触发时机**：
- 收到 `new_task` 消息
- 收到 `follow_up_task` 消息

### 2. NavigatorAgent.act()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/agent/agents/navigator.ts`

**作用**：导航代理，执行具体的浏览器操作

**关键代码**：
```typescript
const browserState = await browserContext.getState(this.context.options.useVision);
```

### 3. BrowserContext.getState()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/context.ts`

**作用**：获取浏览器上下文的状态

**关键代码**：
```typescript
public async getState(useVision = false, cacheClickableElementsHashes = false): Promise<BrowserState> {
  const currentPage = this._pages.get(this._currentTabId);
  if (!currentPage) {
    throw new Error('No current page');
  }
  const pageState = useVision
    ? await currentPage.getState(useVision, cacheClickableElementsHashes)
    : await currentPage.getState(useVision, cacheClickableElementsHashes);
  // ...
}
```

### 4. Page.getState()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts`

**作用**：获取页面状态，包括 DOM 树和可点击元素

**关键代码**：
```typescript
async getState(useVision = false, cacheClickableElementsHashes = false): Promise<PageState> {
  await this.waitForPageAndFramesLoad();
  const updatedState = await this._updateState(useVision);
  
  // 标记新元素（如果启用缓存）
  if (cacheClickableElementsHashes) {
    // ... 比较 hash 判断新元素
  }
  
  this._cachedState = updatedState;
  return updatedState;
}
```

### 5. Page._updateState()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts`

**作用**：更新页面状态，获取可点击元素

**关键代码**：
```typescript
async _updateState(useVision = false, focusElement = -1): Promise<PageState> {
  await this.removeHighlight();
  
  const displayHighlights = this._config.displayHighlights || useVision;
  const content = await this.getClickableElements(displayHighlights, focusElement);
  
  // 获取截图、滚动信息等
  const screenshot = useVision ? await this.takeScreenshot() : null;
  const [scrollY, visualViewportHeight, scrollHeight] = await this.getScrollInfo();
  
  // 更新状态
  this._state.elementTree = content.elementTree;
  this._state.selectorMap = content.selectorMap;
  // ...
}
```

### 6. Page.getClickableElements()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts`

**作用**：获取可点击元素

**关键代码**：
```typescript
async getClickableElements(showHighlightElements: boolean, focusElement: number): Promise<DOMState | null> {
  if (!this._validWebPage) {
    return null;
  }
  return _getClickableElements(
    this._tabId,
    this.url(),
    showHighlightElements,
    focusElement,
    this._config.viewportExpansion,
  );
}
```

### 7. DOMService.getClickableElements()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts`

**作用**：DOM 服务的公共接口

**关键代码**：
```typescript
export async function getClickableElements(
  tabId: number,
  url: string,
  showHighlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
): Promise<DOMState> {
  const [elementTree, selectorMap] = await _buildDomTree(
    tabId,
    url,
    showHighlightElements,
    focusElement,
    viewportExpansion,
    debugMode,
  );
  return { elementTree, selectorMap };
}
```

### 8. DOMService._buildDomTree()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts`

**作用**：构建 DOM 树的核心逻辑

**关键步骤**：
1. 注入脚本：`injectBuildDomTreeScripts(tabId)`
2. 执行脚本：`chrome.scripting.executeScript({ func: args => window.buildDomTree(args) })`
3. 处理 iframe：如果检测到跨域 iframe，单独处理并合并
4. 构建树结构：`_constructDomTree(evalPage)`

**关键代码**：
```typescript
async function _buildDomTree(...): Promise<[DOMElementNode, Map<number, DOMElementNode>]> {
  await injectBuildDomTreeScripts(tabId);
  
  const mainFrameResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: args => {
      return window.buildDomTree(args);
    },
    args: [{ showHighlightElements, focusHighlightIndex: focusElement, ... }],
  });
  
  // 处理 iframe
  const visibleIframesFailedLoading = _visibleIFramesFailedLoading(mainFramePage);
  if (visibleIframesFailedLoadingCount > 0) {
    // 获取所有 frames 并单独处理
    const frameTreeResult = await constructFrameTree(...);
    mainFramePage = frameTreeResult.resultPage;
  }
  
  return _constructDomTree(mainFramePage);
}
```

### 9. buildDomTree.js::window.buildDomTree()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

**作用**：在页面上下文中构建 DOM 树并圈定元素

**关键步骤**：
1. 初始化：重置 `highlightIndex`，创建缓存
2. 递归遍历：从 `document.body` 开始递归遍历 DOM
3. 判断圈定：对每个元素调用 `handleHighlighting()`
4. 返回结果：返回 `{ rootId, map: DOM_HASH_MAP }`

**关键代码**：
```javascript
window.buildDomTree = (args) => {
  let highlightIndex = startHighlightIndex;
  const rootId = buildDomTree(document.body);
  return { rootId, map: DOM_HASH_MAP };
};

function buildDomTree(node, parentIframe = null, isParentHighlighted = false, depth = 0) {
  // 创建 nodeData
  const nodeData = { tagName, attributes, xpath, children: [] };
  
  // 判断可见性和交互性
  nodeData.isVisible = isElementVisible(node);
  if (nodeData.isVisible) {
    nodeData.isTopElement = isTopElement(node);
    if (nodeData.isTopElement || isMenuContainer) {
      nodeData.isInteractive = isInteractiveElement(node);
      nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted);
    }
  }
  
  // 递归处理子节点
  for (const child of Array.from(node.childNodes)) {
    const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted || isParentHighlighted, depth + 1);
    if (domElement) nodeData.children.push(domElement);
  }
  
  // 返回节点 ID
  const id = `${ID.current++}`;
  DOM_HASH_MAP[id] = nodeData;
  return id;
}
```

### 10. buildDomTree.js::handleHighlighting()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

**作用**：综合判断是否应该圈定元素

**关键代码**：
```javascript
function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
  if (!nodeData.isInteractive) return false;
  
  let shouldHighlight = false;
  if (!isParentHighlighted) {
    shouldHighlight = true;
  } else {
    if (isElementDistinctInteraction(node)) {
      shouldHighlight = true;
    }
  }
  
  if (shouldHighlight) {
    nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
    if (nodeData.isInViewport || viewportExpansion === -1) {
      nodeData.highlightIndex = highlightIndex++;
      if (doHighlightElements) {
        highlightElement(node, nodeData.highlightIndex, parentIframe);
      }
      return true;
    }
  }
  
  return false;
}
```

### 11. buildDomTree.js::highlightElement()

**文件**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

**作用**：在页面上创建视觉高亮

**关键步骤**：
1. 创建或获取高亮容器
2. 获取元素的 `getClientRects()`
3. 为每个 rect 创建覆盖层
4. 创建编号标签
5. 监听 scroll/resize 事件更新位置

## 数据流向

### Background → Page Context
- 通过 `chrome.scripting.executeScript` 注入脚本
- 传递参数：`showHighlightElements`, `focusHighlightIndex`, `viewportExpansion` 等

### Page Context → Background
- 返回 `BuildDomTreeResult`：
  ```typescript
  {
    rootId: string;
    map: Record<string, RawDomTreeNode>;
    perfMetrics?: {...};
  }
  ```

### Background 处理
- `_constructDomTree()` 将原始数据转换为 `DOMElementNode` 树
- 构建 `selectorMap: Map<highlightIndex, DOMElementNode>`
- 返回 `DOMState { elementTree, selectorMap }`

## 特殊流程

### iframe 处理流程

```
主 frame buildDomTree()
  → 检测 visibleIframesFailedLoading
    → chrome.webNavigation.getAllFrames({ tabId })
      → 对每个失败的 iframe：
        → chrome.scripting.executeScript({ frameIds: [frameId] })
          → buildDomTree() (在 iframe 上下文中)
            → 合并到主 frame 树
```

### 脚本注入流程

```
injectBuildDomTreeScripts(tabId)
  → scriptInjectedFrames(tabId) // 检查哪些 frame 已注入
    → 对未注入的 frames：
      → chrome.scripting.executeScript({ files: ['buildDomTree.js'] })
```

## 性能优化点

1. **缓存机制**：
   - `DOM_CACHE`：缓存 `boundingRects`, `clientRects`, `computedStyles`
   - `xpathCache`：缓存 XPath 字符串

2. **早期退出**：
   - 快速拒绝不可见元素
   - 视口外元素提前过滤

3. **批量操作**：
   - 使用 `DocumentFragment` 批量添加 DOM 元素
   - 节流 scroll/resize 事件处理

4. **并行处理**：
   - iframe 可以并行处理（当前是串行）

