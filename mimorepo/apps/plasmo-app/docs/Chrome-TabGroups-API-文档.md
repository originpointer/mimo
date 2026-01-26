# Chrome TabGroups API 文档

## 1. API 概述

### 描述
`chrome.tabGroups` API 用于与浏览器的选项卡分组系统进行交互。通过该 API，可以修改和重新排列浏览器中的选项卡组。

### 与 chrome.tabs API 的关系
- **分组/取消分组选项卡**：需要使用 `chrome.tabs` API（`chrome.tabs.group()` 和 `chrome.tabs.ungroup()`）
- **修改组属性**：使用 `chrome.tabGroups` API
- **查询组内选项卡**：使用 `chrome.tabs` API 查询选项卡的 `groupId` 属性

### 所需权限
在 Manifest 中添加 `tabGroups` 权限：

```json
{
  "permissions": [
    "tabGroups",
    "tabs"
  ]
}
```

### 可用性
- Chrome 88+
- 所有支持扩展的 Chrome 平台

---

## 2. 类型定义

### ColorEnum（颜色枚举）

选项卡组支持 9 种预定义颜色：

| 值 | 说明 |
|----|------|
| `grey` | 灰色 - 待处理/默认状态 |
| `blue` | 蓝色 - 执行中/进行中 |
| `red` | 红色 - 错误/重要 |
| `yellow` | 黄色 - 警告/待处理 |
| `green` | 绿色 - 成功/完成 |
| `pink` | 粉色 - 辅助标记 |
| `purple` | 紫色 - 辅助标记 |
| `cyan` | 青色 - 信息/提示 |
| `orange` | 橙色 - 注意/警告 |

### TabGroup 接口

```typescript
interface TabGroup {
  /** 组是否折叠。折叠的组会隐藏其选项卡 */
  collapsed: boolean;

  /** 组的颜色（ColorEnum 枚举值） */
  color: ColorEnum;

  /** 组的 ID。组 ID 在浏览器会话中唯一 */
  id: number;

  /** 组是否共享（可选属性） */
  shared?: boolean;

  /** 组的标题 */
  title: string;

  /** 包含该组的窗口 ID */
  windowId: number;
}
```

### QueryInfo 接口（查询参数）

```typescript
interface QueryInfo {
  /** 组是否折叠 */
  collapsed?: boolean;

  /** 组的颜色 */
  color?: ColorEnum;

  /** 组是否共享 */
  shared?: boolean;

  /** 匹配组标题的模式（支持通配符） */
  title?: string;

  /** 父窗口 ID，或 windows.WINDOW_ID_CURRENT 表示当前窗口 */
  windowId?: number;
}
```

---

## 3. API 方法

### get(groupId)

获取指定组的详细信息。

```typescript
chrome.tabGroups.get(
  groupId: number
): Promise<TabGroup>
```

**参数**：
- `groupId` - 要查询的组 ID

**返回**：
- `Promise<TabGroup>` - 选项卡组对象

**示例**：
```typescript
try {
  const group = await chrome.tabGroups.get(123);
  console.log('组标题:', group.title);
  console.log('组颜色:', group.color);
} catch (error) {
  console.error('组不存在:', error);
}
```

---

### move(groupId, moveProperties)

移动组及其所有选项卡。

```typescript
chrome.tabGroups.move(
  groupId: number,
  moveProperties: {
    index?: number;        // 移动到的位置，使用 -1 放在窗口末尾
    windowId?: number;     // 移动到的窗口 ID
  }
): Promise<TabGroup | undefined>
```

**参数**：
- `groupId` - 要移动的组 ID
- `moveProperties`
  - `index` - 目标位置索引（可选）
  - `windowId` - 目标窗口 ID（可选，默认为当前窗口）

**返回**：
- `Promise<TabGroup | undefined>` - 移动后的组对象

**注意**：
- 组只能在 `windows.WindowType` 为 `"normal"` 的窗口之间移动
- 组在不同窗口之间移动时，会触发移除和创建事件，而不是移动事件

**示例**：
```typescript
// 将组移动到窗口末尾
await chrome.tabGroups.move(groupId, { index: -1 });

// 将组移动到另一个窗口
await chrome.tabGroups.move(groupId, { windowId: 2 });
```

