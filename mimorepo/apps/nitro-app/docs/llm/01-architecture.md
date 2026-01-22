# 系统架构设计 (System Architecture & Design)

## 概述 (Overview)

本文档介绍 Nitro-app 的 LLM 系统架构，并与 Stagehand 的设计进行对比分析，帮助理解两者之间的设计差异与联系。

## Stagehand vs Nitro-app 架构对比

### Stagehand 架构模式

```
┌─────────────────────────────────────────────────────────────────┐
│                        Stagehand V3                             │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │   User Code  │───▶│ new Stagehand({ model: "gpt-4.1" })  │  │
│  └──────────────┘    └──────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    resolveModelConfiguration()            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    LLMProvider                            │  │
│  │                  (Factory Pattern)                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ OpenAIClient │  │AnthropicCl.  │  │AISdkClient   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Handlers                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ ActHandler   │  │ExtractHandler│  │ObserveHandler│    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Inference Functions                          │  │
│  │     (act / extract / observe with AI SDK)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**关键特性**:
- 抽象工厂模式创建 LLM 客户端
- 统一的 LLMClient 接口
- 内置 Playwright 集成
- act/extract/observe 高级操作

### Nitro-app 架构模式

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nitro-App                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Frontend (Next-App)                    │  │
│  │              @ai-sdk/react + useChat()                   │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │ HTTP POST /api/chat             │
│                               ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Nitro Route Handler                          │  │
│  │           server/routes/api/chat.post.ts                 │  │
│  │                                                             │  │
│  │  1. Parse messages from request body                       │  │
│  │  2. Configure environment variables                        │  │
│  │  3. Create OpenAI provider                                 │  │
│  │  4. Call streamText()                                      │  │
│  │  5. Return UI Message Stream                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              @ai-sdk/openai Provider                      │  │
│  │           createOpenAI({ apiKey, baseURL })              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AI SDK Operations                           │  │
│  │    streamText() | generateText() | generateObject()      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MCP Tool Registry                           │  │
│  │  (Optional tool calling via MCP protocol)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              External LLM Provider                        │  │
│  │      Qwen/DashScope | OpenAI | Ollama                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**关键特性**:
- 直接使用 AI SDK，简化抽象层
- HTTP API 驱动的架构
- 前后端分离（Next.js + Nitro）
- MCP 工具系统集成

## 组件概览 (Component Overview)

### 1. Provider 层

**Stagehand**:
```typescript
// .refer/.sources/stagehand/packages/core/lib/v3/llm/LLMProvider.ts
class LLMProvider {
  getClient(modelName: AvailableModel, options?: ClientOptions): LLMClient {
    const provider = this.getModelProvider(modelName);
    switch (provider) {
      case "openai": return new OpenAIClient(...);
      case "anthropic": return new AnthropicClient(...);
      // ...
    }
  }
}
```

**Nitro-app**:
```typescript
// server/routes/api/chat.post.ts
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
});
```

### 2. 操作层

**Stagehand**:
```typescript
// 高级抽象操作
await stagehand.act("click the submit button");
await stagehand.extract({ schema: ResumeSchema });
await stagehand.observe();
```

**Nitro-app**:
```typescript
// 直接使用 AI SDK
import { streamText, generateObject, generateText } from "ai";

// 流式文本生成
const result = streamText({ model, messages });

// 结构化输出
const result = await generateObject({ model, schema });

// 普通文本生成
const result = await generateText({ model, messages });
```

### 3. Handler 层

**Stagehand**:
```typescript
// .refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts
class ActHandler {
  constructor(
    private llmClient: LLMClient,
    private resolveLlmClient: (model?) => LLMClient,
  ) {}

