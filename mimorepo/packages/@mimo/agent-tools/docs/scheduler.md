# 调度器 (Scheduler)

## 概述

调度器模块负责工具的调度执行，实现了**类型分组的并行执行**机制：

- **同一组的工具**：串行执行（按顺序）
- **不同组的工具**：并行执行（同时）

这种机制特别适合处理有依赖关系的工具，例如：
- 浏览器操作工具必须串行执行（状态依赖）
- 文件操作和搜索操作可以并行执行（无依赖）

## 核心组件

- **ToolScheduler**：调度器，管理多个分组队列
- **ToolQueue**：队列，负责单个分组的串行执行

## ToolScheduler

### 构造函数

```typescript
const scheduler = new ToolScheduler(options?: SchedulerOptions);
```

**选项：**
```typescript
interface SchedulerOptions {
  defaultGroup?: string;  // 默认分组名称，默认 'default'
}
```

### API

#### execute

执行单个工具。

```typescript
async execute(
  tool: ToolDefinition,
  params: any,
  context: ToolExecutionContext
): Promise<ExecutionResult>
```

```typescript
const result = await scheduler.execute(tool, params, context);
```

#### executeBatch

批量执行工具（按分组并行执行）。

```typescript
async executeBatch(
  items: Array<{
    tool: ToolDefinition;
    params: any;
  }>,
  context: ToolExecutionContext
): Promise<ExecutionResult[]>
```

#### getGroups

获取所有活动的分组名称。

```typescript
getGroups(): string[]
```

#### getQueueStatus

获取指定分组队列的状态。

```typescript
getQueueStatus(group: string): { length: number; running: boolean } | null
```

**返回：**
- `length` - 队列中等待的任务数
- `running` - 是否正在处理

#### shutdown

等待所有队列完成处理。

```typescript
async shutdown(): Promise<void>
```

#### clear

清空所有队列。

```typescript
clear(): void
```

## ToolQueue

ToolQueue 负责单个分组的串行执行。通常由 ToolScheduler 自动管理，不需要直接使用。

### API

```typescript
class ToolQueue {
  readonly group: string;           // 分组名称
  readonly length: number;          // 队列长度
  readonly isRunning: boolean;      // 是否正在运行

  enqueue(task: QueueTask): void;   // 添加任务
  start(): void;                    // 开始处理
  shutdown(): Promise<void>;        // 等待完成
  clear(): void;                    // 清空队列
}
```

## 执行机制

### 分组与并行

```
工具分组示例:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  browser    │     │    file     │     │   search    │
│  group      │     │   group     │     │   group     │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ navigate    │     │ read        │     │ web_search  │
│ click       │     │ write       │     │ fetch       │
│ fill        │     │ delete      │     │ ...         │
│ ...         │     │ ...         │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 串行执行          │ 串行执行           │ 串行执行
       ▼                   ▼                   ▼

    三个分组同时并行执行
```

### 分组规则

1. **显式分组**：使用 `tool.group` 指定
2. **默认分组**：未指定时使用 `defaultGroup`

```typescript
// 浏览器工具 - 必须串行执行
{
  name: 'browser_navigate',
  group: 'browser',
  execute: async () => { /* ... */ }
}

// 文件工具 - 可以并行执行
{
  name: 'file_read',
  group: 'file',
  execute: async () => { /* ... */ }
}

// 无分组 - 使用默认分组
{
  name: 'calculate',
  execute: async () => { /* ... */ }
}
```

## 使用示例

### 基本使用

```typescript
import { ToolScheduler } from '@mimo/agent-tools/scheduler';

const scheduler = new ToolScheduler();

// 执行单个工具
const result = await scheduler.execute(tool, params, context);
```

### 批量执行

```typescript
const tools = [
  { tool: browserNavigateTool, params: { url: 'https://example.com' } },
  { tool: browserClickTool, params: { selector: '#button' } },
  { tool: fileReadTool, params: { path: '/config.json' } },
  { tool: webSearchTool, params: { query: 'weather' } }
];

// browser_navigate 和 browser_click 串行执行（同组）
// file_read 和 web_search 并行执行（不同组）
const results = await scheduler.executeBatch(tools, context);
```

### 自定义默认分组