---

### query(queryInfo)

查询具有指定属性的所有组。

```typescript
chrome.tabGroups.query(
  queryInfo: QueryInfo
): Promise<TabGroup[]>
```

**参数**：
- `queryInfo` - 查询条件（所有属性都是可选的）

**返回**：
- `Promise<TabGroup[]>` - 匹配的组数组

**示例**：
```typescript
// 查询所有组
const allGroups = await chrome.tabGroups.query();

// 查询当前窗口的所有组
const currentWindowGroups = await chrome.tabGroups.query({
  windowId: chrome.windows.WINDOW_ID_CURRENT
});

// 查询特定标题的组
const taskGroups = await chrome.tabGroups.query({
  title: '我的任务'
});

// 查询所有折叠的蓝色组
const collapsedBlueGroups = await chrome.tabGroups.query({
  collapsed: true,
  color: 'blue'
});

// 使用通配符查询标题
const matchingGroups = await chrome.tabGroups.query({
  title: '任务*'  // 匹配以"任务"开头的标题
});
```

---

### update(groupId, updateProperties)

修改组的属性。未指定的属性不会被修改。

```typescript
chrome.tabGroups.update(
  groupId: number,
  updateProperties: {
    collapsed?: boolean;
    color?: ColorEnum;
    title?: string;
  }
): Promise<TabGroup | undefined>
```

**参数**：
- `groupId` - 要修改的组 ID
- `updateProperties`
  - `collapsed` - 是否折叠组
  - `color` - 组的颜色
  - `title` - 组的标题

**返回**：
- `Promise<TabGroup | undefined>` - 更新后的组对象

**示例**：
```typescript
// 更新组标题
await chrome.tabGroups.update(groupId, {
  title: '新任务名称'
});

// 更新颜色和折叠状态
await chrome.tabGroups.update(groupId, {
  color: 'green',
  collapsed: true
});

// 同时更新多个属性
await chrome.tabGroups.update(groupId, {
  title: '已完成任务',
  color: 'green',
  collapsed: true
});
```

---

## 4. 事件监听

### onCreated

当创建组时触发。

```typescript
chrome.tabGroups.onCreated.addListener(
  callback: (group: TabGroup) => void
)
```

**示例**：
```typescript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log('新组创建:', {
    id: group.id,
    title: group.title,
    color: group.color
  });
});
```

---

### onMoved

当组在窗口内移动时触发。

```typescript
chrome.tabGroups.onMoved.addListener(
  callback: (group: TabGroup) => void
)
```

**注意**：
- 组内各个选项卡也会触发移动事件
- 组在不同窗口之间移动时，此事件不会触发（而是触发移除和创建事件）

**示例**：
```typescript
chrome.tabGroups.onMoved.addListener((group) => {
  console.log('组移动:', group.title);
});
```

---

### onRemoved

当组关闭时触发（由用户直接关闭或因组内没有选项卡而自动关闭）。

```typescript
chrome.tabGroups.onRemoved.addListener(
  callback: (group: TabGroup) => void
)
```

**示例**：
```typescript
chrome.tabGroups.onRemoved.addListener((group) => {
  console.log('组删除:', group.title);
});
```

---

### onUpdated

当组更新时触发（标题、颜色、折叠状态变化）。

```typescript
chrome.tabGroups.onUpdated.addListener(
  callback: (group: TabGroup) => void
)
```

**示例**：
```typescript
chrome.tabGroups.onUpdated.addListener((group) => {
  console.log('组更新:', {
    title: group.title,
    color: group.color,
    collapsed: group.collapsed
  });
});
```

---

## 5. 常量

### TAB_GROUP_ID_NONE

表示没有组的 ID 常量。

```typescript
chrome.tabGroups.TAB_GROUP_ID_NONE: number
```

**用途**：
- 检查选项卡是否属于某个组（通过比较 `tab.groupId`）
- 将选项卡从组中移除（设置 `groupId` 为此值）

