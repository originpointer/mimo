# MimoAgent 和 LLM 类详细文档

## 概述

MimoAgent 是运行在 Nitro 服务器中的智能代理，可以自主执行复杂的多步骤任务。**所有浏览器操作都通过 MimoBus 发送到前端执行**。

**位置**: `@mimo/lib/agent`

**架构图**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MimoAgent (Nitro Server)                     │
│                                                                   │
│  智能决策循环                                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. 使用 LLM 分析当前状态                                      │ │
│  │ 2. 决定下一步操作                                             │ │
│  │ 3. 通过 MimoBus 发送指令                                      │ │
│  │ 4. 接收执行结果                                               │ │
│  │ 5. 重复直到任务完成                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────┐                                                │
│  │   MimoBus     │ ◄────── 所有浏览器操作指令通过这里发送          │
│  └───────┬───────┘                                                │
└──────────┼─────────────────────────────────────────────────────────┘
           │ Socket.IO
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next App                                    │
│  ┌───────────────┐                                                │
│  │ Socket Client │                                                │
│  └───────┬───────┘                                                │
└──────────┼─────────────────────────────────────────────────────────┘
           │ Chrome Extension API
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Plasmo App (Extension)                        │
│  ┌───────────────┐                                                │
│  │   Stagehand   │ ◄────── Agent 指令在 Stagehand 中执行            │
│  └───────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## MimoAgent 类

### 导入

```typescript
import { MimoAgent } from '@mimo/lib/agent';
// 或通过 Mimo 实例创建
const agent = mimo.agent(config?: AgentConfig): MimoAgent
```

### 构造函数

MimoAgent 由 Mimo 类创建，持有对 MimoBus 的引用。

```typescript
class MimoAgent {
  constructor(
    private bus: MimoBus,           // 通信核心
    private llmProvider: LLMProvider, // LLM 提供者
    config: AgentConfig
  )
}
```

### AgentConfig

```typescript
interface AgentConfig {
  // 模型配置
  model?: ModelConfiguration;           // 推理模型
  executionModel?: ModelConfiguration;  // 执行模型（可不同）

  // 系统提示词
  systemPrompt?: string;                // 自定义系统提示词

  // Agent 模式
  mode?: "dom" | "hybrid" | "cua";

  // 计算机使用模式
  cua?: boolean;                        // 启用 CUA

  // 集成
  integrations?: string[];              // MCP 集成 URL
}
```

### Agent 模式说明

| 模式 | 说明 | 支持的模型 |
|------|------|------------|
| `dom` | 使用 DOM 选择器进行操作 | 所有模型 |
| `hybrid` | 结合 DOM 和坐标进行操作 | Gemini 3+, Claude Sonnet 4+ |
| `cua` | 计算机使用模式 | Claude 3.5 Sonnet+, Gemini 2.5+ |

---

## 方法

### execute()

执行 Agent 任务。

```typescript
async execute(
  options: AgentExecuteOptions
): Promise<AgentResult>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `AgentExecuteOptions` | 执行选项 |

**AgentExecuteOptions**:

```typescript
interface AgentExecuteOptions {
  instruction: string;           // 任务指令
  maxSteps?: number;             // 最大步数（默认 25）
  highlightCursor?: boolean;     // 高亮光标（默认 true，hybrid 模式）
}
```

**返回**: `Promise<AgentResult>`

```typescript
interface AgentResult {
  success: boolean;              // 是否成功
  message: string;               // 结果消息
  actions: AgentAction[];        // 执行的操作列表
  completed: boolean;            // 是否完成
  metadata?: Record<string, unknown>;  // 额外元数据
  usage?: AgentUsage;            // Token 使用统计
}

interface AgentAction {
  type: string;                  // 操作类型
  reasoning?: string;            // 推理过程
  taskCompleted?: boolean;       // 是否完成任务
  action?: string;               // 执行的操作
  timeMs?: number;               // 耗时
  pageText?: string;             // 页面文本
  pageUrl?: string;              // 页面 URL
  instruction?: string;          // 指令
}

interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  inferenceTimeMs: number;
}
```

**抛出**:
- `MimoAgentTimeoutError` - Agent 执行超时
- `MimoAgentMaxStepsError` - 达到最大步数
- `MimoAgentExecutionError` - 执行错误

**示例**:

```typescript
const agent = mimo.agent({
  model: "openai/gpt-4.1-mini",
  systemPrompt: "You are a helpful assistant."
});

const result = await agent.execute({
  instruction: "Log in with username 'demo' and password 'test123', then navigate to settings",
  maxSteps: 20
});

console.log('Result:', result.message);
console.log('Actions:', result.actions);
console.log('Usage:', result.usage);
```

**内部流程**:

```
1. 初始化
   ├── 设置 LLM 客户端
   └── 连接 MimoBus

2. 执行循环（每一步）
   ├── 使用 LLM 分析当前状态
   ├── 决定下一步操作
   ├── 通过 MimoBus 发送指令
   │   ├── bus.send({ type: "dom.observe" }) - 获取可操作元素
   │   ├── bus.send({ type: "page.click" }) - 执行点击
   │   ├── bus.send({ type: "page.fill" }) - 填充表单
   │   └── bus.send({ type: "page.screenshot" }) - 获取截图（用于多模态）
   ├── 等待前端响应
   └── 检查任务是否完成

3. 返回结果
   ├── 成功的操作列表
   ├── Token 使用统计
   └── 完成状态
```

---

### streamExecute()

流式执行 Agent 任务，实时返回执行进度。

```typescript
async streamExecute(
  options: AgentExecuteOptions
): AsyncGenerator<AgentStreamEvent>
```

**参数**: 同 `execute()`

**返回**: `AsyncGenerator<AgentStreamEvent>`

```typescript
interface AgentStreamEvent {
  type: "start" | "action" | "thinking" | "finish" | "error";
  data?: {
    action?: AgentAction;
    reasoning?: string;
    error?: string;
    result?: AgentResult;
  };
}
```

**示例**:

```typescript
const agent = mimo.agent();

for await (const event of await agent.streamExecute({
  instruction: "Search for a product",
  maxSteps: 10
})) {
  switch (event.type) {
    case "start":
      console.log("Agent started");
      break;
    case "thinking":
      console.log("Thinking:", event.data?.reasoning);
      break;
    case "action":
      console.log("Action:", event.data?.action);
      break;
    case "finish":
      console.log("Result:", event.data?.result);
      break;
    case "error":
      console.error("Error:", event.data?.error);
      break;
  }
}
```

**内部流程**:

```
流式执行通过 MimoBus 的流式传输能力实现：

1. 发送流式指令
   └── bus.sendWithStream({ type: "agent.execute.stream" })

2. 监听流式事件
   ├── on("stream.data") - 接收进度更新
   ├── on("stream.thinking") - 接收推理过程
   ├── on("stream.action") - 接收操作执行
   └── on("stream.end") - 接收完成信号
```

---

### withSystemPrompt()

设置系统提示词。

```typescript
withSystemPrompt(prompt: string): MimoAgent
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt` | `string` | 系统提示词 |

**返回**: `MimoAgent` - 链式调用

**示例**:

```typescript
const agent = mimo.agent()
  .withSystemPrompt("You are a helpful assistant that completes tasks efficiently.");
```

---

### withModel()

设置模型配置。

```typescript
withModel(model: ModelConfiguration): MimoAgent
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | `ModelConfiguration` | 模型配置 |

**返回**: `MimoAgent`

**示例**:

```typescript
const agent = mimo.agent()
  .withModel("anthropic/claude-sonnet-4");
```

---

### withIntegrations()

添加 MCP 集成。

```typescript
withIntegrations(integrations: string[]): MimoAgent
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `integrations` | `string[]` | MCP 集成 URL 列表 |

**返回**: `MimoAgent`

**示例**:

```typescript
const agent = mimo.agent()
  .withIntegrations([
    "https://mcp.example.com/search?apiKey=xxx"
  ]);
```

---

## Agent 使用示例

### 基础任务

```typescript
const agent = mimo.agent();

