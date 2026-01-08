# Stagehand DOM 序列化 - CDP 方法分析

## 概述

本文档详细分析 Stagehand v3 DOM 序列化过程中使用的 CDP（Chrome DevTools Protocol）方法，包括方法用途、调用位置和依赖关系。

## 核心 CDP 方法清单

### Accessibility 域

#### 1. Accessibility.enable

**用途**：启用 Accessibility 域，允许调用可访问性相关方法。

**调用位置**（基于 `.refer/verification/inventory/cdp_methods_inventory.md`）：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`

**当前项目实现**：
- `.refer/server/routes/control/observe.post.ts:85` - 已实现

**参数**：
```typescript
Accessibility.enable({})
```

**返回值**：
```typescript
{ ok: true } // 成功时
```

#### 2. Accessibility.getFullAXTree

**用途**：获取完整的可访问性树，包含页面的所有可访问性节点及其属性。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`

**当前项目实现**：
- `.refer/server/routes/control/observe.post.ts:86` - 已实现

**参数**：
```typescript
Accessibility.getFullAXTree({
  depth?: number,  // 可选，遍历深度
  frameId?: string // 可选，指定 frame
})
```

**返回值结构**：
```typescript
{
  nodes: Array<{
    nodeId: string;
    ignored: boolean;
    role?: { type: string; value: string };
    chromeRole?: { type: string; value: string };
    name?: { type: string; value: string };
    description?: { type: string; value: string };
    value?: { type: string; value: string };
    properties?: Array<{ name: string; value: { type: string; value: any } }>;
    parentId?: string;
    childIds?: string[];
    backendDOMNodeId?: number; // 关联到 DOM 节点
  }>;
}
```

**关键字段说明**：
- `nodeId`: 可访问性节点的唯一标识
- `backendDOMNodeId`: 关联到 DOM 节点的 backendNodeId（用于建立映射）
- `role`: 元素的语义角色（button, link, textbox 等）
- `name`: 元素的名称（通常是可见文本或 aria-label）
- `properties`: 其他属性（如 href, value 等）

### DOM 域

#### 3. DOM.enable

**用途**：启用 DOM 域，允许调用 DOM 相关方法。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/coordinateResolver.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/focusSelectors.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frameLocator.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/locator.ts`

**当前项目实现**：
- `.refer/server/utils/control/driverAdapter.ts` - 封装在 `getDocument` 等方法中

**参数**：
```typescript
DOM.enable({})
```

#### 4. DOM.getDocument

**用途**：获取 DOM 文档树结构，返回根节点。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`

**当前项目实现**：
- `.refer/server/utils/control/driverAdapter.ts:237` - `getDocument()` 方法
- `.refer/server/routes/control/observe.post.ts:64` - 已使用

**参数**：
```typescript
DOM.getDocument({
  depth?: number,  // 可选，遍历深度（0 = 仅根节点，-1 = 完整树）
  pierce?: boolean // 可选，是否穿透 shadow DOM
})
```

**返回值结构**：
```typescript
{
  root: {
    nodeId: number;        // DOM 节点 ID
    backendNodeId: number; // 后端节点 ID（用于关联）
    nodeType: number;      // 节点类型（1=Element, 3=Text 等）
    nodeName: string;      // 节点名称（如 "HTML", "DIV"）
    localName?: string;    // 本地名称
    nodeValue?: string;    // 文本节点的值
    childNodeCount?: number; // 子节点数量
    children?: Array<Node>;   // 子节点（如果 depth > 0）
    attributes?: string[];   // 属性数组 [name1, value1, name2, value2, ...]
    // ... 其他字段
  }
}
```

**关键字段说明**：
- `nodeId`: 当前会话中的节点 ID（可能变化）
- `backendNodeId`: 后端节点 ID（稳定，用于跨会话引用）
- `nodeType`: 1=Element, 3=Text, 8=Comment 等
- `attributes`: 属性数组，偶数索引为名称，奇数索引为值

#### 5. DOM.describeNode

