# Mimo API 参考

## 核心类

### Mimo

主类，提供浏览器自动化的统一入口。

#### 构造函数

```typescript
constructor(opts?: MimoOptions)
```

**参数：**
- `opts.socket.url` - Socket.IO 服务器地址
- `opts.socket.autoReconnect` - 是否自动重连 (默认: true)
- `opts.socket.reconnectInterval` - 重连间隔，毫秒 (默认: 1000)
- `opts.model` - 默认模型
- `opts.verbose` - 日志级别: 0=静默, 1=正常, 2=调试 (默认: 1)
- `opts.logger` - 自定义日志函数
- `opts.cacheDir` - 缓存目录
- `opts.commandTimeout` - 命令超时时间，毫秒 (默认: 30000)
- `opts.defaultTabId` - 默认标签页 ID

**示例：**
```typescript
const mimo = new Mimo({
  socket: {
    url: 'ws://localhost:3000',
    autoReconnect: true,
    reconnectInterval: 1000,
  },
  verbose: 1,
  commandTimeout: 30000,
});
```

#### 方法

##### init()

```typescript
async init(): Promise<void>
```

初始化 Mimo 实例，建立 WebSocket 连接。

**异常：**
- `MimoInitError` - 初始化失败

**示例：**
```typescript
await mimo.init();
```

##### act()

```typescript
async act(input: string | Action, options?: ActOptions): Promise<ActResult>
```

执行浏览器操作。

**参数：**
- `input` - 操作描述（字符串）或操作对象
- `options.variables` - 模板变量
- `options.timeout` - 超时时间
- `options.tabId` - 标签页 ID

**返回：**
```typescript
interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
  actions: Action[];
}
```

**示例：**
```typescript
// 字符串描述
const result = await mimo.act('点击登录按钮');

// 操作对象
const result = await mimo.act({
  selector: '#login-btn',
  description: '点击登录按钮',
  method: 'click',
});

// 带变量
const result = await mimo.act('输入用户名 {{username}}', {
  variables: { username: 'alice' },
});
```

##### extract()

```typescript
async extract<T>(instruction: string, schema?: ZodSchema<T>, options?: ExtractOptions): Promise<ExtractResult<T>>
```

从页面提取数据。

**参数：**
- `instruction` - 提取指令
- `schema` - Zod 数据结构定义
- `options.selector` - CSS 选择器
- `options.timeout` - 超时时间
- `options.tabId` - 标签页 ID

**返回：**
```typescript
interface ExtractResult<T> {
  extraction: T;
  success: boolean;
  message?: string;
}
```

**示例：**
```typescript
// 简单提取
const result = await mimo.extract('获取商品价格');
console.log(result.extraction); // "¥299.00"

// 结构化提取
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  price: z.string(),
});

const result = await mimo.extract('获取商品信息', schema);
console.log(result.extraction);
// { name: "iPhone", price: "¥5999" }
```

##### observe()

```typescript
async observe(instruction?: string, options?: ObserveOptions): Promise<Action[]>
```

观察页面，获取可执行的操作列表。

**参数：**
- `instruction` - 观察指令
- `options.selector` - CSS 选择器
- `options.timeout` - 超时时间
- `options.tabId` - 标签页 ID

**返回：**
```typescript
Action[]
```

**示例：**
```typescript
const actions = await mimo.observe('登录页面');
console.log(actions);
// [
//   { description: "点击登录按钮", selector: "#login-btn" },
//   { description: "输入用户名", selector: "#username" }
// ]
```

##### agent()

```typescript
agent(config?: AgentConfig): MimoAgent
```

创建 Agent 实例。

**参数：**
- `config.model` - 模型名称
- `config.executionModel` - 执行模型
- `config.systemPrompt` - 系统提示词
- `config.mode` - 模式: 'dom' | 'hybrid' | 'cua'
- `config.maxSteps` - 最大步数

**返回：**
```typescript
MimoAgent
```

**示例：**
```typescript
const agent = mimo.agent({
  model: 'openai/gpt-4o-mini',
  maxSteps: 25,
});
```

##### close()

```typescript
async close(options?: { force?: boolean }): Promise<void>
```

关闭 Mimo 实例，释放资源。

**参数：**
- `options.force` - 强制关闭，忽略错误

**示例：**
```typescript
await mimo.close();
await mimo.close({ force: true });
```

##### getBus()

```typescript
getBus(): MimoBus
```

获取 MimoBus 实例。

##### page

```typescript
get page(): RemotePage
```

获取当前页面实例。

##### context

```typescript
get context(): MimoContext
```

获取浏览器上下文实例。

##### metrics()

```typescript
async metrics(): Promise<MimoMetrics>
```

获取使用指标。

**返回：**
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

##### history()

```typescript
async history(): Promise<ReadonlyArray<HistoryEntry>>
```

获取操作历史。

##### getActiveTab()

```typescript
async getActiveTab(): Promise<Tab>
```

获取当前活动标签页。

##### getTabs()

