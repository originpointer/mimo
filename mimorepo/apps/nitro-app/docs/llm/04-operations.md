# 核心 LLM 操作 (Core LLM Operations)

## 概述 (Overview)

本文档介绍 Nitro-app 中的核心 LLM 操作，包括 `generateText`、`generateObject` 和 `streamText`，并与 Stagehand 的 act/extract/observe 操作进行对比映射。

## 操作对比 (Operations Comparison)

### Stagehand vs Nitro-app 操作映射

| Stagehand 操作 | Nitro-app 操作 | 用途 |
|---------------|---------------|------|
| `act()` | `generateText()` + tools | 执行动作（点击、输入等） |
| `extract()` | `generateObject()` + schema | 结构化数据提取 |
| `observe()` | `generateText()` + tools | 页面观察与规划 |
| - | `streamText()` | 流式文本生成 |

## generateText() - 文本生成

### 简介

`generateText()` 用于生成非流式文本响应，适用于需要完整响应后再处理场景。

### 基本用法

```typescript
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
});

const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in simple terms." }
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(result.text);
console.log(result.usage);  // { promptTokens, completionTokens, totalTokens }
console.log(result.finishReason);  // "stop" | "length" | "content-filter" | "error"
```

### 参数选项

```typescript
interface GenerateTextOptions {
  model: LanguageModelV2;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;      // 0-2，越高越随机
  maxTokens?: number;        // 最大生成 token 数
  topP?: number;            // 核采样，0-1
  frequencyPenalty?: number; // -2 到 2
  presencePenalty?: number;  // -2 到 2
  system?: string;          // 系统提示词
  tools?: Record<string, Tool>;  // 工具定义
  toolChoice?: "auto" | "required" | "none";  // 工具选择策略
}
```

### 对应 Stagehand 的 act() 操作

```typescript
// Stagehand act() 示例
await stagehand.act("click the submit button");

// Nitro-app 等价实现
const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: `Given this DOM: ${domSnapshot}
                Instruction: click the submit button
                Respond with a JSON object containing:
                - xpath: the element's xpath
                - action: "click"`
  }],
});

const action = JSON.parse(result.text);
// 执行动作
await executeClick(action.xpath);
```

## generateObject() - 结构化输出

### 简介

`generateObject()` 用于生成符合 Zod schema 的结构化数据，是 Stagehand `extract()` 的等价操作。

### 基本用法

```typescript
import { generateObject } from "ai";
import { z } from "zod";

// 定义输出 schema
const schema = z.object({
  name: z.string().describe("Person's name"),
  age: z.number().describe("Person's age"),
  email: z.string().email().describe("Person's email"),
  skills: z.array(z.string()).describe("List of skills"),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: "Extract information from: John Doe, 30 years old, john@example.com, skilled in JavaScript and Python"
  }],
  schema,
});

// result.object 是类型安全的
console.log(result.object.name);     // "John Doe"
console.log(result.object.age);      // 30
console.log(result.object.skills);   // ["JavaScript", "Python"]
```

### 复杂 Schema 示例

```typescript
// 简历提取 Schema
const ResumeSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  work: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
  })),
  skills: z.array(z.object({
    name: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  })),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: resumeText }],
  schema: ResumeSchema,
});
```

### 浏览器动作 Schema

```typescript
// 用于控制浏览器的动作 schema
const ActionSchema = z.object({
  xpath: z.string().describe("目标元素的 XPath 选择器"),
  action: z.enum(["click", "type", "hover", "scroll", "wait"]).describe("要执行的动作"),
  value: z.string().optional().describe("输入值（用于 type 动作）"),
  waitForSelector: z.boolean().optional().default(true).describe("是否等待元素出现"),
  timeout: z.number().optional().default(5000).describe("超时时间（毫秒）"),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: `DOM: ${domSnapshot}\nInstruction: Click the login button`
  }],
  schema: ActionSchema,
});

// 执行动作
await executeBrowserAction(result.object);
```

### 对应 Stagehand 的 extract() 操作

```typescript
// Stagehand extract() 示例
const data = await stagehand.extract({
  instruction: "Extract the product information",
  schema: z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
  }),
});

// Nitro-app 等价实现
const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: `Extract product information from: ${pageContent}`
  }],
  schema: z.object({
    name: z.string(),
    price: z.string(),
    description: z.string(),
  }),
});
```

## streamText() - 流式响应

### 简介

`streamText()` 用于生成流式文本响应，是聊天界面的主要操作方式。

### 基本用法

```typescript
import { streamText } from "ai";

const result = streamText({
  model: provider.chat("qwen-max"),
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Tell me a story." }
  ],
  system: "You are a creative storyteller.",
});

// 返回流式响应
return result.toUIMessageStreamResponse();
```

### 在 Nitro 路由中使用

```typescript
// server/routes/api/chat.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages } = body;

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  // 设置流式响应头
  setResponseHeaders(event, UI_MESSAGE_STREAM_HEADERS);

  const result = streamText({
    model: provider.chat("qwen-max"),
    messages: textMessages,
    system: "You are a helpful assistant.",
  });

  return result.toUIMessageStreamResponse();
});
```

### 在前端使用

