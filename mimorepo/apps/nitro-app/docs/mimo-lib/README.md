# Mimo Library 架构文档

## 概述

Mimo Library 是一个基于 Stagehand V3 架构设计的浏览器自动化和 AI 交互库，**运行在 Nitro 服务器中**，通过 Socket.IO 与前端通信，由浏览器扩展执行实际的页面操作。

## 设计理念

Mimo Library 遵循 Stagehand 的设计理念，提供统一的 API 接口：

```typescript
// 使用方式与 Stagehand 保持一致
const mimo = new Mimo({
  model: "openai/gpt-4.1-mini",
});

// 完全控制浏览器（通过 Socket.IO 通信）
await mimo.page.goto("https://example.com");
await mimo.act("click the login button");
await mimo.extract({ schema: LoginFormSchema });
```

## 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mimo Library (Nitro Server)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Mimo Core   │  │  MimoBus     │  │   AI Engine   │      │
│  │   (核心层)     │  │  (通信核心)   │  │   (AI 引擎)    │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │  Context      │  │   Handlers    │  │    Cache      │      │
│  │  (上下文管理)  │  │  (处理器)      │  │   (缓存)       │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                        Socket.IO 通信层                           │
│                     (通过 WebSocket 发送指令)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    Next App (中转层)                             │
│  ┌───────────────┐  ┌───────────────┐                          │
│  │ Socket Client │  │Extension Bridge│                          │
│  │  (Socket客户端) │  │  (扩展桥接)    │                          │
│  └───────────────┘  └───────────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│                    Chrome Extension API                          │
│                   (chrome.runtime.sendMessage)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Extension API
┌─────────────────────────────────────────────────────────────────┐
│                  Plasmo App (插件端)                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │ Message Hub   │  │Browser Control│  │ Stagehand     │      │
│  │  (消息中心)    │  │  (浏览器控制)  │  │  (执行引擎)    │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Chrome DevTools Protocol
┌─────────────────────────────────────────────────────────────────┐
│                      浏览器 (Chrome/Edge)                        │
│                    (实际执行页面操作)                              │
└─────────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. MimoBus (通信核心)

**位置**: `@mimo/lib/bus`

**功能描述**: MimoBus 是 Mimo Library 的核心通信类，负责通过 Socket.IO 与前端建立双向通信连接，发送指令并接收执行结果。所有浏览器操作都通过 MimoBus 进行中转。

**核心方法**:

```typescript
class MimoBus {
  // 连接管理
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  isConnected(): boolean

  // 房间管理
  async joinRoom(roomId: string): Promise<void>
  async leaveRoom(roomId: string): Promise<void>

  // 指令发送（核心方法）
  async send<T>(command: MimoCommand): Promise<MimoResponse<T>>
  async sendWithStream<T>(command: MimoCommand): AsyncGenerator<MimoStreamEvent<T>>

  // 事件监听
  on(event: string, handler: (data: any) => void): void
  off(event: string, handler?: (data: any) => void): void
  once(event: string, handler: (data: any) => void): void

  // 广播
  broadcast(event: string, data: any): void
  broadcastToRoom(roomId: string, event: string, data: any): void

  // 生命周期
  destroy(): void
}
```

**MimoCommand (指令格式)**:

```typescript
interface MimoCommand {
  id: string                    // 唯一指令 ID
  type: CommandType            // 指令类型
  payload: any                 // 指令负载
  options?: {
    timeout?: number           // 超时时间
    tabId?: string             // 目标标签页 ID
    frameId?: string           // 目标 Frame ID
  }
  timestamp: number            // 时间戳
}

type CommandType =
  | "page.init"                // 初始化页面
  | "page.goto"                // 导航到 URL
  | "page.reload"              // 重新加载
  | "page.click"               // 点击元素
  | "page.fill"                // 填充输入框
  | "page.select"              // 选择下拉框
  | "page.screenshot"          // 截图
  | "page.evaluate"            // 执行 JavaScript
  | "page.waitFor"              // 等待元素
  | "page.content"             // 获取页面内容
  | "dom.observe"              // 观察页面元素
  | "dom.locator"              // 创建定位器
  | "dom.deepLocator"          // 创建深度定位器
  | "dom.mark"                 // 标记元素
  | "dom.unmark"               // 取消标记
  | "browser.close"            // 关闭浏览器
  | "browser.newPage"          // 新建页面
  | "browser.getActiveTab"     // 获取活动标签页
  | "browser.getTabs"          // 获取所有标签页
  | "stream.start"             // 开始流式传输
  | "stream.chunk"             // 流式数据块
  | "stream.end"               // 结束流式传输
```