**用途**：描述节点的详细信息，包括属性、样式、布局等。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/a11yTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/focusSelectors.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frameLocator.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/locator.ts`

**当前项目实现**：
- 未直接实现，但可通过 `driverAdapter.send()` 调用

**参数**：
```typescript
DOM.describeNode({
  nodeId?: number,           // 节点 ID（二选一）
  backendNodeId?: number,    // 后端节点 ID（二选一）
  depth?: number,            // 可选，包含子节点的深度
  pierce?: boolean           // 可选，是否穿透 shadow DOM
})
```

**返回值结构**：
```typescript
{
  node: {
    nodeId: number;
    backendNodeId: number;
    nodeType: number;
    nodeName: string;
    localName?: string;
    nodeValue?: string;
    childNodeCount?: number;
    children?: Array<Node>;
    attributes?: string[];
    // ... 其他字段
  }
}
```

**使用场景**：
- 获取节点的完整信息（包括子节点）
- 关联可访问性节点和 DOM 节点
- 解析选择器对应的节点

#### 6. DOM.getBoxModel

**用途**：获取节点的布局框模型信息，用于判断元素是否可滚动。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/locator.ts`

**当前项目实现**：
- 未直接实现，但可通过 `driverAdapter.send()` 调用

**参数**：
```typescript
DOM.getBoxModel({
  nodeId?: number,
  backendNodeId?: number
})
```

**返回值结构**：
```typescript
{
  model: {
    content: Array<number>;  // 内容框坐标 [x1, y1, x2, y2, ...]
    padding: Array<number>;   // 内边距框坐标
    border: Array<number>;    // 边框坐标
    margin: Array<number>;    // 外边距坐标
    width: number;
    height: number;
  }
}
```

**使用场景**：
- 判断元素是否可滚动（通过比较 content 和 border 尺寸）
- 获取元素坐标（用于坐标点击）

#### 7. DOM.getFrameOwner

**用途**：获取包含指定 frame 的 iframe 元素信息。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/activeElement.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/capture.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/coordinateResolver.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/domTree.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/focusSelectors.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frameLocator.ts`

**当前项目实现**：
- 未实现

**参数**：
```typescript
DOM.getFrameOwner({
  frameId: string
})
```

**返回值结构**：
```typescript
{
  backendNodeId: number;  // iframe 元素的后端节点 ID
  nodeId?: number;        // 节点 ID（如果可用）
}
```

**使用场景**：
- 计算 iframe 的 XPath 前缀
- 关联 frame 和其宿主 iframe 元素

#### 8. DOM.querySelector

**用途**：在指定节点下查询选择器匹配的第一个元素。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`

**当前项目实现**：
- `.refer/server/utils/control/driverAdapter.ts:260` - 在 `querySelector()` 方法中使用

**参数**：
```typescript
DOM.querySelector({
  nodeId: number,      // 查询的根节点
  selector: string     // CSS 选择器
})
```

**返回值结构**：
```typescript
{
  nodeId: number      // 匹配的节点 ID
}
```

#### 9. DOM.resolveNode

**用途**：从 nodeId 或 backendNodeId 解析为 Runtime.RemoteObject，用于执行脚本。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/coordinateResolver.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/xpathUtils.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/locator.ts`

**当前项目实现**：
- 未直接实现

**参数**：
```typescript
DOM.resolveNode({
  nodeId?: number,
  backendNodeId?: number,
  executionContextId?: number  // 可选，执行上下文 ID
})
```

**返回值结构**：
```typescript
{
  object: {
    type: string;      // "object"
    subtype?: string; // "node"
    objectId: string;  // 对象 ID，可用于 Runtime 方法
    // ... 其他字段
  }
}
```

**使用场景**：
- 将 DOM 节点转换为 Runtime 对象，用于执行脚本
- 获取节点的计算样式或其他运行时属性

### Runtime 域

#### 10. Runtime.enable

**用途**：启用 Runtime 域，允许执行脚本和访问对象。

**调用位置**：
- 多个文件（广泛使用）

**当前项目实现**：
- 未直接实现，但可能在其他地方已启用

#### 11. Runtime.evaluate

**用途**：在指定执行上下文中执行 JavaScript 表达式。

**调用位置**：
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/activeElement.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/coordinateResolver.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot/focusSelectors.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/frame.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/page.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/piercer.ts`
- `.sources/stagehand/packages/core/lib/v3/understudy/selectorResolver.ts`

**当前项目实现**：
- 未直接实现

