# TabGroup 对象设计方案

## 目标
新增 `TabGroup` 对象，结合 Chrome `tabGroups` API 文档，确定构造函数、内部属性及方法。该对象将用于管理和同步浏览器标签组状态，并提供操作接口。

## 1. TabGroup 类定义

### 构造函数

```typescript
constructor(data: TabGroupState)
```

初始化时接收 `TabGroupState` 数据，与 `Tab` 对象的模式保持一致。

### 内部属性 (Properties)

基于 `TabGroupState` 和 Chrome API 定义：

*   `id`: `number` (组 ID)
*   `collapsed`: `boolean` (是否折叠)
*   `color`: `TabGroupColor` (组颜色)
*   `title`: `string | undefined` (组标题)
*   `windowId`: `number` (关联窗口 ID)

同时维护一个 `_controlCenter` 引用，用于执行操作（可选，或通过 SystemManager 代理）。

### 方法 (Methods)

#### 状态访问器 (Getters/Setters)
为上述属性提供 Getter，部分提供 Setter（触发更新事件）。

#### 同步方法
*   `updateFromState(state: TabGroupState)`: 从新的状态数据同步内部属性。

#### 操作方法 (通过 TwinControlCenter)
*   `update(properties: { collapsed?: boolean, color?: TabGroupColor, title?: string })`: 更新组属性。
*   `move(index: number, windowId?: number)`: 移动组。
*   `collapse(collapsed: boolean)`: 折叠/展开组。

### 事件 (Events)
继承 `EventEmitter`。
*   `updated`: 属性更新时触发。
*   `removed`: 组被移除时触发。

## 2. 编码方案

### 文件结构
*   `packages/@twin/chrome/src/tabGroup.ts`: 新建文件，定义 `TabGroup` 类。
*   `packages/@twin/chrome/src/index.ts`: 导出 `TabGroup`。
*   `packages/@twin/chrome/src/systemManager.ts`: 集成 `TabGroup` 管理逻辑 (Map<number, TabGroup>)。

### 依赖关系
*   引用 `src/types.ts` 中的 `TabGroupState`, `TabGroupColor`。
*   引用 `src/controlCenter.ts` 中的 `TwinControlCenter` (用于执行操作)。

## 3. 示例代码

```typescript
import { EventEmitter } from 'events';
import { TabGroupState, TabGroupColor } from './types';
import { TwinControlCenter } from './controlCenter';

export class TabGroup extends EventEmitter {
    private _state: TabGroupState;
    private _controlCenter?: TwinControlCenter;

    constructor(state: TabGroupState, controlCenter?: TwinControlCenter) {
        super();
        this._state = { ...state };
        this._controlCenter = controlCenter;
    }

    get id() { return this._state.id; }
    get collapsed() { return this._state.collapsed; }
    get color() { return this._state.color; }
    get title() { return this._state.title; }
    get windowId() { return this._state.windowId; }

    // ... methods
}
```

## 4. 后续任务
1. 创建 `src/tabGroup.ts`。
2. 更新 `SystemStateManager` 以使用 `TabGroup` 对象实例替代纯 State 对象（类似于 `Tab` 和 `Task`）。
3. 验证 `TabGroup` 的状态同步和操作执行。
