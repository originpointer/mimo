# Nanobrowser 元素圈定机制 - 视觉表现实现

## 概述

元素圈定的视觉表现包括：
1. 高亮覆盖层（overlay）
2. 编号标签（label）
3. 动态位置更新

## 1. 高亮容器

### 容器创建

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::highlightElement()`

```javascript
const HIGHLIGHT_CONTAINER_ID = 'playwright-highlight-container';

function highlightElement(element, index, parentIframe = null) {
  // 创建或获取高亮容器
  let container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = HIGHLIGHT_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '2147483647';  // 最大 z-index
    container.style.backgroundColor = 'transparent';
    container.style.display = showHighlightElements ? 'block' : 'none';
    document.body.appendChild(container);
  }
}
```

### 容器特性
- **固定定位**：`position: fixed`，相对于视口
- **不拦截事件**：`pointerEvents: 'none'`，不影响页面交互
- **最高层级**：`zIndex: 2147483647`（32 位整数最大值）
- **全屏覆盖**：`width: 100%`, `height: 100%`
- **可控制显示**：通过 `showHighlightElements` 参数控制

## 2. 高亮覆盖层

### 创建覆盖层

```javascript
function highlightElement(element, index, parentIframe = null) {
  // 获取元素的所有 client rects
  const rects = element.getClientRects();
  if (!rects || rects.length === 0) return index;
  
  // 生成颜色
  const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#008080',
    '#FF69B4', '#4B0082', '#FF4500', '#2E8B57', '#DC143C', '#4682B4',
  ];
  const colorIndex = index % colors.length;
  const baseColor = colors[colorIndex];
  const backgroundColor = baseColor + '1A';  // 10% 透明度
  
  // 获取 iframe 偏移（如果有）
  let iframeOffset = { x: 0, y: 0 };
  if (parentIframe) {
    const iframeRect = parentIframe.getBoundingClientRect();
    iframeOffset.x = iframeRect.left;
    iframeOffset.y = iframeRect.top;
  }
  
  // 为每个 rect 创建覆盖层
  const fragment = document.createDocumentFragment();
  for (const rect of rects) {
    if (rect.width === 0 || rect.height === 0) continue;
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.border = `2px solid ${baseColor}`;
    overlay.style.backgroundColor = backgroundColor;
    overlay.style.pointerEvents = 'none';
    overlay.style.boxSizing = 'border-box';
    
    const top = rect.top + iframeOffset.y;
    const left = rect.left + iframeOffset.x;
    
    overlay.style.top = `${top}px`;
    overlay.style.left = `${left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    
    fragment.appendChild(overlay);
    overlays.push({ element: overlay, initialRect: rect });
  }
  
  container.appendChild(fragment);
}
```

### 覆盖层特性
- **多矩形支持**：使用 `getClientRects()` 处理换行文本等复杂布局
- **颜色循环**：12 种颜色循环使用，根据 `index` 选择
- **透明度**：背景色 10% 透明度（`1A` = 26/255 ≈ 10%）
- **边框**：2px 实线边框，使用完整颜色
- **iframe 偏移**：考虑 iframe 在页面中的位置

## 3. 编号标签

### 创建标签

```javascript
function highlightElement(element, index, parentIframe = null) {
  // 创建编号标签
  const firstRect = rects[0];
  label = document.createElement('div');
  label.className = 'playwright-highlight-label';
  label.style.position = 'fixed';
  label.style.background = baseColor;
  label.style.color = 'white';
  label.style.padding = '1px 4px';
  label.style.borderRadius = '4px';
  label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
  label.textContent = index.toString();
  
  // 计算标签位置
  labelWidth = label.offsetWidth > 0 ? label.offsetWidth : 20;
  labelHeight = label.offsetHeight > 0 ? label.offsetHeight : 16;
  
  const firstRectTop = firstRect.top + iframeOffset.y;
  const firstRectLeft = firstRect.left + iframeOffset.x;
  
  let labelTop = firstRectTop + 2;
  let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;
  
  // 如果元素太小，标签放在上方
  if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
    labelTop = firstRectTop - labelHeight - 2;
    labelLeft = firstRectLeft + firstRect.width - labelWidth;
    if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft;
  }
  
  // 确保标签在视口内
  labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
  labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));
  
  label.style.top = `${labelTop}px`;
  label.style.left = `${labelLeft}px`;
  
  fragment.appendChild(label);
}
```

### 标签特性
- **自适应字体**：根据元素高度调整，范围 8-12px
- **智能定位**：
  - 默认：元素右上角
  - 元素太小：元素上方
  - 边界检查：确保在视口内
- **样式**：彩色背景、白色文字、圆角边框

## 4. 动态位置更新

### 更新机制

```javascript
function highlightElement(element, index, parentIframe = null) {
  // 更新位置的函数
  const updatePositions = () => {
    const newRects = element.getClientRects();
    let newIframeOffset = { x: 0, y: 0 };
    
    if (parentIframe) {
      const iframeRect = parentIframe.getBoundingClientRect();
      newIframeOffset.x = iframeRect.left;
      newIframeOffset.y = iframeRect.top;
    }
    
    // 更新每个覆盖层
    overlays.forEach((overlayData, i) => {
      if (i < newRects.length) {
        const newRect = newRects[i];
        const newTop = newRect.top + newIframeOffset.y;
        const newLeft = newRect.left + newIframeOffset.x;
        
        overlayData.element.style.top = `${newTop}px`;
        overlayData.element.style.left = `${newLeft}px`;
        overlayData.element.style.width = `${newRect.width}px`;
        overlayData.element.style.height = `${newRect.height}px`;
        overlayData.element.style.display = newRect.width === 0 || newRect.height === 0 ? 'none' : 'block';
      } else {
        overlayData.element.style.display = 'none';
      }
    });
    
    // 更新标签位置
    if (label && newRects.length > 0) {
      const firstNewRect = newRects[0];
      const firstNewRectTop = firstNewRect.top + newIframeOffset.y;
      const firstNewRectLeft = firstNewRect.left + newIframeOffset.x;
      
      let newLabelTop = firstNewRectTop + 2;
      let newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth - 2;
      
      if (firstNewRect.width < labelWidth + 4 || firstNewRect.height < labelHeight + 4) {
        newLabelTop = firstNewRectTop - labelHeight - 2;
        newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth;
        if (newLabelLeft < newIframeOffset.x) newLabelLeft = firstNewRectLeft;
      }
      
      newLabelTop = Math.max(0, Math.min(newLabelTop, window.innerHeight - labelHeight));
      newLabelLeft = Math.max(0, Math.min(newLabelLeft, window.innerWidth - labelWidth));
      
      label.style.top = `${newLabelTop}px`;
      label.style.left = `${newLabelLeft}px`;
      label.style.display = 'block';
    } else if (label) {
      label.style.display = 'none';
    }
  };
  
  // 节流函数
  const throttleFunction = (func, delay) => {
    let lastCall = 0;
    return (...args) => {
      const now = performance.now();
      if (now - lastCall < delay) return;
      lastCall = now;
      return func(...args);
    };
  };
  
  const throttledUpdatePositions = throttleFunction(updatePositions, 16);  // ~60fps
  
  // 监听事件
  window.addEventListener('scroll', throttledUpdatePositions, true);
  window.addEventListener('resize', throttledUpdatePositions);
  
  // 清理函数
  cleanupFn = () => {
    window.removeEventListener('scroll', throttledUpdatePositions, true);
    window.removeEventListener('resize', throttledUpdatePositions);
    overlays.forEach(overlay => overlay.element.remove());
    if (label) label.remove();
  };
  
  // 存储清理函数
  if (cleanupFn) {
    (window._highlightCleanupFunctions = window._highlightCleanupFunctions || []).push(cleanupFn);
  }
}
```

### 更新特性
- **实时更新**：监听 `scroll` 和 `resize` 事件
- **节流优化**：16ms 间隔（约 60fps），避免过度更新
- **多矩形处理**：处理 rect 数量变化的情况
- **自动隐藏**：rect 为 0 时自动隐藏覆盖层和标签

## 5. 高亮移除

### 移除实现

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/service.ts::removeHighlights()`

```typescript
export async function removeHighlights(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        // 移除高亮容器及其所有内容
        const container = document.getElementById('playwright-highlight-container');
        if (container) {
          container.remove();
        }
        
        // 移除元素上的高亮属性
        const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
        for (const el of Array.from(highlightedElements)) {
          el.removeAttribute('browser-user-highlight-id');
        }
      },
    });
  } catch (error) {
    logger.error('Failed to remove highlights:', error);
  }
}
```

### 调用时机

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts::removeHighlight()`