**MimoResponse (响应格式)**:

```typescript
interface MimoResponse<T = any> {
  id: string                    // 对应的指令 ID
  success: boolean              // 是否成功
  data?: T                      // 响应数据
  error?: {
    code: string
    message: string
    stack?: string
  }
  timestamp: number
}

interface MimoStreamEvent<T = any> {
  id: string
  type: "data" | "error" | "end"
  data?: T
  error?: string
}
```

**使用示例**:

```typescript
const bus = new MimoBus({
  url: "ws://localhost:3000/socket.io/",
  autoReconnect: true,
  reconnectInterval: 1000,
});

// 连接到服务器
await bus.connect();

// 发送指令并等待响应
const response = await bus.send({
  id: uuid(),
  type: "page.goto",
  payload: { url: "https://example.com" },
  timestamp: Date.now(),
});

if (response.success) {
  console.log("导航成功:", response.data);
}

// 监听事件
bus.on("screenshot", (data) => {
  console.log("收到截图:", data.buffer);
});

// 流式接收
const stream = bus.sendWithStream({
  id: uuid(),
  type: "dom.observe",
  payload: { instruction: "find all buttons" },
  timestamp: Date.now(),
});

for await (const event of stream) {
  if (event.type === "data") {
    console.log("观察结果:", event.data);
  }
}
```

---

### 2. Mimo (核心类)

**位置**: `@mimo/lib/core`

**功能描述**: Mimo 类是整个库的入口点，内部使用 MimoBus 进行所有浏览器操作的通信。

**构造函数选项**:

```typescript
interface MimoOptions {
  // Socket.IO 连接配置
  socket?: {
    url?: string;              // Socket.IO 服务器 URL
    autoReconnect?: boolean;   // 自动重连
    reconnectInterval?: number; // 重连间隔（毫秒）
  };

  // 模型配置
  model?: ModelConfiguration;
  llmClient?: LLMClient;

  // 系统提示词
  systemPrompt?: string;

  // 日志配置
  verbose?: 0 | 1 | 2;
  logger?: (logLine: LogLine) => void;

  // 缓存配置
  cacheDir?: string;

  // 实验性功能
  experimental?: boolean;

  // 超时配置
  domSettleTimeout?: number;
  commandTimeout?: number;      // 指令超时时间

  // 自愈功能
  selfHeal?: boolean;

  // 默认标签页配置
  defaultTabId?: string;        // 默认操作的标签页 ID
}
```

**核心方法**:

```typescript
class Mimo {
  // 初始化（建立 Socket.IO 连接）
  async init(): Promise<void>

  // 核心操作（内部通过 MimoBus 发送指令）
  act(instruction: string | Action, options?: ActOptions): Promise<ActResult>
  extract<T>(instruction: string, schema?: T, options?: ExtractOptions): Promise<ExtractResult<T>>
  observe(instruction?: string, options?: ObserveOptions): Promise<Action[]>

  // Agent
  agent(config?: AgentConfig): MimoAgent

  // 标签页管理
  async getActiveTab(): Promise<TabInfo>
  async getTabs(): Promise<TabInfo[]>
  async switchToTab(tabId: string): Promise<void>
  async closeTab(tabId: string): Promise<void>

  // 生命周期
  async close(): Promise<void>

  // 获取器和属性
  get bus(): MimoBus               // 获取通信总线
  get page(): RemotePage           // 获取远程页面代理
  get context(): MimoContext       // 获取上下文
  get metrics(): Promise<MimoMetrics>
  get history(): Promise<HistoryEntry[]>
}
```

