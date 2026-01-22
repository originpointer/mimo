# Mimo 核心类详细文档

## 概述

Mimo 类是 Mimo Library 的入口点，运行在 Nitro 服务器中，通过 MimoBus 与前端通信。所有浏览器操作都通过 Socket.IO 发送到插件端执行。

**位置**: `@mimo/lib/core`

**架构图**:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Mimo (Nitro Server)                        │
│                                                                   │
│  用户代码                                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ const mimo = new Mimo({ model: "openai/gpt-4.1-mini" })   │ │
│  │ await mimo.init()                                           │ │
│  │ await mimo.act("click button")                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Mimo Class                                │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │ │
│  │  │ MimoBus    │  │ Handlers   │  │ LLMProvider│           │ │
│  │  │ (通信)      │  │ (处理器)    │  │ (AI引擎)    │           │ │
│  │  └────────────┘  └────────────┘  └────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Socket.IO (WebSocket)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 导入

```typescript
import { Mimo } from '@mimo/lib';
// 或
import { Mimo } from '@mimo/lib/core';
```

## 构造函数

```typescript
constructor(opts: MimoOptions)
```

**参数说明**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `socket` | `SocketOptions` | 否 | - | Socket.IO 连接配置 |
| `socket.url` | `string` | 否 | `"ws://localhost:3000/socket.io/"` | Socket.IO 服务器 URL |
| `socket.autoReconnect` | `boolean` | 否 | `true` | 自动重连 |
| `socket.reconnectInterval` | `number` | 否 | `1000` | 重连间隔（毫秒） |
| `model` | `ModelConfiguration` | 否 | `"openai/gpt-4.1-mini"` | 模型配置 |
| `llmClient` | `LLMClient` | 否 | - | 自定义 LLM 客户端 |
| `systemPrompt` | `string` | 否 | - | 自定义系统提示词 |
| `verbose` | `0 \| 1 \| 2` | 否 | `1` | 日志详细程度 |
| `logger` | `(logLine: LogLine) => void` | 否 | - | 自定义日志函数 |
| `cacheDir` | `string` | 否 | `".mimo/cache"` | 缓存目录 |
| `experimental` | `boolean` | 否 | `false` | 启用实验性功能 |
| `commandTimeout` | `number` | 否 | `30000` | 指令超时时间（毫秒） |
| `selfHeal` | `boolean` | 否 | `true` | 启用自愈功能 |
| `defaultTabId` | `string` | 否 | - | 默认操作的标签页 ID |

**示例**:

```typescript
// 最简配置
const mimo = new Mimo();

// 完整配置
const mimo = new Mimo({
  socket: {
    url: "wss://api.example.com/socket.io/",
    autoReconnect: true,
    reconnectInterval: 5000,
  },
  model: "openai/gpt-4.1-mini",
  commandTimeout: 60000,
  selfHeal: true,
  verbose: 2,
  logger: (logLine) => {
    console.log(`[${logLine.category}] ${logLine.message}`);
  },
});
```

---

## 方法

### init()

初始化 Mimo 实例，建立 Socket.IO 连接。

```typescript
async init(): Promise<void>
```

**返回**: `Promise<void>`

**抛出**:
- `MimoInitError` - 初始化失败
- `MimoBusConnectionError` - Socket.IO 连接失败

**示例**:

```typescript
const mimo = new Mimo({
  model: "openai/gpt-4.1-mini",
});

await mimo.init();
console.log('Mimo 已初始化');
```

**内部流程**:

1. 创建 MimoBus 实例
2. 建立 Socket.IO 连接
3. 初始化 Handlers（ActHandler、ExtractHandler、ObserveHandler）
4. 设置事件监听器
5. 等待连接确认

---

### act()

执行浏览器操作（通过 Socket.IO 发送指令）。

```typescript
async act(
  input: string | Action,
  options?: ActOptions
): Promise<ActResult>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `input` | `string \| Action` | 自然语言指令或 Action 对象 |
| `options` | `ActOptions` | 可选配置 |

**ActOptions**:

```typescript
interface ActOptions {
  model?: ModelConfiguration;        // 覆盖默认模型
  variables?: Record<string, string>;  // 变量替换
  timeout?: number;                   // 超时时间（毫秒）
  tabId?: string;                     // 目标标签页 ID
}
```

**返回**: `Promise<ActResult>`

```typescript
interface ActResult {
  success: boolean;                   // 是否成功
  message: string;                    // 结果消息
  actionDescription: string;          // 操作描述
  actions: Action[];                  // 执行的操作列表
}
```

**示例**:

```typescript
// 使用自然语言
const result = await mimo.act("click the login button");