**参数**：
```typescript
Runtime.evaluate({
  expression: string,           // JavaScript 表达式
  objectGroup?: string,         // 可选，对象组
  includeCommandLineAPI?: boolean, // 可选，包含命令行 API
  silent?: boolean,            // 可选，静默执行
  returnByValue?: boolean,      // 可选，按值返回
  generatePreview?: boolean,    // 可选，生成预览
  userGesture?: boolean,        // 可选，用户手势
  awaitPromise?: boolean,       // 可选，等待 Promise
  executionContextId?: number,  // 可选，执行上下文 ID
  throwOnSideEffect?: boolean   // 可选，副作用时抛出
})
```

**使用场景**：
- 执行选择器解析脚本
- 获取元素的运行时属性
- 计算 XPath 表达式

## CDP 方法调用顺序

### 标准序列化流程

```
1. DOM.enable()
2. Accessibility.enable()
3. DOM.getDocument({ depth: -1, pierce: true })
   └─> 如果需要子节点详细信息：
       └─> DOM.describeNode({ nodeId, depth: -1, pierce: true })
4. Accessibility.getFullAXTree({ depth: -1 })
5. 关联 AX 节点和 DOM 节点：
   └─> DOM.describeNode({ backendNodeId: axNode.backendDOMNodeId })
6. 计算 frame 前缀（如果有 iframe）：
   └─> DOM.getFrameOwner({ frameId })
       └─> DOM.describeNode({ backendNodeId })
           └─> 生成 XPath
```

### 聚焦快照流程（focusSelector）

```
1. DOM.enable()
2. DOM.getDocument({ depth: 0 })
3. DOM.querySelector({ nodeId: root.nodeId, selector })
4. DOM.describeNode({ nodeId: matchedNode.nodeId, depth: -1 })
5. 仅获取匹配节点及其子树的快照
```

## 依赖关系图

```
captureHybridSnapshot
  ├─> DOM.enable (必需)
  ├─> Accessibility.enable (必需)
  ├─> DOM.getDocument (必需)
  │   └─> DOM.describeNode (可选，用于获取详细信息)
  ├─> Accessibility.getFullAXTree (必需)
  ├─> DOM.getFrameOwner (可选，用于多 frame)
  │   └─> DOM.describeNode (用于获取 iframe XPath)
  └─> Runtime.evaluate (可选，用于 XPath 计算)
```

## 当前项目实现状态

### 已实现的 CDP 方法

| 方法 | 实现位置 | 状态 |
|------|---------|------|
| `DOM.enable` | `.refer/server/utils/control/driverAdapter.ts` | ✅ 间接实现 |
| `DOM.getDocument` | `.refer/server/utils/control/driverAdapter.ts:237` | ✅ 已实现 |
| `Accessibility.enable` | `.refer/server/routes/control/observe.post.ts:85` | ✅ 已实现 |
| `Accessibility.getFullAXTree` | `.refer/server/routes/control/observe.post.ts:86` | ✅ 已实现 |

### 未实现的 CDP 方法

| 方法 | 用途 | 优先级 |
|------|------|--------|
| `DOM.describeNode` | 获取节点详细信息 | 高 |
| `DOM.getFrameOwner` | 获取 iframe 宿主元素 | 高（多 frame 支持） |
| `DOM.getBoxModel` | 判断可滚动性 | 中 |
| `DOM.resolveNode` | 转换为 Runtime 对象 | 中 |
| `Runtime.evaluate` | 执行脚本 | 低（XPath 计算） |

## 实现建议

### 阶段 1：基础方法

1. **封装 `DOM.describeNode`**
   - 在 `driverAdapter.ts` 中添加 `describeNode()` 方法
   - 支持 `nodeId` 和 `backendNodeId` 两种方式

2. **封装 `DOM.getFrameOwner`**
   - 在 `driverAdapter.ts` 中添加 `getFrameOwner()` 方法
   - 用于多 frame 环境

### 阶段 2：增强方法

3. **封装 `DOM.getBoxModel`**
   - 用于判断元素可滚动性
   - 可选实现

4. **封装 `Runtime.evaluate`**
   - 用于执行 XPath 计算脚本
   - 可选实现

## 注意事项

1. **Session 管理**：不同 frame 可能属于不同的 CDP session，需要正确传递 `sessionId`
2. **异步处理**：所有 CDP 调用都是异步的，需要正确处理 Promise 链
3. **错误处理**：CDP 调用可能失败，需要处理错误情况
4. **性能考虑**：`DOM.getDocument` 和 `Accessibility.getFullAXTree` 可能返回大量数据，需要考虑性能
5. **深度参数**：`depth: -1` 获取完整树，`depth: 0` 仅根节点，需要根据场景选择