await agent.execute({
  instruction: "Click the login button, enter username and password, then click submit"
});
```

**通信流程**:

```
Nitro Server                     Frontend (Next App → Extension)
─────────────────────────────────────────────────────────────
1. agent.execute() 启动
                ↓
2. LLM 分析任务
                ↓
3. bus.send({ type: "dom.observe" }) ──────────────────→ Stagehand.observe()
                ←──────────────────────────────────────── 返回可操作元素
4. LLM 选择操作
                ↓
5. bus.send({ type: "page.click", payload: {...} }) ────→ Stagehand.act()
                ←──────────────────────────────────────── 返回执行结果
6. 重复直到完成
```

### 多步骤任务

```typescript
const agent = mimo.agent({
  model: "openai/gpt-4.1-mini",
});

const result = await agent.execute({
  instruction: `
    1. Navigate to https://example.com
    2. Find the search box
    3. Search for "browser automation"
    4. Click the first result
  `,
  maxSteps: 15
});

console.log('Task completed:', result.completed);
```

### 计算机使用模式

```typescript
const agent = mimo.agent({
  cua: true,
  model: "anthropic/claude-sonnet-4",
  systemPrompt: "You are a helpful assistant that can control a browser."
});

await agent.execute({
  instruction: "Apply for a library card at the San Francisco Public Library",
  maxSteps: 30,
  highlightCursor: true
});
```

**CUA 模式通信流程**:

```
Nitro Server                     Frontend
─────────────────────────────────────────────────────────────
1. Agent 决策需要截图
                ↓
2. bus.send({ type: "page.screenshot" }) ─────────────────→ Extension 截图
                ←───────────────────────────────────────── 返回 Base64 图片
3. LLM 多模态分析（图片 + 指令）
                ↓
4. bus.send({ type: "page.click", payload: { x, y } }) ───→ 点击坐标
                ←───────────────────────────────────────── 返回结果
5. 重复循环
```

### 带外部工具

```typescript
const agent = mimo.agent({
  integrations: [
    `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`,
    `https://mcp.weather.com/mcp?apiKey=${process.env.WEATHER_API_KEY}`
  ],
  systemPrompt: "You have access to search and weather tools."
});

await agent.execute({
  instruction: "Search for today's weather in San Francisco and summarize it"
});
```

---

## Agent 指令类型

Agent 通过 MimoBus 发送的指令类型：

```typescript
type AgentCommandType =
  // Agent 控制
  | "agent.start"              // 启动 Agent
  | "agent.step"               // 执行一步
  | "agent.pause"              // 暂停
  | "agent.resume"             // 恢复
  | "agent.stop"               // 停止

  // 观察和感知
  | "agent.observe"            // 观察页面
  | "agent.screenshot"         // 获取截图（多模态）

  // 流式传输
  | "agent.stream.start"       // 开始流式执行
  | "agent.stream.data"        // 流式数据
  | "agent.stream.end"         // 结束流式执行