```typescript
async getTabs(): Promise<Tab[]>
```

获取所有标签页。

##### switchToTab()

```typescript
async switchToTab(tabId: string): Promise<void>
```

切换到指定标签页。

##### closeTab()

```typescript
async closeTab(tabId: string): Promise<void>
```

关闭指定标签页。

#### 事件

```typescript
mimo.on('connected', () => {});
mimo.on('disconnected', (data) => {});
mimo.on('command.sent', (data) => {});
mimo.on('command.result', (data) => {});
mimo.on('screenshot', (data) => {});
mimo.on('tab.changed', (data) => {});
mimo.on('tab.closed', (data) => {});
mimo.on('error', (data) => {});
```

---

### RemotePage

远程页面代理。

#### 方法

##### goto()

```typescript
async goto(url: string, options?: NavigateOptions): Promise<void>
```

导航到指定 URL。

**参数：**
- `url` - 目标 URL
- `options.waitUntil` - 等待条件: 'load' | 'domcontentloaded' | 'networkidle'
- `options.timeout` - 超时时间

**示例：**
```typescript
await page.goto('https://example.com');
await page.goto('https://example.com', { waitUntil: 'networkidle' });
```

##### click()

```typescript
async click(selector: string, options?: ClickOptions): Promise<void>
```

点击元素。

**参数：**
- `selector` - CSS 选择器
- `options.timeout` - 超时时间
- `options.waitForNavigation` - 是否等待导航

**示例：**
```typescript
await page.click('#submit-button');
await page.click('.next-page', { waitForNavigation: true });
```

##### fill()

```typescript
async fill(selector: string, value: string): Promise<void>
```

填充输入框。

**参数：**
- `selector` - CSS 选择器
- `value` - 填充值

**示例：**
```typescript
await page.fill('#username', 'alice');
await page.fill('#email', 'alice@example.com');
```

##### select()

```typescript
async select(selector: string, value: string): Promise<void>
```

选择下拉选项。

**示例：**
```typescript
await page.select('#country', 'China');
```

##### screenshot()

```typescript
async screenshot(options?: ScreenshotOptions): Promise<Buffer>
```

截图。

**参数：**
- `options.type` - 图片类型: 'png' | 'jpeg' (默认: 'png')
- `options.fullPage` - 是否截取整页 (默认: false)
- `options.clip` - 裁剪区域 { x, y, width, height }

**返回：**
- `Buffer` - 图片数据

**示例：**
```typescript
const buffer = await page.screenshot();
const fullPage = await page.screenshot({ fullPage: true });
const clipped = await page.screenshot({
  clip: { x: 0, y: 0, width: 800, height: 600 }
});
```

##### pdf()

```typescript
async pdf(options?: PdfOptions): Promise<Buffer>
```

生成 PDF。

##### evaluate()

```typescript
async evaluate<T>(fn: () => T): Promise<T>
```

在页面上下文中执行 JavaScript。

**示例：**
```typescript
const title = await page.evaluate(() => document.title);
const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).map(a => a.href);
});
```

##### locator()

```typescript
locator(selector: string): RemoteLocator
```

创建元素定位器。

**示例：**
```typescript
const button = page.locator('#submit-btn');
await button.click();
```

##### deepLocator()

```typescript
deepLocator(xpath: string): RemoteDeepLocator
```

创建 XPath 元素定位器。

**示例：**
```typescript
const element = page.deepLocator('//div[@class="product"]//span[@class="price"]');
const text = await element.innerText();
```

---

### RemoteLocator

元素定位器（CSS 选择器）。

#### 方法

##### click()

```typescript
async click(): Promise<void>
```

点击元素。

##### fill()

```typescript
async fill(value: string): Promise<void>
```

填充输入框。

##### innerText()

```typescript
async innerText(): Promise<string>
```

获取元素文本。

##### innerHTML()

```typescript
async innerHTML(): Promise<string>
```

获取元素 HTML。

##### getAttribute()

```typescript
async getAttribute(name: string): Promise<string | null>
```

获取元素属性。

##### isVisible()

```typescript
async isVisible(): Promise<boolean>
```

检查元素是否可见。

##### isHidden()

```typescript
async isHidden(): Promise<boolean>
```

检查元素是否隐藏。

---

### RemoteDeepLocator

元素定位器（XPath）。

#### 方法

##### click()

```typescript
async click(): Promise<void>
```

点击元素。

##### innerText()

```typescript
async innerText(): Promise<string>
```

获取元素文本。

##### innerHTML()

```typescript
async innerHTML(): Promise<string>
```

获取元素 HTML。

##### getAttribute()

```typescript
async getAttribute(name: string): Promise<string | null>
```

获取元素属性。

---

### MimoContext

浏览器上下文管理。

#### 方法

##### activeTab()

```typescript
async activeTab(): Promise<Tab>
```

获取当前活动标签页。

##### tabs()

```typescript
async tabs(): Promise<Tab[]>
```

获取所有标签页。

##### switchToTab()

```typescript
async switchToTab(tabId: string): Promise<void>
```