// 使用 Action 对象
const result = await mimo.act({
  selector: "#login-button",
  description: "Click login button",
  method: "click"
});

// 带变量
const result = await mimo.act("click the {buttonType} button", {
  variables: { buttonType: "submit" }
});

// 在特定标签页执行
const result = await mimo.act("click button", {
  tabId: "tab_123"
});
```

**内部流程**:

1. 使用 AI 分析用户意图
2. 通过 MimoBus 发送 `dom.observe` 指令获取可操作元素
3. 接收插件端返回的元素列表
4. 选择最佳操作
5. 通过 MimoBus 发送 `page.click` 等指令
6. 接收执行结果
7. 如果失败，使用自愈机制重试

---

### extract()

从页面提取结构化数据。

```typescript
async extract<T>(
  instruction: string,
  schema?: StagehandZodSchema<T>,
  options?: ExtractOptions
): Promise<ExtractResult<T>>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `instruction` | `string` | 提取指令 |
| `schema` | `StagehandZodSchema<T>` | Zod schema 定义数据结构 |
| `options` | `ExtractOptions` | 可选配置 |

**ExtractOptions**:

```typescript
interface ExtractOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;               // 限定提取范围
  tabId?: string;                  // 目标标签页
}
```

**返回**: `Promise<ExtractResult<T>>`

**示例**:

```typescript
import { z } from "zod";

// 定义 schema
const ProductSchema = z.object({
  name: z.string(),
  price: z.string(),
  description: z.string(),
});

// 提取数据
const products = await mimo.extract(
  "extract all products from the page",
  z.object({
    products: z.array(ProductSchema)
  })
);

// 简单提取
const { extraction } = await mimo.extract("get the page title");

// 使用 selector 限定范围
const buttonText = await mimo.extract(
  "get the button text",
  z.string(),
  { selector: "#submit-button" }
);
```

**内部流程**:

1. 通过 MimoBus 发送 `page.content` 指令获取页面内容
2. 接收 HTML 内容
3. 使用 AI 提取结构化数据
4. 验证数据格式
5. 返回结果

---

### observe()

观察页面并返回可执行的操作。

```typescript
async observe(
  instruction?: string,
  options?: ObserveOptions
): Promise<Action[]>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `instruction` | `string` | 观察指令（可选） |
| `options` | `ObserveOptions` | 可选配置 |

**ObserveOptions**:

```typescript
interface ObserveOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;               // 限定观察范围
  tabId?: string;                  // 目标标签页
}
```

**返回**: `Promise<Action[]>`

**示例**:

```typescript
// 获取所有可点击的按钮
const actions = await mimo.observe("find all clickable buttons");

// 执行第一个操作
if (actions.length > 0) {
  await mimo.act(actions[0]);
}

// 不带指令，返回所有可操作元素
const allActions = await mimo.observe();
```

**内部流程**:

1. 通过 MimoBus 发送 `dom.observe` 指令
2. 指令发送到前端：MimoBus → Socket.IO → Next App → Extension
3. 插件端调用 Stagehand.observe()
4. 结果返回：Extension → Next App → Socket.IO → MimoBus
5. 返回 Action 数组

---

### agent()

创建 Agent 实例。

```typescript
agent(config?: AgentConfig): MimoAgent
```

**参数**: `AgentConfig`

```typescript
interface AgentConfig {
  model?: ModelConfiguration;
  executionModel?: ModelConfiguration;
  systemPrompt?: string;
  mode?: "dom" | "hybrid" | "cua";
  cua?: boolean;
  integrations?: string[];
}
```

**返回**: `MimoAgent`

**示例**:

```typescript
// 基础 Agent
const agent = mimo.agent();

// 带配置
const agent = mimo.agent({
  model: "openai/gpt-4.1-mini",
  systemPrompt: "You are a helpful assistant.",
  mode: "dom"
});

// 执行任务
const result = await agent.execute({
  instruction: "Log in and navigate to settings",
  maxSteps: 20
});
```

---

### close()

关闭 Mimo 实例，释放资源。

```typescript
async close(options?: { force?: boolean }): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.force` | `boolean` | 强制关闭，忽略未完成的操作 |

**示例**:

```typescript
// 正常关闭
await mimo.close();