---

### 3. RemotePage (远程页面代理)

**位置**: `@mimo/lib/page`

**功能描述**: RemotePage 是对浏览器页面的远程代理，所有方法调用都通过 MimoBus 发送到插件端执行。

**核心方法**:

```typescript
class RemotePage {
  // 导航（通过 Socket.IO 发送指令）
  async goto(url: string, options?: NavigateOptions): Promise<RemoteResponse>
  async reload(options?: ReloadOptions): Promise<RemoteResponse>
  async goBack(): Promise<RemoteResponse>
  async goForward(): Promise<RemoteResponse>

  // 信息获取
  url(): string                    // 返回缓存 URL
  async title(): Promise<string>    // 通过 Socket.IO 获取
  async content(): Promise<string>  // 通过 Socket.IO 获取

  // 交互（通过 Socket.IO 发送指令）
  async click(selector: string): Promise<void>
  async fill(selector: string, value: string): Promise<void>
  async select(selector: string, value: string): Promise<void>
  async hover(selector: string): Promise<void>

  // 定位器
  locator(selector: string): RemoteLocator
  frameLocator(frameSelector: string): RemoteFrameLocator
  deepLocator(xpath: string): RemoteDeepLocator

  // 截图（通过 Socket.IO 接收二进制数据）
  async screenshot(options?: ScreenshotOptions): Promise<Buffer>

  // 执行（通过 Socket.IO 发送 JavaScript）
  async evaluate<T>(func: () => T): Promise<T>

  // 等待
  async waitForSelector(selector: string): Promise<void>

  // 标记功能（用于调试）
  async mark(xpath: string): Promise<void>
  async unmark(xpath: string): Promise<void>
  async unmarkAll(): Promise<void>
}
```

---

### 4. MimoContext (上下文管理)

**位置**: `@mimo/lib/context`

**功能描述**: 管理远程浏览器上下文，处理多标签页的创建和切换。

**核心方法**:

```typescript
class MimoContext {
  // 标签页管理（通过 Socket.IO 获取）
  async tabs(): Promise<TabInfo[]>
  async activeTab(): Promise<TabInfo>
  async switchToTab(tabId: string): Promise<void>
  async newTab(): Promise<TabInfo>

  // 页面代理
  page(tabId?: string): RemotePage

  // 事件处理
  on(event: string, handler: Function): void
  off(event: string, handler?: Function): void

  // 生命周期
  async close(): Promise<void>
}

interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
}
```

---

### 5. Handlers (处理器)

**位置**: `@mimo/lib/handlers`

**功能描述**: 处理各种 AI 操作，通过 MimoBus 发送指令到插件端执行。

#### ActHandler

```typescript
class ActHandler {
  async handle(
    input: string | Action,
    context: MimoContext,
    options?: ActOptions
  ): Promise<ActResult> {
    // 1. 使用 AI 分析意图
    // 2. 通过 MimoBus 发送观察指令获取元素
    // 3. 通过 MimoBus 发送点击/填充指令
    // 4. 返回结果
  }
}
```

#### ExtractHandler

```typescript
class ExtractHandler {
  async handle<T>(
    instruction: string,
    schema?: T,
    context?: MimoContext,
    options?: ExtractOptions
  ): Promise<ExtractResult<T>> {
    // 1. 通过 MimoBus 获取页面内容
    // 2. 使用 AI 提取结构化数据
    // 3. 验证并返回结果
  }
}
```

#### ObserveHandler

```typescript
class ObserveHandler {
  async handle(
    instruction?: string,
    context?: MimoContext,
    options?: ObserveOptions
  ): Promise<Action[]> {
    // 1. 通过 MimoBus 发送 DOM 观察指令
    // 2. 接收插件端返回的可操作元素列表
    // 3. 返回 Action 数组
  }
}
```