**示例**：
```typescript
// 检查选项卡是否属于某个组
if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
  console.log('选项卡属于组:', tab.groupId);
}

// 使用 chrome.tabs API 将选项卡从组中移除
await chrome.tabs.ungroup(tabIds);
```

---

## 6. Manus 功能适配性分析

### Manus 需求
> Manus 插件在执行任务时会创建浏览器选项卡组，并标记任务名称

### API 能力对照表

| Manus 需求 | Chrome API 支持 | 实现方式 |
|-----------|----------------|---------|
| 创建选项卡组 | ✅ 完全支持 | 使用 `chrome.tabs.group()` 创建组 |
| 标记任务名称 | ✅ 完全支持 | 使用 `chrome.tabGroups.update({title})` |
| 设置颜色标识 | ✅ 完全支持 | 使用 `updateProperties.color` 设置不同状态的颜色 |
| 折叠/展开组 | ✅ 完全支持 | 使用 `updateProperties.collapsed` |
| 查询任务组 | ✅ 完全支持 | 使用 `chrome.tabGroups.query({title})` |
| 监听组变化 | ✅ 完全支持 | 使用 `onCreated/onUpdated/onRemoved` 事件 |
| 移动选项卡到组 | ✅ 完全支持 | 使用 `chrome.tabs.group({groupId, tabIds})` |
| 删除任务组 | ✅ 完全支持 | 关闭组内所有选项卡，或使用 `chrome.tabs.ungroup()` |

### 结论
**✅ Chrome TabGroups API 完全满足 Manus 任务选项卡组功能需求**

---

## 7. 实现示例

### 创建并标记任务组

```typescript
/**
 * 创建一个新的任务选项卡组
 * @param taskName 任务名称（用作组标题）
 * @param taskUrl 任务起始 URL
 * @param color 任务颜色（可选，默认蓝色）
 */
async function createTaskGroup(
  taskName: string,
  taskUrl: string,
  color: chrome.tabGroups.ColorEnum = 'blue'
): Promise<number> {
  // 1. 创建新选项卡
  const tab = await chrome.tabs.create({ url: taskUrl });

  // 2. 将选项卡添加到新组
  const groupId = await chrome.tabs.group({
    tabIds: tab.id
  });

  // 3. 设置任务名称和颜色
  await chrome.tabGroups.update(groupId, {
    title: taskName,
    color: color,
    collapsed: false
  });

  return groupId;
}

// 使用示例
const groupId = await createTaskGroup(
  '数据分析任务',
  'https://example.com/data',
  'blue'
);
```

---

### 添加选项卡到现有任务组

```typescript
/**
 * 添加选项卡到现有的任务组
 * @param groupId 任务组 ID
 * @param tabUrl 要添加的选项卡 URL
 */
async function addTabToGroup(groupId: number, tabUrl: string): Promise<void> {
  // 创建新选项卡
  const tab = await chrome.tabs.create({ url: tabUrl });

  // 将选项卡添加到指定组
  await chrome.tabs.group({
    groupId: groupId,
    tabIds: tab.id
  });
}

// 使用示例
await addTabToGroup(groupId, 'https://example.com/page2');
```

---

### 查询任务组

```typescript
/**
 * 按任务名称查询组
 * @param taskName 任务名称
 */
async function findTaskGroup(taskName: string): Promise<chrome.tabGroups.TabGroup | null> {
  const groups = await chrome.tabGroups.query({
    title: taskName
  });

  return groups.length > 0 ? groups[0] : null;
}

/**
 * 获取当前窗口的所有任务组
 */
async function getCurrentWindowGroups(): Promise<chrome.tabGroups.TabGroup[]> {
  return await chrome.tabGroups.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  });
}

// 使用示例
const taskGroup = await findTaskGroup('数据分析任务');
if (taskGroup) {
  console.log('找到任务组:', taskGroup.id);
}
```

---

### 更新任务状态（颜色和标题）

