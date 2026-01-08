# Nanobrowser 元素圈定机制 - 特殊场景处理

## 1. iframe 处理

### 问题背景
- 跨域 iframe 无法在主 frame 中直接访问其 DOM
- 同源 iframe 可以访问，但需要特殊处理
- 多个 iframe 需要统一编号

### 处理策略

#### 1.1 主 Frame 尝试访问

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

在主 frame 的 `buildDomTree()` 中，对 iframe 元素：
```javascript
if (tagName === 'iframe') {
  try {
    const iframeDoc = node.contentDocument || node.contentWindow?.document;
    if (iframeDoc && iframeDoc.childNodes) {
      // 成功访问，递归处理
      for (const child of Array.from(iframeDoc.childNodes)) {
        const domElement = buildDomTree(child, node, false, depth + 1);
        if (domElement) nodeData.children.push(domElement);
      }
    }
  } catch (e) {
    // 跨域访问失败，标记错误
    nodeData.attributes['error'] = e.message;
  }
}
```

#### 1.2 检测失败的 iframe

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::_visibleIFramesFailedLoading()`

```typescript
function _visibleIFramesFailedLoading(result: BuildDomTreeResult): Record<string, RawDomElementNode> {
  const iframeNodes = _getRawDomTreeNodes(result, 'iframe');
  return Object.fromEntries(
    Object.entries(iframeNodes).filter(([, iframeNode]) => {
      const error = iframeNode.attributes['error'];
      const height = parseInt(iframeNode.attributes['computedHeight']);
      const width = parseInt(iframeNode.attributes['computedWidth']);
      const skipped = iframeNode.attributes['skipped'];
      
      // 只考虑有错误、可见且未跳过的 iframe
      return error != null && height > 1 && width > 1 && !skipped;
    }),
  );
}
```

#### 1.3 单独处理失败的 iframe

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::constructFrameTree()`

**流程**：
1. 获取所有 frames：`chrome.webNavigation.getAllFrames({ tabId })`
2. 匹配失败的 iframe 节点
3. 对每个失败的 iframe 单独执行 `buildDomTree`
4. 合并到主 frame 树

**关键代码**：
```typescript
async function constructFrameTree(
  tabId: number,
  showHighlightElements: boolean,
  focusElement: number,
  viewportExpansion: number,
  debugMode: boolean,
  parentFramePage: BuildDomTreeResult,
  allFramesInfo: FrameInfo[],
  startingNodeId: number,
  startingHighlightIndex: number,
): Promise<{ maxNodeId: number; maxHighlightIndex: number; resultPage: BuildDomTreeResult }> {
  const parentIframesFailedLoading = _visibleIFramesFailedLoading(parentFramePage);
  const failedLoadingFrames = allFramesInfo.filter(frameInfo => {
    return _locateMatchingIframeNode(parentIframesFailedLoading, frameInfo) != null;
  });
  
  let maxNodeId = startingNodeId;
  let maxHighlightIndex = startingHighlightIndex;
  
  for (const subFrame of failedLoadingFrames) {
    // 在 iframe 上下文中执行 buildDomTree
    const subFrameResult = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [subFrame.frameId] },
      func: args => {
        return window.buildDomTree({ ...args });
      },
      args: [{
        showHighlightElements,
        focusHighlightIndex: focusElement,
        viewportExpansion,
        startId: maxNodeId + 1,
        startHighlightIndex: maxHighlightIndex + 1,  // 连续编号
        debugMode,
      }],
    });
    
    const subFramePage = subFrameResult[0]?.result as BuildDomTreeResult;
    
    // 更新最大 ID 和 highlightIndex
    maxNodeId = _getMaxID(subFramePage, maxNodeId);
    maxHighlightIndex = _getMaxHighlighIndex(subFramePage, maxHighlightIndex);
    
    // 合并 map
    parentFramePage.map = {
      ...parentFramePage.map,
      ...subFramePage.map,
    };
    
    // 找到对应的 iframe 节点并连接
    const iframeNode = _locateMatchingIframeNode(parentIframesFailedLoading, subFrame);
    if (iframeNode) {
      iframeNode.children.push(subFramePage.rootId);
    }
    
    // 递归处理子 iframe
    const childrenIframesFailedLoading = _visibleIFramesFailedLoading(subFramePage);
    if (Object.values(childrenIframesFailedLoading).length > 0) {
      const result = await constructFrameTree(
        tabId, showHighlightElements, focusElement, viewportExpansion, debugMode,
        subFramePage, allFramesInfo, maxNodeId, maxHighlightIndex,
      );
      maxNodeId = Math.max(maxNodeId, result.maxNodeId);
      maxHighlightIndex = Math.max(maxHighlightIndex, result.maxHighlightIndex);
    }
  }
  
  return { maxNodeId, maxHighlightIndex, resultPage: parentFramePage };
}
```

