# 类型定义与接口 (Type Definitions & Interfaces)

## 概述 (Overview)

本文档介绍 Nitro-app LLM 系统的核心接口定义，并与 Stagehand 的类型进行对比映射。

## 核心接口 (Core Interfaces)

### ChatMessage 接口

**Stagehand 定义**:
```typescript
// .refer/.sources/stagehand/packages/core/lib/v3/llm/LLMClient.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent;
}

export type ChatMessageContent =
  | string
  | (ChatMessageImageContent | ChatMessageTextContent)[];

interface ChatMessageTextContent {
  type: "text";
  text: string;
}

interface ChatMessageImageContent {
  type: "image";
  image: string; // base64 or URL
  description?: string;
}
```

**Nitro-app 适配**:
```typescript
// server/routes/api/chat.post.ts
type OpenAIChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

// 处理带 parts 的消息格式（来自前端）
interface PartMessage {
  role: "user" | "assistant" | "system" | "tool"
  parts: Array<{ type: string; text?: string }>
}

// 转换函数
function getTextFromMessage(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;

  if (Array.isArray(record.parts)) {
    return record.parts
      .filter(part => part?.type === "text")
      .map(part => part.text ?? "")
      .join("");
  }

  if (typeof record.content === "string") {
    return record.content;
  }

  return null;
}
```

### ChatCompletionOptions 接口

**Stagehand 定义**:
```typescript
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  image?: {
    buffer: Buffer;
    description?: string;
  };
  response_model?: {
    name: string;
    schema: StagehandZodSchema;
  };
  tools?: LLMTool[];
  tool_choice?: "auto" | "none" | "required";
  maxOutputTokens?: number;
  requestId?: string;
}
```

**Nitro-app AI SDK 等价**:
```typescript
// AI SDK streamText/generateText 参数
interface CoreOptions {
  model: LanguageModelV2;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  system?: string;
}

// generateObject 参数 (结构化输出)
interface ObjectOptions extends CoreOptions {
  schema: ZodSchema | ZodTypeAny;
  output?: "json" | "object";
}
```

### LLMResponse 类型

**Stagehand 定义**:
```typescript
export type LLMResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

**Nitro-app AI SDK 等价**:
```typescript
// generateText 返回值
interface GenerateTextResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content-filter" | "error";
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
}

// streamText 返回值
interface StreamTextResult {
  toUIMessageStreamResponse(): Response;
  toDataStreamResponse(): Response;
  textStream: ReadableStream<string>;
  // ...
}
```

## Stagehand 到 Nitro-app 类型映射

### 核心类型映射表

| Stagehand 类型 | Nitro-app 类型 | 说明 |
|---------------|---------------|------|
| `ChatMessage` | `{ role: string; content: string }` | 简化为仅文本内容 |
| `ChatCompletionOptions` | `CoreOptions` | AI SDK 标准选项 |
| `response_model` | `schema: ZodSchema` | 结构化输出 |
| `LLMResponse` | `GenerateTextResult` | 生成结果 |
| `LLMParsedResponse<T>` | `GenerateObjectResult<T>` | 对象生成结果 |
| `AvailableModel` | `string` | 模型名称字符串 |
| `ModelProvider` | `LanguageModelV2` | AI SDK 语言模型 |

### AvailableModel 类型

**Stagehand 定义**:
```typescript
export type AvailableModel =
  // OpenAI Models
  | "gpt-4.1" | "gpt-4.1-mini" | "o4-mini" | "o3" | "o1"
  | "gpt-4o" | "gpt-4o-mini" | "gpt-4o-2024-08-06"
  // Anthropic Models
  | "claude-3-5-sonnet-latest" | "claude-3-7-sonnet-latest"
  // Google Models
  | "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-2.0-flash"
  // Custom AISDK format
  | `${string}/${string}`  // "provider/model"
  | string;  // Allow any string
```

**Nitro-app 使用**:
```typescript
// 直接使用模型名称字符串
type ModelName = string;

// 常用模型
const QWEN_MAX = "qwen-max";
const QWEN_PLUS = "qwen-plus";
const QWEN_TURBO = "qwen-turbo";

// OpenAI 兼容格式
const GPT4O = "gpt-4o";
const GPT4O_MINI = "gpt-4o-mini";
```

## MCP 工具类型 (MCP Tool Types)

### MCP Tool 定义

```typescript
// server/lib/mcp/types.ts
export interface McpTool {
  name: string;
  description: string;
  inputSchema: ZodSchema | ZodTypeAny;
  handler: (args: unknown, context?: McpContext) => Promise<McpResult>;
}

