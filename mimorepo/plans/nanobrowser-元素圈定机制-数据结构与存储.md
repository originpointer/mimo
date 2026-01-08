# Nanobrowser 元素圈定机制 - 数据结构与存储

## 核心数据结构

### 1. DOMState

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/views.ts`

**定义**：
```typescript
export interface DOMState {
  elementTree: DOMElementNode;
  selectorMap: Map<number, DOMElementNode>;
}
```

**作用**：
- `elementTree`：完整的 DOM 树结构
- `selectorMap`：highlightIndex 到 DOMElementNode 的快速映射

### 2. DOMElementNode

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/views.ts`

**关键属性**：
```typescript
export class DOMElementNode extends DOMBaseNode {
  tagName: string | null;
  xpath: string | null;                    // 相对于最近 root 的 xpath
  attributes: Record<string, string>;
  children: DOMBaseNode[];                  // DOMElementNode 或 DOMTextNode
  isVisible: boolean;
  isInteractive: boolean;
  isTopElement: boolean;
  isInViewport: boolean;
  shadowRoot: boolean;
  highlightIndex: number | null;            // 唯一编号，从 0 开始
  viewportCoordinates?: CoordinateSet;
  pageCoordinates?: CoordinateSet;
  viewportInfo?: ViewportInfo;
  isNew: boolean | null;                     // 是否是新元素（通过 hash 比较）
  parent: DOMElementNode | null;
}
```

### 3. DOMTextNode

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/views.ts`

**定义**：
```typescript
export class DOMTextNode extends DOMBaseNode {
  type = 'TEXT_NODE' as const;
  text: string;
  isVisible: boolean;
  parent: DOMElementNode | null;
}
```

### 4. BuildDomTreeResult

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/raw_types.ts`

**定义**：
```typescript
export interface BuildDomTreeResult {
  rootId: string;
  map: Record<string, RawDomTreeNode>;
  perfMetrics?: PerformanceMetrics;
}
```

**作用**：从页面上下文返回给 background 的原始数据

### 5. RawDomTreeNode / RawDomElementNode

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/raw_types.ts`

**定义**：
```typescript
export type RawDomTreeNode = RawDomElementNode | RawDomTextNode;

export interface RawDomElementNode {
  tagName: string;
  attributes: Record<string, string>;
  xpath: string;
  children: string[];                       // 子节点 ID 数组
  isVisible?: boolean;
  isTopElement?: boolean;
  isInteractive?: boolean;
  isInViewport?: boolean;
  highlightIndex?: number;
  shadowRoot?: boolean;
}

export interface RawDomTextNode {
  type: 'TEXT_NODE';
  text: string;
  isVisible: boolean;
}
```

## 数据转换流程

### 1. 页面上下文 → Background

**在 buildDomTree.js 中**：
```javascript
const DOM_HASH_MAP = {};  // Record<string, RawDomElementNode | RawDomTextNode>
const rootId = buildDomTree(document.body);
return { rootId, map: DOM_HASH_MAP };
```

### 2. Background 解析

**在 service.ts::_constructDomTree() 中**：
```typescript
function _constructDomTree(evalPage: BuildDomTreeResult): [DOMElementNode, Map<number, DOMElementNode>] {
  const jsNodeMap = evalPage.map;
  const jsRootId = evalPage.rootId;
  const selectorMap = new Map<number, DOMElementNode>();
  const nodeMap: Record<string, DOMBaseNode> = {};
  
  // 第一遍：创建所有节点
  for (const [id, nodeData] of Object.entries(jsNodeMap)) {
    const [node] = _parse_node(nodeData);
    if (node) {
      nodeMap[id] = node;
      // 添加到 selectorMap
      if (node instanceof DOMElementNode && node.highlightIndex !== null) {
        selectorMap.set(node.highlightIndex, node);
      }
    }
  }
  
  // 第二遍：构建树结构
  for (const [id, node] of Object.entries(nodeMap)) {
    if (node instanceof DOMElementNode) {
      const nodeData = jsNodeMap[id];
      const childrenIds = 'children' in nodeData ? nodeData.children : [];
      for (const childId of childrenIds) {
        if (childId in nodeMap) {
          const childNode = nodeMap[childId];
          childNode.parent = node;
          node.children.push(childNode);
        }
      }
    }
  }
  
  return [nodeMap[jsRootId] as DOMElementNode, selectorMap];
}
```

## 数据使用场景

### 1. 转换为文本供 LLM 使用

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/views.ts::clickableElementsToString()`

**格式**：
```
[0]<button type='submit'>提交</>
	[1]<input type='text' placeholder='请输入'>搜索</>
	[2]<a href='/about'>关于我们</>
```

**新元素标记**：
```
*[3]<button>新按钮</>  // * 表示这是新出现的元素
```

**关键代码**：
```typescript
clickableElementsToString(includeAttributes: string[] | null = null): string {
  const formattedText: string[] = [];
  const processNode = (node: DOMBaseNode, depth: number): void => {
    if (node instanceof DOMElementNode) {
      if (node.highlightIndex !== null) {
        const highlightIndicator = node.isNew ? `*[${node.highlightIndex}]` : `[${node.highlightIndex}]`;
        const text = node.getAllTextTillNextClickableElement();
        let line = `${depthStr}${highlightIndicator}<${node.tagName}`;
        // 添加属性和文本
        // ...
        formattedText.push(line);
      }
    }
    // 处理子节点
  };
  processNode(this, 0);
  return formattedText.join('\n');
}
```