#### 1.4 iframe 节点匹配

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::_locateMatchingIframeNode()`

**匹配策略**：
- 高度和宽度匹配（严格或宽松）
- name 属性匹配
- URL 匹配（如果可用）
- title 匹配（如果可用）

```typescript
function _locateMatchingIframeNode(
  iframeNodes: Record<string, RawDomElementNode>,
  frameInfo: FrameInfo,
  strictComparison: boolean = true,
): RawDomElementNode | undefined {
  return Object.values(iframeNodes).find(iframeNode => {
    const frameHeight = parseInt(iframeNode.attributes['computedHeight']);
    const frameWidth = parseInt(iframeNode.attributes['computedWidth']);
    const frameName = iframeNode.attributes['name'];
    const frameUrl = iframeNode.attributes['src'];
    const frameTitle = iframeNode.attributes['title'];
    
    let heightMatch = false;
    let widthMatch = false;
    const nameMatch = !frameName || !frameInfo.name || frameInfo.name === frameName;
    
    if (strictComparison) {
      heightMatch = frameInfo.computedHeight === frameHeight;
      widthMatch = frameInfo.computedWidth === frameWidth;
      // ...
    } else {
      // 宽松匹配：允许 10px 误差或 10% 误差
      const heightDifference = Math.abs(frameInfo.computedHeight - frameHeight);
      heightMatch = heightDifference < 10 || 
                    heightDifference / Math.max(frameInfo.computedHeight, frameHeight, 1) < 0.1;
      // ...
    }
    
    return heightMatch && widthMatch && nameMatch && urlMatch && titleMatch;
  });
}
```

#### 1.5 iframe 跳过策略

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

跳过不可见的跟踪 iframe：
```javascript
if (tagName === 'iframe') {
  const rect = getCachedBoundingRect(node);
  const shouldSkipIframe =
    // 不可见 iframe (1x1 像素或类似)
    (rect.width <= 1 && rect.height <= 1) ||
    // 定位在屏幕外
    rect.left < -1000 ||
    rect.top < -1000;
  
  if (shouldSkipIframe) {
    nodeData.attributes['skipped'] = 'invisible-tracking-iframe';
  }
}
```

### iframe 高亮处理

在 iframe 内的元素高亮时，需要考虑 iframe 的偏移：
```javascript
function highlightElement(element, index, parentIframe = null) {
  // 获取 iframe 偏移
  let iframeOffset = { x: 0, y: 0 };
  if (parentIframe) {
    const iframeRect = parentIframe.getBoundingClientRect();
    iframeOffset.x = iframeRect.left;
    iframeOffset.y = iframeRect.top;
  }
  
  // 创建覆盖层时加上偏移
  const top = rect.top + iframeOffset.y;
  const left = rect.left + iframeOffset.x;
  // ...
}
```

## 2. Shadow DOM 处理

### 问题背景
- Shadow DOM 内的元素需要特殊访问方式
- 需要强制 Shadow DOM 为 open 模式

### 处理策略

#### 2.1 强制 Shadow DOM Open

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts::_addAntiDetectionScripts()`

在 Puppeteer 连接时注入：
```typescript
await this._puppeteerPage.evaluateOnNewDocument(`
  (function () {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function attachShadow(options) {
      return originalAttachShadow.call(this, { ...options, mode: "open" });
    };
  })();
`);
```

#### 2.2 Shadow DOM 遍历

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

在 `buildDomTree()` 中：
```javascript
// 处理 shadow DOM
if (node.shadowRoot) {
  nodeData.shadowRoot = true;
  for (const child of Array.from(node.shadowRoot.childNodes)) {
    const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted || isParentHighlighted, depth + 1);
    if (domElement) nodeData.children.push(domElement);
  }
}
```

#### 2.3 Shadow DOM 顶层判断

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isTopElement()`

```javascript
function isTopElement(element) {
  // ...
  const shadowRoot = element.getRootNode();
  if (shadowRoot instanceof ShadowRoot) {
    const centerX = rects[Math.floor(rects.length / 2)].left + rects[Math.floor(rects.length / 2)].width / 2;
    const centerY = rects[Math.floor(rects.length / 2)].top + rects[Math.floor(rects.length / 2)].height / 2;
    
    try {
      const topEl = shadowRoot.elementFromPoint(centerX, centerY);
      if (!topEl) return false;
      
      let current = topEl;
      while (current && current !== shadowRoot) {
        if (current === element) return true;
        current = current.parentElement;
      }
      return false;
    } catch (e) {
      return true;
    }
  }
  // ...
}
```

## 3. 富文本编辑器处理

### 问题背景
- 富文本编辑器（如 TinyMCE）使用特殊的 DOM 结构
- 需要捕获格式化文本内容

### 处理策略

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

```javascript
// 处理富文本编辑器和 contenteditable 元素
else if (
  node.isContentEditable ||
  node.getAttribute('contenteditable') === 'true' ||
  node.id === 'tinymce' ||
  node.classList.contains('mce-content-body') ||
  (tagName === 'body' && node.getAttribute('data-id')?.startsWith('mce_'))
) {
  // 处理所有子节点以捕获格式化文本
  for (const child of Array.from(node.childNodes)) {
    const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted, depth + 1);
    if (domElement) nodeData.children.push(domElement);
  }
}
```

## 4. 跨域限制处理

### 问题背景
- 某些页面可能无法注入脚本
- 某些 iframe 无法访问

### 处理策略

#### 4.1 脚本注入检查

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::injectBuildDomTreeScripts()`