```typescript
/**
 * 任务状态颜色映射
 */
const taskStatusColors: Record<string, chrome.tabGroups.ColorEnum> = {
  pending: 'grey',     // 待处理
  running: 'blue',     // 执行中
  warning: 'yellow',   // 警告
  error: 'red',        // 错误
  success: 'green',    // 成功
  info: 'cyan'         // 信息
};

/**
 * 更新任务状态
 * @param groupId 任务组 ID
 * @param status 任务状态
 * @param appendStatus 是否在标题后追加状态
 */
async function updateTaskStatus(
  groupId: number,
  status: keyof typeof taskStatusColors,
  appendStatus: boolean = false
): Promise<void> {
  const updateProps: {
    color: chrome.tabGroups.ColorEnum;
    title?: string;
  } = {
    color: taskStatusColors[status]
  };

  if (appendStatus) {
    const group = await chrome.tabGroups.get(groupId);
    updateProps.title = `${group.title} [${status}]`;
  }

  await chrome.tabGroups.update(groupId, updateProps);
}

// 使用示例
await updateTaskStatus(groupId, 'running', true);  // 标题变为 "数据分析任务 [running]"
await updateTaskStatus(groupId, 'success', false); // 只改变颜色为绿色
```

---

### 完整的任务组生命周期管理

```typescript
/**
 * 任务组管理器
 */
class TaskGroupManager {
  private groupId: number | null = null;
  private taskName: string;

  constructor(taskName: string) {
    this.taskName = taskName;
  }

  /**
   * 初始化任务组
   */
  async initialize(startUrl: string): Promise<void> {
    const tab = await chrome.tabs.create({ url: startUrl });
    this.groupId = await chrome.tabs.group({ tabIds: tab.id });
    await chrome.tabGroups.update(this.groupId, {
      title: this.taskName,
      color: 'grey',
      collapsed: false
    });
  }

  /**
   * 添加任务页面
   */
  async addPage(url: string): Promise<void> {
    if (!this.groupId) {
      throw new Error('任务组未初始化');
    }
    const tab = await chrome.tabs.create({ url });
    await chrome.tabs.group({ groupId: this.groupId, tabIds: tab.id });
  }

  /**
   * 更新状态
   */
  async setStatus(status: keyof typeof taskStatusColors): Promise<void> {
    if (!this.groupId) return;
    await chrome.tabGroups.update(this.groupId, {
      color: taskStatusColors[status]
    });
  }

  /**
   * 折叠/展开组
   */
  async setCollapsed(collapsed: boolean): Promise<void> {
    if (!this.groupId) return;
    await chrome.tabGroups.update(this.groupId, { collapsed });
  }

  /**
   * 完成任务（折叠并标记为成功）
   */
  async complete(): Promise<void> {
    if (!this.groupId) return;
    await chrome.tabGroups.update(this.groupId, {
      color: 'green',
      collapsed: true,
      title: `${this.taskName} [完成]`
    });
  }

  /**
   * 清理任务组
   */
  async cleanup(): Promise<void> {
    if (!this.groupId) return;

    // 获取组内所有选项卡
    const tabs = await chrome.tabs.query({ groupId: this.groupId });

    // 关闭所有选项卡（组会自动删除）
    await chrome.tabs.remove(tabs.map(t => t.id));

    this.groupId = null;
  }
}

// 使用示例
const taskManager = new TaskGroupManager('数据抓取任务');

// 初始化
await taskManager.initialize('https://example.com');

// 添加页面
await taskManager.addPage('https://example.com/page1');
await taskManager.addPage('https://example.com/page2');

// 更新状态
await taskManager.setStatus('running');

// 完成任务
await taskManager.complete();

// 或清理任务组
// await taskManager.cleanup();
```

---

### 监听任务组事件

```typescript
/**
 * 设置任务组事件监听
 */
function setupTaskGroupListeners(): void {
  // 监听组创建
  chrome.tabGroups.onCreated.addListener((group) => {
    console.log('✅ 任务组创建:', {
      id: group.id,
      title: group.title,
      color: group.color,
      windowId: group.windowId
    });
  });

  // 监听组更新（状态变化）
  chrome.tabGroups.onUpdated.addListener((group) => {
    console.log('🔄 任务组更新:', {
      id: group.id,
      title: group.title,
      color: group.color,
      collapsed: group.collapsed
    });
  });

  // 监听组删除
  chrome.tabGroups.onRemoved.addListener((group) => {
    console.log('🗑️ 任务组删除:', {
      id: group.id,
      title: group.title
    });
  });

  // 监听组移动
  chrome.tabGroups.onMoved.addListener((group) => {
    console.log('➡️ 任务组移动:', {
      id: group.id,
      title: group.title,
      windowId: group.windowId
    });
  });
}

// 初始化监听器
setupTaskGroupListeners();
```