---

### 6. LLMProvider (大语言模型提供者)

**位置**: `@mimo/lib/llm`

**功能描述**: 管理各种 LLM 提供商的连接和调用。

```typescript
class LLMProvider {
  getClient(model: string, options?: ClientOptions): LLMClient
}

interface LLMClient {
  chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<LLMResponse>
  streamChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncGenerator<LLMStreamChunk>
  generateStructure<T>(messages: ChatMessage[], schema: T): Promise<InferStagehandSchema<T>>
}
```

**支持的提供商**:
- OpenAI (`openai/gpt-4.1-mini`, `openai/gpt-4o`)
- Anthropic (`anthropic/claude-sonnet-4`)
- Google (`google/gemini-2.0-flash`)
- Ollama (本地模型)

---

### 7. MimoAgent (智能代理)

**位置**: `@mimo/lib/agent`

**功能描述**: 自主执行复杂的多步骤任务，内部使用 MimoBus 发送所有浏览器操作指令。

```typescript
class MimoAgent {
  async execute(options: AgentExecuteOptions): Promise<AgentResult>
  async streamExecute(options: AgentExecuteOptions): AsyncGenerator<AgentStreamEvent>
  withSystemPrompt(prompt: string): MimoAgent
  withModel(model: ModelConfiguration): MimoAgent
  withIntegrations(integrations: string[]): MimoAgent
}
```

---

## 通信流程

### 完整的请求-响应流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nitro Server (Mimo)                        │
│                                                                   │
│  const mimo = new Mimo({ model: "openai/gpt-4.1-mini" });       │
│  await mimo.init();                                               │
│                                                                   │
│  // 用户调用 act 方法                                              │
│  await mimo.act("click the login button");                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ActHandler 处理                              │
│                                                                   │
│  1. 通过 MimoBus 发送 "dom.observe" 指令                          │
│     bus.send({ type: "dom.observe", payload: {...} })            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      Next App (中转层)                            │
│                                                                   │
│  1. Socket.IO 接收 "dom.observe" 指令                             │
│  2. 通过 Extension Bridge 转发到扩展                              │
│     sendToExtension({ type: "dom.observe", payload })            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Chrome Extension API
┌─────────────────────────────────────────────────────────────────┐
│                    Plasmo App (插件端)                            │
│                                                                   │
│  1. chrome.runtime.onMessage 监听消息                            │
│  2. 调用 Stagehand 执行 DOM 观察                                  │
│     const actions = await stagehand.observe();                    │
│  3. 返回结果到 Next App                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Extension API
┌─────────────────────────────────────────────────────────────────┐
│                      Next App (中转层)                            │
│                                                                   │
│  1. 接收扩展返回的结果                                            │
│  2. 通过 Socket.IO 发送回 Nitro Server                          │
│     socket.emit("dom.observe:result", { actions })               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      Nitro Server (Mimo)                          │
│                                                                   │
│  1. MimoBus 接收 "dom.observe:result" 事件                       │
│  2. 将传递给 AI 进行分析                                          │
│  3. 确定操作后，发送 "page.click" 指令                           │
│     bus.send({ type: "page.click", payload: {...} })             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (重复上述流程)
┌─────────────────────────────────────────────────────────────────┐
│                    Plasmo App (插件端)                            │
│                                                                   │
│  1. 接收 "page.click" 指令                                       │
│  2. 调用 Stagehand 执行点击                                       │
│     await stagehand.page.click("#login-button");                │
│  3. 返回执行结果                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 指令类型映射