```typescript
const scheduler = new ToolScheduler({
  defaultGroup: 'general'
});
```

### 监控队列状态

```typescript
// 获取所有分组
const groups = scheduler.getGroups();
console.log('活动分组:', groups);

// 获取特定分组的状态
const status = scheduler.getQueueStatus('browser');
if (status) {
  console.log(`浏览器队列: ${status.length} 个等待任务, 运行中: ${status.running}`);
}
```

### 优雅关闭

```typescript
// 等待所有队列完成
await scheduler.shutdown();
console.log('所有工具已执行完成');
```

### 清空队列

```typescript
// 清空所有等待的任务
scheduler.clear();
```

## 完整示例

### 场景：网页自动化 + 文件处理

```typescript
import { ToolScheduler } from '@mimo/agent-tools/scheduler';

const scheduler = new ToolScheduler();

// 定义工具
const tools = [
  // 浏览器操作 - 串行执行
  {
    tool: {
      name: 'browser_navigate',
      group: 'browser',
      execute: async () => '导航完成'
    },
    params: { url: 'https://example.com' }
  },
  {
    tool: {
      name: 'browser_click',
      group: 'browser',
      execute: async () => '点击完成'
    },
    params: { selector: '#submit' }
  },
  // 文件操作 - 串行执行
  {
    tool: {
      name: 'file_read',
      group: 'file',
      execute: async () => '读取完成'
    },
    params: { path: '/data.json' }
  },
  // 搜索操作 - 并行执行
  {
    tool: {
      name: 'web_search',
      group: 'search',
      execute: async () => '搜索完成'
    },
    params: { query: 'API 文档' }
  }
];

// 执行所有工具
console.log('开始执行...');
const results = await scheduler.executeBatch(tools, context);

// 结果分析
for (const result of results) {
  console.log(`${result.toolCall.name}: ${result.success ? '✓' : '✗'}`);
}

// 输出示例:
// 开始执行...
// browser_navigate: ✓
// browser_click: ✓
// file_read: ✓
// web_search: ✓
```

### 场景：多组并行爬取

```typescript
// 多个网站同时爬取
const tasks = [];

for (const website of ['github.com', 'gitlab.com', 'bitbucket.org']) {
  tasks.push(
    { tool: navigateTool, params: { url: `https://${website}` } },
    { tool: scrapeTool, params: { selector: 'h1' } }
  );
}

// 每个网站的串行操作，不同网站的并行执行
const results = await scheduler.executeBatch(tasks, context);
```

### 场景：带状态监控的执行

```typescript
async function executeWithMonitoring(scheduler: ToolScheduler, tasks: any[]) {
  // 启动执行
  const executionPromise = scheduler.executeBatch(tasks, context);

  // 监控队列状态
  const monitorInterval = setInterval(() => {
    for (const group of scheduler.getGroups()) {
      const status = scheduler.getQueueStatus(group);
      if (status) {
        console.log(`[${group}] 等待: ${status.length}, 运行: ${status.running}`);
      }
    }
  }, 1000);

  // 等待完成
  const results = await executionPromise;

  // 停止监控
  clearInterval(monitorInterval);

  return results;
}
```

## 设计原理

### 为什么需要分组？

某些工具会修改共享状态，必须按顺序执行：

1. **浏览器工具**：操作同一个浏览器实例，状态会改变
   - navigate → click → fill（必须按顺序）

2. **文件操作**：可能操作同一文件系统
   - write → read（顺序很重要）

3. **独立工具**：无状态依赖，可以并行
   - web_search + file_read（互不影响）

### 性能优化

```
传统串行执行:
Tool1 (100ms) → Tool2 (100ms) → Tool3 (100ms) → Tool4 (100ms) = 400ms

分组并行执行:
┌─────────────┐     ┌─────────────┐
│  Tool1      │     │  Tool3      │
│  100ms      │     │  100ms      │
│  Group A    │     │  Group B    │
├─────────────┤     ├─────────────┤
│  Tool2      │     │  Tool4      │
│  100ms      │     │  100ms      │
└─────────────┘     └─────────────┘
        ↓                   ↓
    200ms (并行)      200ms (并行)

总时间: max(200ms, 200ms) = 200ms

性能提升: 50%
```