```typescript
export async function injectBuildDomTreeScripts(tabId: number) {
  // 检查哪些 frame 已注入
  const injectedFrames = await scriptInjectedFrames(tabId);
  
  // 如果所有 frame 都已注入，直接返回
  if (Array.from(injectedFrames.values()).every(injected => injected)) {
    return;
  }
  
  // 只注入未注入的 frames
  const frameIdsToInject = Array.from(injectedFrames.keys()).filter(id => !injectedFrames.get(id));
  if (frameIdsToInject.length > 0) {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: frameIdsToInject },
      files: ['buildDomTree.js'],
    });
  }
}
```

#### 4.2 错误处理

在 `_buildDomTree()` 中：
```typescript
const mainFrameResult = await chrome.scripting.executeScript({
  target: { tabId },
  func: args => {
    return window.buildDomTree(args);
  },
  args: [...],
});

let mainFramePage = mainFrameResult[0]?.result as unknown as BuildDomTreeResult;
if (!mainFramePage || !mainFramePage.map || !mainFramePage.rootId) {
  throw new Error('Failed to build DOM tree: No result returned or invalid structure');
}
```

## 5. 性能优化场景

### 5.1 视口外元素过滤

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

早期退出优化：
```javascript
// 早期视口检查 - 只过滤明显在视口外的元素
if (viewportExpansion !== -1 && !node.shadowRoot) {
  const rect = getCachedBoundingRect(node);
  const style = getCachedComputedStyle(node);
  const isFixedOrSticky = style && (style.position === 'fixed' || style.position === 'sticky');
  const hasSize = node.offsetWidth > 0 || node.offsetHeight > 0;
  
  if (
    !rect ||
    (!isFixedOrSticky &&
      !hasSize &&
      (rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion))
  ) {
    return null;  // 提前退出
  }
}
```

### 5.2 缓存机制

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

```javascript
const DOM_CACHE = {
  boundingRects: new WeakMap(),
  clientRects: new WeakMap(),
  computedStyles: new WeakMap(),
  clearCache: () => {
    DOM_CACHE.boundingRects = new WeakMap();
    DOM_CACHE.clientRects = new WeakMap();
    DOM_CACHE.computedStyles = new WeakMap();
  },
};

// 使用缓存
function getCachedBoundingRect(element) {
  if (DOM_CACHE.boundingRects.has(element)) {
    return DOM_CACHE.boundingRects.get(element);
  }
  const rect = element.getBoundingClientRect();
  if (rect) {
    DOM_CACHE.boundingRects.set(element, rect);
  }
  return rect;
}
```

### 5.3 XPath 缓存

```javascript
const xpathCache = new WeakMap();

function getXPathTree(element, stopAtBoundary = true) {
  if (xpathCache.has(element)) return xpathCache.get(element);
  // ... 计算 xpath
  xpathCache.set(element, result);
  return result;
}
```

## 6. 特殊元素处理

### 6.1 空锚标签

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js`

```javascript
// 跳过没有尺寸和子元素的空锚标签
if (nodeData.tagName === 'a' && nodeData.children.length === 0 && !nodeData.attributes.href) {
  const rect = getCachedBoundingRect(node);
  const hasSize = (rect && rect.width > 0 && rect.height > 0) || 
                  node.offsetWidth > 0 || 
                  node.offsetHeight > 0;
  if (!hasSize) {
    return null;
  }
}
```

### 6.2 ARIA 菜单容器

即使不是顶层元素，也检查交互性：
```javascript
// 特殊处理 ARIA 菜单容器 - 即使不是顶层元素也检查交互性
const role = node.getAttribute('role');
const isMenuContainer = role === 'menu' || role === 'menubar' || role === 'listbox';

if (nodeData.isTopElement || isMenuContainer) {
  nodeData.isInteractive = isInteractiveElement(node);
  nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted);
}
```

## 总结

特殊场景处理的关键点：

1. **iframe**：主 frame 尝试访问 → 检测失败 → 单独处理 → 合并树结构
2. **Shadow DOM**：强制 open 模式 → 递归遍历 → 特殊顶层判断
3. **富文本编辑器**：识别特殊标识 → 处理所有子节点
4. **跨域限制**：检查注入状态 → 错误处理 → 降级策略
5. **性能优化**：早期退出 → 缓存机制 → 批量操作
6. **特殊元素**：空锚标签过滤 → ARIA 菜单特殊处理