### 2. 通过 highlightIndex 定位元素

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts::locateElement()`

**流程**：
```typescript
async locateElement(element: DOMElementNode): Promise<ElementHandle | null> {
  // 1. 处理 iframe 父元素
  const iframes = parents.reverse().filter(item => item.tagName === 'iframe');
  for (const parent of iframes) {
    const cssSelector = parent.enhancedCssSelectorForElement();
    const frameElement = await currentFrame.$(cssSelector);
    const frame = await frameElement.contentFrame();
    currentFrame = frame;
  }
  
  // 2. 生成选择器
  const cssSelector = element.enhancedCssSelectorForElement();
  
  // 3. 尝试 CSS 选择器
  let elementHandle = await currentFrame.$(cssSelector);
  
  // 4. 如果失败，尝试 XPath
  if (!elementHandle && element.xpath) {
    const xpathSelector = `::-p-xpath(${element.xpath})`;
    elementHandle = await currentFrame.$(xpathSelector);
  }
  
  return elementHandle;
}
```

### 3. 元素选择器生成

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/views.ts::enhancedCssSelectorForElement()`

**策略**：
1. 从 XPath 转换为 CSS 选择器
2. 添加 class 属性
3. 添加稳定的属性（id, name, type, aria-label 等）

**关键代码**：
```typescript
enhancedCssSelectorForElement(includeDynamicAttributes = true): string {
  // 1. 从 XPath 转换
  let cssSelector = this.convertSimpleXPathToCssSelector(this.xpath);
  
  // 2. 添加 class
  if (this.attributes.class && includeDynamicAttributes) {
    const classes = this.attributes.class.trim().split(/\s+/);
    for (const className of classes) {
      if (validClassNamePattern.test(className)) {
        cssSelector += `.${className}`;
      }
    }
  }
  
  // 3. 添加稳定属性
  const SAFE_ATTRIBUTES = new Set(['id', 'name', 'type', 'aria-label', ...]);
  for (const [attribute, value] of Object.entries(this.attributes)) {
    if (SAFE_ATTRIBUTES.has(attribute)) {
      cssSelector += `[${attribute}="${value}"]`;
    }
  }
  
  return cssSelector;
}
```

## 元素 Hash 机制

### 目的
用于判断元素是否是新出现的（`isNew` 属性）

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/dom/clickable/service.ts`

### Hash 组成
```typescript
async function hashDomElement(domElement: DOMElementNode): Promise<string> {
  const parentBranchPath = _getParentBranchPath(domElement);
  
  const [branchPathHash, attributesHash, xpathHash] = await Promise.all([
    _parentBranchPathHash(parentBranchPath),  // 父元素路径的 hash
    _attributesHash(domElement.attributes),    // 属性的 hash
    _xpathHash(domElement.xpath),              // xpath 的 hash
  ]);
  
  return `${branchPathHash}-${attributesHash}-${xpathHash}`;
}
```

### 使用场景

**在 Page.getState() 中**：
```typescript
if (cacheClickableElementsHashes) {
  if (this._cachedStateClickableElementsHashes?.url === updatedState.url) {
    const updatedStateClickableElements = ClickableElementProcessor.getClickableElements(updatedState.elementTree);
    
    // 标记新元素
    for (const domElement of updatedStateClickableElements) {
      const hash = await ClickableElementProcessor.hashDomElement(domElement);
      domElement.isNew = !this._cachedStateClickableElementsHashes.hashes.has(hash);
    }
  }
  
  // 缓存新的 hash
  const newHashes = await ClickableElementProcessor.getClickableElementsHashes(updatedState.elementTree);
  this._cachedStateClickableElementsHashes = new CachedStateClickableElementsHashes(updatedState.url, newHashes);
}
```

## 数据存储位置

### 1. Page 实例缓存

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/page.ts`

```typescript
export default class Page {
  private _state: PageState;                              // 当前状态
  private _cachedState: PageState | null = null;          // 缓存的状态
  private _cachedStateClickableElementsHashes: CachedStateClickableElementsHashes | null = null;
}
```

### 2. BrowserContext 管理

**文件位置**：`.refer/.sources/nanobrowser/chrome-extension/src/background/browser/context.ts`

```typescript
export default class BrowserContext {
  private _pages: Map<number, Page> = new Map();          // tabId -> Page
  private _currentTabId: number;
}
```

## 数据流转示例

### 完整流程

```
1. NavigatorAgent.act()
   ↓
2. BrowserContext.getState()
   ↓
3. Page.getState()
   ↓
4. Page._updateState()
   ↓
5. DOMService.getClickableElements()
   ↓
6. 页面上下文执行 buildDomTree()
   ↓ 返回 BuildDomTreeResult { rootId, map }
   ↓
7. _constructDomTree() 转换为 DOMElementNode 树
   ↓ 返回 DOMState { elementTree, selectorMap }
   ↓
8. 更新 Page._state
   ↓
9. 转换为文本：elementTree.clickableElementsToString()
   ↓
10. 传递给 LLM
```

### 元素定位流程

```
1. LLM 返回 action: { type: 'click', index: 5 }
   ↓
2. Page.getSelectorMap().get(5) 获取 DOMElementNode
   ↓
3. Page.locateElement(DOMElementNode)
   ↓
4. 生成 CSS 选择器或使用 XPath
   ↓
5. Puppeteer 定位元素
   ↓
6. 执行操作（click, type 等）
```