```

### Agent 指令 Payload 格式

#### agent.start

```typescript
{
  type: "agent.start",
  payload: {
    instruction: string;       // 任务指令
    maxSteps?: number;         // 最大步数
    mode?: string;             // Agent 模式
  }
}
```

#### agent.step

```typescript
{
  type: "agent.step",
  payload: {
    stepNumber: number;        // 步骤编号
    context: {                 // 当前上下文
      pageUrl: string;
      previousActions: string[];
      remainingSteps: number;
    }
  }
}
```

#### agent.observe

```typescript
{
  type: "agent.observe",
  payload: {
    instruction?: string;      // 观察指令
    includeScreenshot?: boolean; // 是否包含截图
  }
}
```

---

## Agent 响应格式

```typescript
interface AgentResponse {
  id: string;                  // 对应的指令 ID
  success: boolean;            // 是否成功
  data?: {
    step?: {
      number: number;          // 步骤编号
      action: string;          // 执行的操作
      reasoning: string;       // 推理过程
      observation: string;     // 观察结果
    };
    progress?: {
      current: number;         // 当前步数
      total: number;           // 总步数
      percentage: number;      // 百分比
    };
    screenshot?: string;       // Base64 截图
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}
```

---

## 错误处理

### 错误类

```typescript
// Agent 超时
class MimoAgentTimeoutError extends MimoError {
  constructor(message: string, public timeout: number)
}

// 达到最大步数
class MimoAgentMaxStepsError extends MimoError {
  constructor(message: string, public maxSteps: number)
}

// Agent 执行错误
class MimoAgentExecutionError extends MimoError {
  constructor(message: string, public step: number, public action: string)
}
```

### 错误处理示例

```typescript
try {
  await agent.execute({
    instruction: "Complete the task",
    maxSteps: 10
  });
} catch (error) {
  if (error instanceof MimoAgentTimeoutError) {
    console.log(`Agent 执行超时: ${error.timeout}ms`);
  } else if (error instanceof MimoAgentMaxStepsError) {
    console.log(`达到最大步数: ${error.maxSteps}`);
  } else if (error instanceof MimoAgentExecutionError) {
    console.log(`执行错误（步骤 ${error.step}）: ${error.action}`);
  }
}
```

---

## LLMProvider 类

大语言模型提供者管理器。运行在 Nitro 服务器中，与 MimoBus 无关（纯服务端）。

### 导入

```typescript
import { LLMProvider } from '@mimo/lib/llm';
```

### 方法

#### getClient()

获取指定模型的 LLM 客户端。

```typescript
getClient(
  model: string,
  options?: ClientOptions
): LLMClient
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | `string` | 模型名称（如 `openai/gpt-4.1-mini`） |
| `options` | `ClientOptions` | 客户端选项 |

**ClientOptions**:

```typescript
interface ClientOptions {
  apiKey?: string;               // API 密钥
  baseURL?: string;              // 自定义 Base URL
  timeout?: number;              // 超时时间
  maxRetries?: number;           // 最大重试次数
}
```

**返回**: `LLMClient`

**示例**:

```typescript
const provider = new LLMProvider();

// 使用默认配置
const client1 = provider.getClient("openai/gpt-4.1-mini");

// 自定义配置
const client2 = provider.getClient("anthropic/claude-sonnet-4", {
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com",
  timeout: 60000
});
```

---

#### supportedProviders

获取支持的提供商列表。

```typescript
get supportedProviders(): string[]
```

**返回**: `string[]`

**示例**:

```typescript
const provider = new LLMProvider();
console.log('Supported providers:', provider.supportedProviders);
// ["openai", "anthropic", "google", "ollama"]
```

---

### 支持的模型

#### OpenAI

```typescript
const client = provider.getClient("openai/gpt-4.1-mini");
const client = provider.getClient("openai/gpt-4o");
const client = provider.getClient("openai/gpt-4o-mini");
const client = provider.getClient("openai/o1-mini");
const client = provider.getClient("openai/o1-preview");
```

#### Anthropic

```typescript
const client = provider.getClient("anthropic/claude-sonnet-4");
const client = provider.getClient("anthropic/claude-sonnet-4-5-20250929");
const client = provider.getClient("anthropic/claude-haiku-4");
const client = provider.getClient("anthropic/claude-opus-4");
```

#### Google

```typescript
const client = provider.getClient("google/gemini-2.0-flash");
const client = provider.getClient("google/gemini-2.5-computer-use-preview");
const client = provider.getClient("google/gemini-1.5-pro");
```

#### Ollama (本地模型)

```typescript
const client = provider.getClient("ollama/llama3.2");
const client = provider.getClient("ollama/deepseek-coder");
const client = provider.getClient("ollama/mistral");
```

---

## LLMClient 接口

大语言模型客户端接口。

### 方法

#### chatCompletion()

执行聊天完成。

```typescript
async chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions
): Promise<LLMResponse>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `messages` | `ChatMessage[]` | 聊天消息列表 |
| `options` | `ChatCompletionOptions` | 可选配置 |

**ChatMessage**:

```typescript
type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "system"; content: string }
  | {
      role: "user";
      content: Array<{
        type: "text" | "image";
        text?: string;
        image?: string | { url: string };
      }>;
    };