// 强制关闭
await mimo.close({ force: true });
```

**内部流程**:

1. 通过 MimoBus 发送 `browser.close` 指令
2. 等待响应或超时
3. 断开 Socket.IO 连接
4. 清理所有资源

---

## 属性 (Getters)

### bus

获取 MimoBus 通信实例。

```typescript
get bus(): MimoBus
```

**返回**: `MimoBus`

**示例**:

```typescript
const bus = mimo.bus;

// 监听连接事件
bus.on('connected', () => {
  console.log('已连接');
});

// 监听截图事件
bus.on('screenshot', ({ buffer }) => {
  console.log('收到截图:', buffer.length);
});
```

---

### page

获取当前活动标签页的远程页面代理。

```typescript
get page(): RemotePage
```

**返回**: `RemotePage`

**示例**:

```typescript
await mimo.page.goto("https://example.com");
const title = await mimo.page.title();
```

---

### context

获取上下文管理器。

```typescript
get context(): MimoContext
```

**返回**: `MimoContext`

**示例**:

```typescript
const tabs = await mimo.context.tabs();
const activeTab = await mimo.context.activeTab();
```

---

### metrics

获取性能指标。

```typescript
get metrics(): Promise<MimoMetrics>
```

**返回**: `Promise<MimoMetrics>`

```typescript
interface MimoMetrics {
  actPromptTokens: number;
  actCompletionTokens: number;
  actInferenceTimeMs: number;

  extractPromptTokens: number;
  extractCompletionTokens: number;
  extractInferenceTimeMs: number;

  observePromptTokens: number;
  observeCompletionTokens: number;
  observeInferenceTimeMs: number;

  agentPromptTokens: number;
  agentCompletionTokens: number;
  agentInferenceTimeMs: number;

  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalInferenceTimeMs: number;
}
```

**示例**:

```typescript
const metrics = await mimo.metrics;
console.log('总 Token 数:', metrics.totalPromptTokens + metrics.totalCompletionTokens);
console.log('总耗时:', metrics.totalInferenceTimeMs, 'ms');
```

---

### history

获取操作历史。

```typescript
get history(): Promise<ReadonlyArray<HistoryEntry>>
```

**返回**: `Promise<ReadonlyArray<HistoryEntry>>`

```typescript
interface HistoryEntry {
  method: "act" | "extract" | "observe" | "navigate" | "agent";
  parameters: unknown;
  result: unknown;
  timestamp: string;
  commandId?: string;             // 关联的指令 ID
  tabId?: string;                  // 执行的标签页 ID
}
```

**示例**:

```typescript
const history = await mimo.history;
history.forEach(entry => {
  console.log(`${entry.method}: ${entry.timestamp}`);
  if (entry.commandId) {
    console.log(`  指令 ID: ${entry.commandId}`);
  }
});
```

---

## 标签页管理

### getActiveTab()

获取当前活动标签页信息。

```typescript
async getActiveTab(): Promise<TabInfo>
```

**返回**: `Promise<TabInfo>`

```typescript
interface TabInfo {
  id: string;                      // 标签页 ID
  url: string;                     // 当前 URL
  title: string;                    // 页面标题
  active: boolean;                  // 是否为活动标签
  windowId: number;                 // 窗口 ID
}
```

**示例**:

```typescript
const tab = await mimo.getActiveTab();
console.log('活动标签页:', tab.url);
```

**内部流程**:

1. 通过 MimoBus 发送 `browser.getActiveTab` 指令
2. 接收响应并返回 TabInfo

---

### getTabs()

获取所有标签页信息。

```typescript
async getTabs(): Promise<TabInfo[]>
```

**返回**: `Promise<TabInfo[]>`

**示例**:

```typescript
const tabs = await mimo.getTabs();
console.log('标签页数量:', tabs.length);
tabs.forEach(tab => {
  console.log(`- ${tab.title}: ${tab.url}`);
});
```

---

### switchToTab()

切换到指定标签页。

```typescript
async switchToTab(tabId: string): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `tabId` | `string` | 标签页 ID |

**示例**:

```typescript
await mimo.switchToTab("tab_123");
console.log('已切换到标签页 tab_123');
```

**内部流程**:

1. 通过 MimoBus 发送 `browser.switchTab` 指令
2. 更新内部默认标签页 ID
3. 等待确认

---

