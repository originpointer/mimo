# 浏览器任务模型 (Browser Task Model)

对于浏览器任务，需要将任务限定在一个 task 任务对象上进行模型控制。

## Task 对象结构 (Task Object Structure)

Task 对象 (定义于 `src/task.ts`) 管理浏览器任务的生命周期，封装任务相关的状态，包括关联的 Tab 和 TabGroup。通过事件通知外部系统（如插件）执行实际的浏览器操作。

### 核心属性 (Core Properties)
*   **`taskId`** (`string`): 任务唯一标识符。
*   **`config`** (`TaskConfig`): 任务配置对象。
    *   `name` (`string`): 任务名称。
    *   `color` (`TabGroupColor`): 任务颜色。
    *   `urls` (`string[]`?): 初始 URL 列表。
*   **`tabId`** (`number | null`): 关联的核心 Tab ID。
*   **`groupId`** (`number | null`): 关联的 Tab Group ID。
*   **`group`** (`TaskGroupProxy`): 响应式 Group 属性代理，用于同步配置变更。
    *   `color`: `TabGroupColor` (组颜色)
    *   `title`: `string` (组标题)

### 任务事件 (Task Events)
*   **`task_init`**: `[config: TaskConfig]` - 任务初始化，请求创建 Tab 和 Group。
*   **`group_config_change`**: `[changes: Partial<TaskGroupProxy>]` - 任务组配置变更。
*   **`task_destroyed`**: `[]` - 任务销毁。

---

## 相关数据模型 (Related Data Models)

定义来源于 `src/types.ts`。

### 标签页定义 (Tab Definitions)

#### `TabStatus` (标签页状态)
*   `loading`: 'loading' (加载中)
*   `complete`: 'complete' (完成)

#### `TabProperties` (Core / 核心属性)
基础 Tab 属性，对应 Chrome API 返回的数据。
*   `id` (`number`): 标签页 ID
*   `windowId` (`number`): 窗口 ID
*   `groupId` (`number`?): 组 ID
*   `url` (`string | null`): 页面链接
*   `title` (`string | null`): 页面标题
*   `favIconUrl` (`string | null`): 图标链接
*   `status` (`TabStatus | null`):加载状态
*   `active` (`boolean`): 是否激活
*   `pinned` (`boolean`): 是否固定
*   `hidden` (`boolean`): 是否隐藏
*   `index` (`number`): 排序索引
*   `openerTabId` (`number | null`): 打开者标签 ID
*   `lastUpdated` (`number`): 最后更新时间戳

#### `TabExtendedProperties` (Extended / 扩展属性)
除了原生属性外，可以额外采集或计算的属性。
*   `loadProgress` (`number`): 加载进度
*   `isSpecialPage` (`boolean`): 是否特殊页面
*   `language` (`string`): 语言
*   `editable` (`boolean`): 是否可编辑
*   `contentLastModified` (`number`): 内容最后修改时间
*   `isAudible` (`boolean`): 是否有音频
*   `isMuted` (`boolean`): 是否静音
*   `zoom` (`number`): 缩放比例
*   `lastNavigationTime` (`number`): 最后导航时间
*   `loadTime` (`number`): 加载耗时
*   `metadata` (`Record<string, unknown>`): 元数据

### 标签组定义 (Group Definitions)

#### `TabGroupState` (标签组状态)
*   `id` (`number`): 组 ID
*   `collapsed` (`boolean`): 是否折叠
*   `color` (`TabGroupColor`): 组颜色
*   `title` (`string`?): 组标题
*   `windowId` (`number`): 窗口 ID

#### `TabGroupColor` (标签组颜色)
枚举: `grey` (灰), `blue` (蓝), `red` (红), `yellow` (黄), `green` (绿), `pink` (粉), `purple` (紫), `cyan` (青), `orange` (橙)

### 系统与扩展状态 (System & Extension States)

#### `ExtensionState` (扩展状态)
*   `idle`: 'idle' (空闲)
*   `hidden`: 'hidden' (隐藏)
*   `ongoing`: 'ongoing' (进行中)
*   `takeover`: 'takeover' (接管)

#### `SystemState` (系统状态)
*   `running`: 'running' (运行中)
*   `stopped`: 'stopped' (停止)
*   `takeover`: 'takeover' (接管)
*   `ongoing`: 'ongoing' (进行中)
*   `completed`: 'completed' (完成)
*   `waiting`: 'waiting' (等待中)
*   `error`: 'error' (错误)