```

**ChatCompletionOptions**:

```typescript
interface ChatCompletionOptions {
  temperature?: number;         // 温度 (0-1)
  maxTokens?: number;           // 最大 token 数
  topP?: number;                // Top-P 采样
  stop?: string[];              // 停止序列
}
```

**LLMResponse**:

```typescript
interface LLMResponse {
  content: string;              // 响应内容
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  };
  model: string;                // 使用的模型
}
```

**示例**:

```typescript
const response = await client.chatCompletion([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is the capital of France?" }
], {
  temperature: 0.7,
  maxTokens: 100
});

console.log('Response:', response.content);
console.log('Usage:', response.usage);
```

---

#### streamChatCompletion()

流式聊天完成。

```typescript
async streamChatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions
): AsyncGenerator<LLMStreamChunk>
```

**LLMStreamChunk**:

```typescript
interface LLMStreamChunk {
  content: string;              // 增量内容
  delta?: {                     // 增量信息
    role?: string;
    content?: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

**示例**:

```typescript
const stream = await client.streamChatCompletion([
  { role: "user", content: "Tell me a story" }
]);

let fullContent = "";
for await (const chunk of stream) {
  fullContent += chunk.content;
  process.stdout.write(chunk.content);
}
```

---

#### generateStructure()

生成结构化输出。

```typescript
async generateStructure<T>(
  messages: ChatMessage[],
  schema: StagehandZodSchema<T>
): Promise<InferStagehandSchema<T>>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `messages` | `ChatMessage[]` | 聊天消息 |
| `schema` | `StagehandZodSchema<T>` | Zod schema |

**返回**: `Promise<InferStagehandSchema<T>>`

**示例**:

```typescript
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string(),
  price: z.string(),
  inStock: z.boolean(),
});

const product = await client.generateStructure(
  [
    { role: "user", content: "Extract product information from the page" }
  ],
  ProductSchema
);

console.log(product.name);  // 类型安全
```

---

### 自定义 LLMClient

实现自定义 LLM 客户端。

```typescript
import { LLMClient } from '@mimo/lib/llm';

class CustomLLMClient extends LLMClient {
  constructor(private apiKey: string) {
    super();
  }

  async chatCompletion(messages, options) {
    const response = await fetch('https://api.example.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, options }),
    });

    const data = await response.json();
    return {
      content: data.content,
      usage: data.usage,
      model: data.model,
    };
  }
}

// 注册自定义客户端
LLMProvider.register("custom", CustomLLMClient);

// 使用
const client = provider.getClient("custom/my-model");
```

---

## 模型配置

### 字符串配置

```typescript
const mimo = new Mimo({
  model: "openai/gpt-4.1-mini"
});
```

### 对象配置

```typescript
const mimo = new Mimo({
  model: {
    modelName: "anthropic/claude-sonnet-4",
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: "https://api.anthropic.com"
  }
});
```

### 运行时覆盖

```typescript
// Agent 时覆盖模型
const agent = mimo.agent({
  model: "anthropic/claude-opus-4",
  executionModel: "openai/gpt-4.1-mini"  // 执行使用不同模型
});
```

---

## Agent 和 LLM 交互流程

```typescript
// Agent 内部使用 LLM 的流程

class MimoAgent {
  async execute(options: AgentExecuteOptions): Promise<AgentResult> {
    const llmClient = this.llmProvider.getClient(this.model);

    for (let step = 0; step < maxSteps; step++) {
      // 1. 获取当前页面状态（通过 MimoBus）
      const observeResponse = await this.bus.send({
        type: "dom.observe",
        payload: { instruction: options.instruction }
      });

      // 2. 使用 LLM 决策
      const decision = await llmClient.chatCompletion([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: `
          当前页面: ${observeResponse.data}
          任务: ${options.instruction}
          决定下一步操作
        ` }
      ]);

      // 3. 执行操作（通过 MimoBus）
      const actionResponse = await this.bus.send({
        type: "page.act",
        payload: { action: decision.content }
      });

      // 4. 检查是否完成
      if (actionResponse.data.completed) {
        break;
      }
    }

    return result;
  }
}
```