  async act({ instruction, page, model }) {
    const llmClient = this.resolveLlmClient(model);
    const response = await actInference({
      instruction,
      domElements,
      llmClient,
    });
    return response;
  }
}
```

**Nitro-app**:
```typescript
// server/routes/api/chat.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages } = body;

  const provider = createOpenAI({
    apiKey: qwenApiKey,
    baseURL: qwenBaseUrl,
  });

  const result = streamText({
    model: provider.chat(qwenModel),
    messages: textMessages,
    system: "You are a helpful assistant.",
  });

  return result.toUIMessageStreamResponse();
});
```

## 调用流程 (Call Flow)

### 聊天完成流程 (Chat Completion Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next-App)                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  const { messages, handleSubmit } = useChat({            │  │
│  │    api: "/api/chat"                                       │  │
│  │  });                                                       │  │
│  │                                                             │  │
│  │  handleSubmit({ messages });                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/chat
                             │ { messages: [...] }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Nitro-App (Backend)                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. defineEventHandler(event)                             │  │
│  │  2. readBody(event) → { messages }                       │  │
│  │  3. Transform messages to OpenAI format                  │  │
│  │  4. Configure environment (DASHSCOPE_API_KEY, etc.)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  createOpenAI({                                           │  │
│  │    apiKey: process.env.DASHSCOPE_API_KEY,                │  │
│  │    baseURL: "https://dashscope.aliyuncs.com/..."         │  │
│  │  })                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  streamText({                                             │  │
│  │    model: provider.chat("qwen-max"),                      │  │
│  │    messages: textMessages,                                │  │
│  │    system: "You are a helpful assistant."                │  │
│  │  })                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  result.toUIMessageStreamResponse()                       │  │
│  │  → SSE Stream                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ text/event-stream
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next-App) - Streaming Response                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useChat() handles:                                       │  │
│  │  - SSE connection                                         │  │
│  │  - Token-by-token display                                 │  │
│  │  - Message state updates                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 结构化提取流程 (Structured Extraction Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│  Application Layer                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  import { generateObject } from "ai";                     │  │
│  │  import { z } from "zod";                                 │  │
│  │                                                             │  │
│  │  const schema = z.object({                                 │  │
│  │    name: z.string(),                                       │  │
│  │    email: z.string().email(),                              │  │
│  │  });                                                       │  │
│  │                                                             │  │
│  │  const result = await generateObject({                     │  │
│  │    model: provider.chat("qwen-max"),                      │  │
│  │    messages,                                               │  │
│  │    schema,                                                 │  │
│  │  });                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│  AI SDK Layer                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Convert Zod schema to JSON Schema                     │  │
│  │  2. Inject schema into system prompt                      │  │
│  │  3. Call LLM with schema constraint                       │  │
│  │  4. Parse and validate response with Zod                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│  LLM Provider (Qwen/DashScope)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Returns JSON matching the schema:                       │  │
│  │  {                                                        │  │
│  │    "name": "John Doe",                                    │  │
│  │    "email": "john@example.com"                            │  │
│  │  }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 浏览器自动化集成 (Browser Automation Integration)

### Stagehand 内置集成

```typescript
// Stagehand 直接控制 Playwright
const stagehand = new Stagehand({
  model: "openai/gpt-4.1-mini",
});

await stagehand.page.goto("https://example.com");
await stagehand.act("click the login button");
await stagehand.extract({ schema: LoginFormSchema });
```

### Nitro-app 分离式集成

```
┌─────────────────────────────────────────────────────────────────┐
│  Plasmo-App (Chrome Extension)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StagehandXPathScanner.ts                                │  │
│  │  - Capture DOM via CDP API                               │  │
│  │  - Execute actions on target page                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              │ DOM snapshot + instruction       │
│                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│  Nitro-App (Backend)                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  const result = await generateObject({                   │  │
│  │    model: provider.chat("qwen-max"),                     │  │
│  │    messages: [{                                          │  │
│  │      role: "user",                                       │  │
│  │      content: `DOM: ${dom}\nInstruction: ${instruction}` │  │
│  │    }],                                                    │  │
│  │    schema: ActionSchema                                   │  │
│  │  });                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              │ Action (xpath, action type)       │
│                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│  Plasmo-App (Chrome Extension)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Execute action via CDP:                                  │  │
│  │  - Runtime.evaluate                                      │  │
│  │  - DOM.getDocument                                       │  │
│  │  - DOM.querySelector                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 关键差异总结 (Key Differences)

| 方面 | Stagehand | Nitro-app |
|------|-----------|-----------|
| **架构** | 单体应用 | 前后端分离 |
| **浏览器控制** | 内置 Playwright | 通过 CDP/外部应用 |
| **抽象层** | LLMClient 抽象 | 直接使用 AI SDK |
| **操作封装** | act/extract/observe | generateText/generateObject |
| **流式响应** | 支持 | 主要用于聊天 |
| **工具调用** | 动态工具注册 | MCP 协议 |

## 相关文件 (Related Files)

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMClient.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMClient.ts)
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMProvider.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMProvider.ts)
- [.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts)

### Nitro-App 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts)
- [server/lib/ollamaOpenAIClient.ts](../../server/lib/ollamaOpenAIClient.ts)
- [server/lib/mcp/registry.ts](../../server/lib/mcp/registry.ts)