| Mimo 方法 | 指令类型 | 插件端执行 |
|-----------|----------|-----------|
| `page.goto()` | `page.goto` | `stagehand.page.goto()` |
| `page.click()` | `page.click` | `stagehand.page.click()` |
| `page.fill()` | `page.fill` | `stagehand.page.fill()` |
| `page.screenshot()` | `page.screenshot` | `stagehand.page.screenshot()` |
| `page.evaluate()` | `page.evaluate` | `stagehand.page.evaluate()` |
| `page.locator()` | `dom.locator` | `stagehand.page.locator()` |
| `page.deepLocator()` | `dom.deepLocator` | `stagehand.page.deepLocator()` |
| `observe()` | `dom.observe` | `stagehand.observe()` |
| `act()` | 多个指令的组合 | 多个 Stagehand 调用 |
| `extract()` | `page.content` + AI | `stagehand.page.content()` + AI 分析 |
| `agent.execute()` | 多个指令流式发送 | 多个 Stagehand 调用流式执行 |

---

## 核心类型定义

### MimoCommand

```typescript
interface MimoCommand {
  id: string;                    // UUID 唯一标识
  type: CommandType;            // 指令类型
  payload: any;                 // 指令参数
  options?: {
    timeout?: number;           // 超时时间（毫秒）
    tabId?: string;             // 目标标签页
    frameId?: string;           // 目标 Frame
  };
  timestamp: number;            // 发送时间戳
}
```

### MimoResponse

```typescript
interface MimoResponse<T = any> {
  id: string;                    // 对应的指令 ID
  success: boolean;              // 执行是否成功
  data?: T;                      // 响应数据
  error?: {
    code: string;               // 错误代码
    message: string;            // 错误消息
    stack?: string;             // 堆栈跟踪
  };
  timestamp: number;            // 响应时间戳
}
```

### TabInfo

```typescript
interface TabInfo {
  id: string;                    // 标签页 ID
  url: string;                   // 当前 URL
  title: string;                 // 页面标题
  active: boolean;              // 是否为活动标签
  windowId: number;             // 窗口 ID
}
```

---

## 使用示例

### 基础使用

```typescript
import { Mimo } from '@mimo/lib';

const mimo = new Mimo({
  model: "openai/gpt-4.1-mini",
  socket: {
    url: "ws://localhost:3000/socket.io/",
    autoReconnect: true,
  },
});

// 初始化（建立 WebSocket 连接）
await mimo.init();

// 获取活动标签页信息
const tab = await mimo.getActiveTab();
console.log('Active tab:', tab.url);

// 导航（指令发送到插件端执行）
await mimo.page.goto("https://example.com");

// 执行操作（通过 Socket.IO 通信）
await mimo.act("click the login button");

// 提取数据（通过 Socket.IO 获取页面内容）
const data = await mimo.extract("get the page title");
console.log('Title:', data.extraction);
```

### Agent 使用

```typescript
const agent = mimo.agent({
  model: "openai/gpt-4.1-mini",
});

const result = await agent.execute({
  instruction: "Log in and navigate to settings",
  maxSteps: 20,
});

console.log('Result:', result.message);
```

### 多标签页操作

```typescript
// 获取所有标签页
const tabs = await mimo.context.tabs();

// 切换到特定标签页
await mimo.context.switchToTab(tabs[1].id);

// 在特定标签页上执行操作
await mimo.act("click button", {
  tabId: tabs[1].id
});
```

---

## 与 Stagehand 的兼容性

Mimo Library 保持与 Stagehand V3 的 API 兼容性，但底层实现不同：

```typescript
// Stagehand（直接控制浏览器）
const stagehand = new Stagehand({ model: "openai/gpt-4.1-mini" });
await stagehand.init();
await stagehand.act("click button");  // 直接调用 Playwright API

// Mimo（通过 Socket.IO 远程控制）
const mimo = new Mimo({ model: "openai/gpt-4.1-mini" });
await mimo.init();
await mimo.act("click button");  // 通过 MimoBus 发送指令到插件端
```

主要区别：
- Mimo 运行在 Nitro 服务器中，不直接控制浏览器
- 所有浏览器操作通过 MimoBus → Socket.IO → Next App → Extension API → Plasmo App 的链路执行
- 支持多标签页远程操作
- 支持流式数据传输（截图、观察结果等）
