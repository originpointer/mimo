# Nanobrowser 元素圈定机制 - 判断标准

## 概述

元素必须同时满足以下 5 个条件才会被圈定：
1. 必须是交互元素
2. 必须是可见的
3. 必须是顶层元素
4. 必须在视口内
5. 必须是独立交互（如果父元素已被圈定）

## 1. 交互性判断 (`isInteractiveElement`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isInteractiveElement()`

### 判断标准

#### 1.1 交互式光标
如果元素的 `cursor` 样式为以下之一，认为是交互的：
- `pointer`, `move`, `text`, `grab`, `grabbing`
- `cell`, `copy`, `alias`, `all-scroll`
- `col-resize`, `row-resize`, `e-resize`, `w-resize` 等
- `crosshair`, `help`, `zoom-in`, `zoom-out` 等

**排除**：`not-allowed`, `no-drop`, `wait`, `progress`

#### 1.2 标准交互标签
以下标签默认是交互的（除非被禁用）：
- `a`, `button`, `input`, `select`, `textarea`
- `details`, `summary`, `label`
- `option`, `optgroup`, `fieldset`, `legend`

**禁用检查**：
- `disabled` 属性
- `readonly` 属性
- `inert` 属性
- `cursor: not-allowed` 样式

#### 1.3 ARIA Role
以下 ARIA role 被认为是交互的：
- `button`, `link`, `menuitem`, `menuitemradio`, `menuitemcheckbox`
- `radio`, `checkbox`, `tab`, `switch`, `slider`
- `spinbutton`, `combobox`, `searchbox`, `textbox`
- `listbox`, `option`, `scrollbar`

#### 1.4 ContentEditable
- `contenteditable="true"` 属性
- `element.isContentEditable === true`

#### 1.5 事件监听器
检查元素是否有以下事件监听器：
- `click`, `mousedown`, `mouseup`, `dblclick`
- `keydown`, `keyup`, `submit`, `change`, `input`
- `focus`, `blur`

**检查方式**：
- `window.getEventListeners(element)`（如果可用）
- `element.onclick` 属性
- `onclick`, `onmousedown` 等内联事件属性

#### 1.6 启发式判断 (`isHeuristicallyInteractive`)
对于嵌套在已知交互容器中的元素，如果满足：
- 有交互属性（`role`, `tabindex`, `onclick`）
- 有交互类名（包含 `btn`, `clickable`, `menu`, `item` 等）
- 在已知容器内（`button`, `a`, `.menu`, `.dropdown` 等）
- 有可见子元素
- 父元素不是 `<body>`

## 2. 可见性判断 (`isElementVisible`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isElementVisible()`

### 判断标准
```javascript
element.offsetWidth > 0 && 
element.offsetHeight > 0 && 
style.visibility !== 'hidden' && 
style.display !== 'none'
```

## 3. 顶层元素判断 (`isTopElement`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isTopElement()`

### 判断逻辑

#### 3.1 视口检查
- 使用 `getClientRects()` 获取元素的所有矩形区域
- 检查是否至少有一个矩形在扩展视口内（考虑 `viewportExpansion`）

#### 3.2 顶层检查
在元素的中心点和关键角点使用 `document.elementFromPoint(x, y)` 检查：
- 中心点：`rect.left + rect.width/2, rect.top + rect.height/2`
- 左上角：`rect.left + 5, rect.top + 5`
- 右下角：`rect.right - 5, rect.bottom - 5`

如果从该点向上遍历 DOM 树能找到当前元素，则认为是顶层。

#### 3.3 特殊处理
- **iframe 内元素**：默认认为是顶层
- **Shadow DOM**：使用 `shadowRoot.elementFromPoint()` 检查
- **viewportExpansion === -1**：所有元素都认为是顶层

## 4. 视口内判断 (`isInExpandedViewport`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isInExpandedViewport()`

### 判断逻辑

#### 4.1 扩展视口计算
```javascript
expandedTop = -viewportExpansion
expandedBottom = window.innerHeight + viewportExpansion
expandedLeft = -viewportExpansion
expandedRight = window.innerWidth + viewportExpansion
```

#### 4.2 矩形检查
使用 `getClientRects()` 获取所有矩形，检查是否至少有一个矩形在扩展视口内。

#### 4.3 特殊值
- `viewportExpansion === -1`：所有元素都认为在视口内

## 5. 独立交互判断 (`isElementDistinctInteraction`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::isElementDistinctInteraction()`

### 目的
避免嵌套交互元素的重复圈定。如果父元素已被圈定，子元素必须是"独立交互"才会被圈定。

### 判断标准

#### 5.1 标准交互标签
以下标签总是被认为是独立交互：
- `a`, `button`, `input`, `select`, `textarea`, `summary`, `details`, `label`, `option`

#### 5.2 iframe
`iframe` 标签总是被认为是独立边界。

#### 5.3 交互式 ARIA Role
同 `isInteractiveElement` 中的 ARIA role 列表。

#### 5.4 ContentEditable
`contenteditable="true"` 的元素。

#### 5.5 测试属性
- `data-testid`, `data-cy`, `data-test`

#### 5.6 事件监听器
有交互事件监听器的元素。

#### 5.7 启发式判断
如果 `isHeuristicallyInteractive()` 返回 true，也认为是独立交互。

## 综合判断流程 (`handleHighlighting`)

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/public/buildDomTree.js::handleHighlighting()`

### 判断流程

```javascript
function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
  // 1. 必须是交互元素
  if (!nodeData.isInteractive) return false;
  
  // 2. 判断是否应该圈定
  let shouldHighlight = false;
  if (!isParentHighlighted) {
    // 父元素未被圈定，可以圈定
    shouldHighlight = true;
  } else {
    // 父元素已被圈定，必须是独立交互
    if (isElementDistinctInteraction(node)) {
      shouldHighlight = true;
    }
  }
  
  // 3. 检查视口
  if (shouldHighlight) {
    nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
    
    // 4. 分配 highlightIndex 并高亮
    if (nodeData.isInViewport || viewportExpansion === -1) {
      nodeData.highlightIndex = highlightIndex++;
      highlightElement(node, nodeData.highlightIndex, parentIframe);
      return true;
    }
  }
  
  return false;
}
```

### 调用时机
在 `buildDomTree()` 中，当元素满足以下条件时调用：
- `nodeData.isVisible === true`
- `nodeData.isTopElement === true` 或 `isMenuContainer === true`

## 关键判断函数索引

| 函数名 | 文件位置 | 作用 |
|--------|----------|------|
| `isInteractiveElement` | `buildDomTree.js` | 判断元素是否可交互 |
| `isElementVisible` | `buildDomTree.js` | 判断元素是否可见 |
| `isTopElement` | `buildDomTree.js` | 判断元素是否顶层 |
| `isInExpandedViewport` | `buildDomTree.js` | 判断元素是否在视口内 |
| `isElementDistinctInteraction` | `buildDomTree.js` | 判断元素是否独立交互 |
| `isHeuristicallyInteractive` | `buildDomTree.js` | 启发式判断交互性 |
| `handleHighlighting` | `buildDomTree.js` | 综合判断并执行圈定 |