```typescript
// apps/next-app/app/chat/[id]/ChatRuntime.tsx
import { useChat } from "ai/react";

export function ChatRuntime() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong>
          <p>{m.content}</p>
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

### 流式处理选项

```typescript
const result = streamText({
  model: provider.chat("qwen-max"),
  messages,
  system: "You are a helpful assistant.",
  // 流式选项
  temperature: 0.7,
  maxTokens: 2000,
  // 完成时回调
  onFinish: (result) => {
    console.log("Stream finished:", {
      text: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
    });
  },
  // 错误处理
  onError: (error) => {
    console.error("Stream error:", error);
  },
});
```

## 工具调用 (Tool Calling)

### 简介

AI SDK 支持工具调用，允许 LLM 在生成过程中调用预定义的工具。

### 定义工具

```typescript
import { generateText } from "ai";
import { z } from "zod";

const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: "What's the weather in Beijing?" }],
  tools: {
    getWeather: {
      description: "Get current weather for a location",
      parameters: z.object({
        location: z.string().describe("City name"),
        unit: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature unit"),
      }),
      execute: async ({ location, unit = "celsius" }) => {
        // 调用天气 API
        const weather = await fetchWeather(location);
        return {
          location,
          temperature: weather.temp,
          unit,
          condition: weather.condition,
        };
      },
    },
    searchWeb: {
      description: "Search the web for information",
      parameters: z.object({
        query: z.string().describe("Search query"),
      }),
      execute: async ({ query }) => {
        const results = await searchEngine(query);
        return results.slice(0, 5);
      },
    },
  },
});

// 检查工具调用
if (result.toolCalls?.length > 0) {
  for (const toolCall of result.toolCalls) {
    console.log(`Tool: ${toolCall.toolName}`);
    console.log(`Args:`, toolCall.args);
    console.log(`Result:`, toolCall.result);
  }
}
```

### 工具选择策略

```typescript
const result = await generateText({
  model: provider.chat("qwen-max"),
  messages,
  tools: { getWeather, searchWeb },
  toolChoice: "auto",     // 自动决定是否使用工具
  // toolChoice: "required", // 必须使用工具
  // toolChoice: "none",     // 不使用工具
});
```

### 对应 Stagehand 的 observe() 操作

```typescript
// Stagehand observe() 示例
const observations = await stagehand.observe({
  instruction: "Find the login form on the page"
});

// Nitro-app 等价实现
const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: `Given this DOM: ${domSnapshot}
                Find and describe the login form elements`
  }],
  tools: {
    analyzeElement: {
      description: "Analyze a DOM element",
      parameters: z.object({
        xpath: z.string(),
      }),
      execute: async ({ xpath }) => {
        return await analyzeDOMElement(xpath);
      },
    },
  },
});
```

## 视觉/多模态支持 (Vision/Multimodal Support)

### 图像输入

```typescript
// 支持视觉的模型
const result = await generateText({
  model: provider.chat("qwen-vl-max"),
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Describe this image" },
      {
        type: "image",
        image: "https://example.com/image.jpg",  // URL
        // 或 base64: "data:image/jpeg;base64,..."
      },
    ],
  }],
});
```

### Stagehand 视觉支持

```typescript
// Stagehand 使用 base64 图像
await stagehand.act({
  instruction: "Click the red button",
  image: {
    buffer: screenshotBuffer,
    description: "Current page screenshot",
  },
});

// Nitro-app 等价实现
const result = await generateText({
  model: provider.chat("qwen-vl-max"),
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Click the red button in this screenshot" },
      {
        type: "image",
        image: `data:image/png;base64,${screenshotBase64}`,
      },
    ],
  }],
});
```

## 错误处理与重试 (Error Handling & Retry)

### 基本错误处理

```typescript
try {
  const result = await generateText({
    model: provider.chat("qwen-max"),
    messages,
  });
} catch (error) {
  if (error instanceof Error) {
    console.error("LLM Error:", error.message);
    // 处理特定错误
  }
}
```

### 重试模式

```typescript
async function generateWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw lastError;
}

// 使用
const result = await generateWithRetry(() =>
  generateText({
    model: provider.chat("qwen-max"),
    messages,
  })
);
```

## Token 使用追踪 (Token Usage Tracking)

```typescript
const result = await generateText({
  model: provider.chat("qwen-max"),
  messages,
});

console.log("Token usage:", result.usage);
// {
//   promptTokens: 100,
//   completionTokens: 50,
//   totalTokens: 150
// }

// 计算成本（示例）
const costPer1kTokens = {
  prompt: 0.001,
  completion: 0.002,
};

const cost = (
  (result.usage.promptTokens / 1000) * costPer1kTokens.prompt +
  (result.usage.completionTokens / 1000) * costPer1kTokens.completion
);

console.log(`Cost: $${cost.toFixed(4)}`);
```

## 相关文件 (Related Files)

### Nitro-App 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts) - streamText 使用示例
- [server/lib/prompts/jsonresume_xpath.ts](../../server/lib/prompts/jsonresume_xpath.ts) - generateObject 示例

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts)
- [.refer/.sources/stagehand/packages/core/lib/v3/handlers/extractHandler.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/extractHandler.ts)
- [.refer/.sources/stagehand/packages/core/lib/inference.ts](../../../../.refer/.sources/stagehand/packages/core/lib/inference.ts)