### closeTab()

关闭指定标签页。

```typescript
async closeTab(tabId: string): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `tabId` | `string` | 标签页 ID |

**示例**:

```typescript
await mimo.closeTab("tab_123");
```

---

## 事件

Mimo 实例继承自 EventEmitter，可以监听各种事件。

```typescript
import { EventEmitter } from 'events';

class Mimo extends EventEmitter {
  // ...
}
```

### 可用事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `connected` | - | Socket.IO 连接建立 |
| `disconnected` | `{ reason: string }` | Socket.IO 连接断开 |
| `command.sent` | `{ command: MimoCommand }` | 指令已发送 |
| `command.result` | `{ id: string, response: MimoResponse }` | 指令执行结果 |
| `screenshot` | `{ buffer: Buffer, tabId: string }` | 收到截图 |
| `tab.changed` | `{ tab: TabInfo }` | 标签页变化 |
| `tab.closed` | `{ tabId: string }` | 标签页关闭 |
| `error` | `{ error: Error }` | 发生错误 |
| `metrics.updated` | `{ metrics: MimoMetrics }` | 指标更新 |

**示例**:

```typescript
// 监听连接状态
mimo.on('connected', () => {
  console.log('已连接');
});

mimo.on('disconnected', ({ reason }) => {
  console.log('连接断开:', reason);
});

// 监听指令执行
mimo.on('command.sent', ({ command }) => {
  console.log('发送指令:', command.type);
});

mimo.on('command.result', ({ id, response }) => {
  console.log(`指令 ${id} 完成:`, response.success);
});

// 监听标签页事件
mimo.on('tab.closed', ({ tabId }) => {
  console.log(`标签页 ${tabId} 已关闭`);
});

// 监听错误
mimo.on('error', ({ error }) => {
  console.error('错误:', error.message);
});
```

---

## 错误类

### MimoError

基础错误类。

```typescript
class MimoError extends Error {
  constructor(message: string, public code?: string)
}
```

### MimoInitError

初始化错误。

```typescript
class MimoInitError extends MimoError {
  constructor(message: string)
}
```

### MimoTimeoutError

超时错误。

```typescript
class MimoTimeoutError extends MimoError {
  constructor(message: string, public timeout: number)
}
```

### MimoNotConnectedError

未连接错误。

```typescript
class MimoNotConnectedError extends MimoError {
  constructor()
}
```

### MimoCommandError

指令执行错误。

```typescript
class MimoCommandError extends MimoError {
  constructor(message: string, public commandId: string, public command: MimoCommand)
}
```

---

## 使用示例

### 完整的工作流程

```typescript
import { Mimo } from '@mimo/lib';

// 1. 创建实例
const mimo = new Mimo({
  model: "openai/gpt-4.1-mini",
  socket: {
    url: "ws://localhost:3000/socket.io/",
  },
  verbose: 1,
});

// 2. 监听事件
mimo.on('connected', () => {
  console.log('✅ 已连接');
});

mimo.on('tab.closed', ({ tabId }) => {
  console.log(`🗑️ 标签页 ${tabId} 已关闭`);
});

// 3. 初始化
await mimo.init();

// 4. 获取当前标签页
const tab = await mimo.getActiveTab();
console.log('当前标签页:', tab.url);

// 5. 导航
await mimo.page.goto("https://example.com");

// 6. 执行操作
await mimo.act("click the login button");

// 7. 填充表单
await mimo.act("fill username input with 'john_doe'");
await mimo.act("fill password input with 'secret123'");

// 8. 提取数据
const data = await mimo.extract("get the success message", z.string());
console.log('结果:', data);

// 9. 关闭
await mimo.close();
```

### 错误处理

```typescript
try {
  await mimo.act("click the non-existent button");
} catch (error) {
  if (error instanceof MimoTimeoutError) {
    console.log('操作超时');
  } else if (error instanceof MimoCommandError) {
    console.log('指令执行失败:', error.message);
    console.log('指令 ID:', error.commandId);
  } else if (error instanceof MimoNotConnectedError) {
    console.log('未连接到服务器');
  }
}
```

### 使用特定标签页

```typescript
// 获取所有标签页
const tabs = await mimo.getTabs();

// 在第二个标签页执行操作
await mimo.act("click button", {
  tabId: tabs[1].id
});

// 或先切换标签页
await mimo.switchToTab(tabs[1].id);
await mimo.act("click button");
```