```typescript
async removeHighlight(): Promise<void> {
  if (this._config.displayHighlights && this._validWebPage) {
    await _removeHighlights(this._tabId);
  }
}
```

在 `_updateState()` 中，每次更新状态前先移除旧的高亮：
```typescript
async _updateState(useVision = false, focusElement = -1): Promise<PageState> {
  try {
    await this.removeHighlight();  // 先移除旧高亮
    
    const displayHighlights = this._config.displayHighlights || useVision;
    const content = await this.getClickableElements(displayHighlights, focusElement);
    // ...
  }
}
```

## 6. 焦点元素高亮

### 焦点模式

当 `focusHighlightIndex >= 0` 时，只高亮指定的元素：

```javascript
window.buildDomTree = (args) => {
  const { focusHighlightIndex } = args;
  // ...
  
  function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
    // ...
    if (doHighlightElements) {
      if (focusHighlightIndex >= 0) {
        if (focusHighlightIndex === nodeData.highlightIndex) {
          highlightElement(node, nodeData.highlightIndex, parentIframe);
        }
      } else {
        highlightElement(node, nodeData.highlightIndex, parentIframe);
      }
    }
  }
};
```

### 使用场景
- 调试特定元素
- 减少视觉干扰
- 性能优化（只高亮一个元素）