切换到指定标签页。

##### closeTab()

```typescript
async closeTab(tabId: string): Promise<void>
```

关闭指定标签页。

---

### MimoAgent

智能代理。

#### 方法

##### execute()

```typescript
async execute(options: AgentExecuteOptions): Promise<AgentResult>
```

执行任务。

**参数：**
```typescript
interface AgentExecuteOptions {
  instruction: string;      // 任务指令
  maxSteps?: number;        // 最大步数
  timeout?: number;         // 超时时间
}
```

**返回：**
```typescript
interface AgentResult {
  success: boolean;
  message: string;
  actions: AgentAction[];
  completed: boolean;
  usage: AgentUsage;
}
```

**示例：**
```typescript
const result = await agent.execute({
  instruction: '在亚马逊搜索 iPhone 并加入购物车',
  maxSteps: 25,
});
```

##### streamExecute()

```typescript
async *streamExecute(options: AgentExecuteOptions): AsyncGenerator<AgentStreamEvent>
```

流式执行任务。

**示例：**
```typescript
for await (const event of await agent.streamExecute({ instruction: '...' })) {
  if (event.type === 'step') {
    console.log('执行步骤:', event.data);
  } else if (event.type === 'finish') {
    console.log('完成:', event.data);
  }
}
```

##### withSystemPrompt()

```typescript
withSystemPrompt(prompt: string): this
```

设置系统提示词。

##### withModel()

```typescript
withModel(model: string): this
```

设置模型。

---

### LLMProvider

LLM 提供商管理。

#### 方法

##### getClient()

```typescript
getClient(model: string): LLMClient
```

获取指定模型的客户端。

**示例：**
```typescript
const client = llmProvider.getClient('openai/gpt-4o-mini');
```

---

### LLMClient

LLM 客户端。

#### 方法

##### chatCompletion()

```typescript
async chatCompletion(messages: ChatMessage[]): Promise<ChatResponse>
```

聊天补全。

**参数：**
```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

**返回：**
```typescript
interface ChatResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

---

### MimoBus

通信核心。

#### 方法

##### connect()

```typescript
async connect(): Promise<void>
```

建立连接。

##### disconnect()

```typescript
async disconnect(): Promise<void>
```

断开连接。

##### send()

```typescript
async send<T>(command: MimoCommand): Promise<MimoResponse<T>>
```

发送命令。

##### sendWithStream()

```typescript
async sendWithStream<T>(command: MimoCommand): AsyncGenerator<MimoStreamEvent<T>>
```

发送命令，流式接收响应。

##### isConnected()

```typescript
isConnected(): boolean
```

检查是否已连接。

#### 事件

```typescript
bus.on('connected', () => {});
bus.on('disconnected', (data) => {});
bus.on('message', (data) => {});
bus.on('error', (data) => {});
```

---

## 类型定义

### MimoOptions

```typescript
interface MimoOptions {
  socket?: {
    url?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
  };
  model?: ModelConfiguration;
  llmClient?: any;
  systemPrompt?: string;
  verbose?: 0 | 1 | 2;
  logger?: (logLine: LogLine) => void;
  cacheDir?: string;
  experimental?: boolean;
  commandTimeout?: number;
  selfHeal?: boolean;
  defaultTabId?: string;
}
```

### Action

```typescript
interface Action {
  selector?: string;
  description: string;
  method?: string;
  arguments?: string[];
}
```

### ActOptions

```typescript
interface ActOptions {
  model?: ModelConfiguration;
  variables?: Record<string, string>;
  timeout?: number;
  tabId?: string;
}
```

### ActResult

```typescript
interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
  actions: Action[];
}
```

### ExtractOptions

```typescript
interface ExtractOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;
  tabId?: string;
}
```

### ExtractResult

```typescript
interface ExtractResult<T = any> {
  extraction: T;
  success: boolean;
  message?: string;
}
```

### ObserveOptions

```typescript
interface ObserveOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;
  tabId?: string;
}
```

### HistoryEntry

```typescript
interface HistoryEntry {
  method: 'act' | 'extract' | 'observe' | 'navigate' | 'agent';
  parameters: unknown;
  result: unknown;
  timestamp: string;
  commandId?: string;
  tabId?: string;
}
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
  code = 'MIMO_INIT_ERROR';
}
```

### MimoTimeoutError

超时错误。

```typescript
class MimoTimeoutError extends MimoError {
  code = 'MIMO_TIMEOUT';
  constructor(message: string, public timeout: number)
}
```

### MimoNotConnectedError

未连接错误。

```typescript
class MimoNotConnectedError extends MimoError {
  code = 'MIMO_NOT_CONNECTED';
}
```

### MimoCommandError

命令执行错误。

```typescript
class MimoCommandError extends MimoError {
  code = 'MIMO_COMMAND_ERROR';
  constructor(
    message: string,
    public commandId: string,
    public command: any
  )
}
```

---

## 下一步

- 浏览 [使用示例](./03-使用示例.md) 学习实际用法