export interface McpResult {
  title: string;
  content: Array<{ type: "text" | "image"; text?: string; data?: string }>;
  meta?: {
    truncated?: boolean;
    [key: string]: unknown;
  };
}

export interface McpContext {
  requestId?: string;
  logger?: (message: LogLine) => void;
}
```

### MCP Tool 示例

```typescript
// server/lib/mcp/tools/readText.ts
import { z } from "zod";

export const ReadTextInputSchema = z.object({
  path: z.string().describe("文件相对路径"),
  offset: z.number().optional().describe("起始行号"),
  limit: z.number().optional().describe("读取行数限制"),
});

export const mcpReadTextTool: McpTool = {
  name: "readText",
  description: "读取 Nitro uploads 目录中的文本文件",
  inputSchema: ReadTextInputSchema,
  async handler(args, ctx) {
    const result = await readTextInUploads(args);
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: { truncated: result.metadata.truncated },
    };
  },
};
```

## Zod Schema 集成 (Zod Schema Integration)

### Stagehand Zod Schema 使用

```typescript
// Stagehand extract 操作
import { z } from "zod";

const ResumeSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  work: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
  })),
});

await stagehand.extract({
  instruction: "Extract resume information",
  schema: ResumeSchema,
});
```

### Nitro-app generateObject 使用

```typescript
import { generateObject } from "ai";
import { z } from "zod";

const ResumeSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  work: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
  })),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: "Extract resume info" }],
  schema: ResumeSchema,
});

// result.object 是类型安全的
const resume: z.infer<typeof ResumeSchema> = result.object;
```

### 复杂 Schema 示例

```typescript
// 浏览器自动化 Action Schema
const ActionSchema = z.object({
  xpath: z.string().describe("目标元素的 XPath"),
  action: z.enum(["click", "type", "hover", "scroll"]).describe("动作类型"),
  value: z.string().optional().describe("输入值（用于 type 动作）"),
  waitForSelector: z.boolean().optional().describe("是否等待元素出现"),
  timeout: z.number().optional().describe("超时时间（毫秒）"),
});

// DOM 元素提取 Schema
const ElementSchema = z.object({
  elementId: z.string().describe("元素唯一标识"),
  xpath: z.string().describe("元素的 XPath"),
  description: z.string().describe("元素描述"),
  interactive: z.boolean().describe("是否可交互"),
  visible: z.boolean().describe("是否可见"),
  attributes: z.record(z.string()).optional().describe("元素属性"),
});
```

## 工具调用类型 (Tool Calling Types)

### Stagehand Tool 定义

```typescript
export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
```

### Nitro-app AI SDK Tool 调用

```typescript
import { generateText } from "ai";

const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: "What's the weather?" }],
  tools: {
    getWeather: {
      description: "Get current weather",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async (args) => {
        return { temperature: 20, condition: "sunny" };
      },
    },
  },
});

// 检查是否有工具调用
if (result.toolCalls?.length > 0) {
  for (const toolCall of result.toolCalls) {
    console.log(`Tool: ${toolCall.toolName}`);
    console.log(`Args: ${JSON.stringify(toolCall.args)}`);
  }
}
```

## Ollama Client 类型

```typescript
// server/lib/ollamaOpenAIClient.ts
export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type OpenAIChatCompletionsRequest = {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  max_tokens?: number
}

export type OpenAIChatCompletionsResponse = {
  id?: string
  choices?: Array<{
    index?: number
    message?: {
      role?: string
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export type OllamaOpenAIClientOptions = {
  baseUrl: string  // e.g. http://127.0.0.1:11434/v1
  apiKey: string   // local ollama can be dummy
  model: string
  timeoutMs?: number
  retries?: number
}
```

## 相关文件 (Related Files)

### Stagehand 类型定义
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMClient.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMClient.ts)
- [.refer/.sources/stagehand/packages/core/lib/types/public/model.ts](../../../../.refer/.sources/stagehand/packages/core/lib/types/public/model.ts)

### Nitro-App 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts)
- [server/lib/ollamaOpenAIClient.ts](../../server/lib/ollamaOpenAIClient.ts)
- [server/lib/mcp/types.ts](../../server/lib/mcp/types.ts)