---

### 获取组内的所有选项卡

```typescript
/**
 * 获取任务组内的所有选项卡
 * @param groupId 任务组 ID
 */
async function getGroupTabs(groupId: number): Promise<chrome.tabs.Tab[]> {
  return await chrome.tabs.query({ groupId });
}

/**
 * 获取组内选项卡数量
 */
async function getGroupTabCount(groupId: number): Promise<number> {
  const tabs = await chrome.tabs.query({ groupId });
  return tabs.length;
}

// 使用示例
const tabs = await getGroupTabs(groupId);
console.log('组内选项卡:', tabs.map(t => t.title));

const count = await getGroupTabCount(groupId);
console.log('组内选项卡数量:', count);
```

---

## 8. Manifest 配置

### 权限配置

在 `package.json` 或 `manifest.json` 中添加：

```json
{
  "manifest_version": 3,
  "permissions": [
    "tabGroups",
    "tabs",
    "windows"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
```

### Plasmo 项目配置

如果使用 Plasmo 框架，在 `package.json` 中配置：

```json
{
  "name": "mimo-extension",
  "version": "1.0.0",
  "permissions": [
    "tabGroups",
    "tabs"
  ]
}
```

---

## 9. 相关文件位置

| 文件 | 路径 |
|------|------|
| Tab 命令执行器 | `mimorepo/packages/@mimo/hub/src/command-executor.ts` |
| 扩展后台脚本 | `mimorepo/apps/plasmo-app/src/background/index.ts` |
| 扩展 Manifest | `mimorepo/apps/plasmo-app/package.json` |
| Tab 类型定义 | `mimorepo/apps/next-app/types/plasmo.ts` |

---

## 10. 最佳实践

### 1. 错误处理
```typescript
try {
  const group = await chrome.tabGroups.get(groupId);
  // 处理组
} catch (error) {
  if (error.message.includes('Group not found')) {
    console.error('组不存在，可能已被删除');
  } else {
    console.error('未知错误:', error);
  }
}
```

### 2. 颜色语义化使用
```typescript
// 推荐的颜色语义
const semanticColors = {
  default: 'grey',    // 默认/未分类
  active: 'blue',     // 活跃/进行中
  success: 'green',   // 成功/完成
  warning: 'yellow',  // 警告/需要注意
  error: 'red',       // 错误/失败
  info: 'cyan',       // 信息/提示
  important: 'orange' // 重要/高优先级
};
```

### 3. 标题命名规范
```typescript
// 推荐的任务命名模式
const taskTitlePatterns = {
  withDate: `${taskName} - ${new Date().toISOString()}`,
  withStatus: `${taskName} [${status}]`,
  withId: `${taskName} #${taskId}`
};
```

### 4. 性能优化
```typescript
// 批量操作：使用 Promise.all
async function batchUpdateGroups(groups: number[], props: chrome.tabGroups.UpdateProperties) {
  await Promise.all(
    groups.map(id => chrome.tabGroups.update(id, props))
  );
}

// 避免频繁查询：缓存结果
let cachedGroups: chrome.tabGroups.TabGroup[] | null = null;

async function getAllGroups(): Promise<chrome.tabGroups.TabGroup[]> {
  if (!cachedGroups) {
    cachedGroups = await chrome.tabGroups.query();
  }
  return cachedGroups;
}

// 监听变化时清除缓存
chrome.tabGroups.onCreated.addListener(() => { cachedGroups = null; });
chrome.tabGroups.onRemoved.addListener(() => { cachedGroups = null; });
chrome.tabGroups.onUpdated.addListener(() => { cachedGroups = null; });
```

---

## 11. 参考资料

- [Chrome TabGroups API 官方文档](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)
- [Chrome Tabs API 官方文档](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Plasmo 框架文档](https://docs.plasmo.com/)