## 7. 颜色方案

### 颜色列表
```javascript
const colors = [
  '#FF0000',  // 红色
  '#00FF00',  // 绿色
  '#0000FF',  // 蓝色
  '#FFA500',  // 橙色
  '#800080',  // 紫色
  '#008080',  // 青色
  '#FF69B4',  // 粉红色
  '#4B0082',  // 靛蓝色
  '#FF4500',  // 橙红色
  '#2E8B57',  // 海绿色
  '#DC143C',  // 深红色
  '#4682B4',  // 钢蓝色
];
```

### 颜色选择
```javascript
const colorIndex = index % colors.length;
const baseColor = colors[colorIndex];
const backgroundColor = baseColor + '1A';  // 添加透明度
```

- **循环使用**：12 种颜色循环，确保相邻元素颜色不同
- **高对比度**：选择高对比度颜色，便于识别
- **透明度**：背景使用 10% 透明度，不遮挡内容

## 8. 性能优化

### 8.1 DocumentFragment
使用 `DocumentFragment` 批量添加 DOM 元素，减少重排：
```javascript
const fragment = document.createDocumentFragment();
// ... 添加所有覆盖层和标签到 fragment
container.appendChild(fragment);  // 一次性添加
```

### 8.2 事件节流
使用节流函数限制更新频率：
```javascript
const throttledUpdatePositions = throttleFunction(updatePositions, 16);  // ~60fps
```

### 8.3 条件显示
通过 `showHighlightElements` 控制是否显示：
```javascript
container.style.display = showHighlightElements ? 'block' : 'none';
```

## 总结

视觉表现实现的关键点：

1. **容器管理**：单一全局容器，固定定位，最高层级
2. **覆盖层**：多矩形支持，颜色循环，iframe 偏移处理
3. **编号标签**：智能定位，自适应字体，边界检查
4. **动态更新**：事件监听，节流优化，自动隐藏
5. **清理机制**：移除容器，清理事件监听器
6. **焦点模式**：支持只高亮特定元素
7. **性能优化**：DocumentFragment，事件节流，条件显示

