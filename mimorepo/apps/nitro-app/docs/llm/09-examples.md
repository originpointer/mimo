# 使用示例 (Usage Examples)

## 概述 (Overview)

本文档提供 Nitro-app LLM 系统的完整使用示例，涵盖常见场景和最佳实践。

## 示例 1: 基础聊天完成 (Basic Chat Completion)

### 后端实现

```typescript
// server/routes/api/chat.post.ts
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages } = body;

  // 创建 provider
  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  // 流式生成
  const result = streamText({
    model: provider.chat("qwen-max"),
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    system: "You are a helpful assistant.",
  });

  return result.toUIMessageStreamResponse();
});
```

### 前端调用

```typescript
// apps/next-app/app/chat/[id]/ChatRuntime.tsx
import { useChat } from "ai/react";

export function ChatRuntime() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(m => (
          <div key={m.id} className={`message ${m.role}`}>
            <strong>{m.role}:</strong>
            <p>{m.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "发送中..." : "发送"}
        </button>
      </form>
    </div>
  );
}
```

### 使用 curl 测试

```bash
curl -X POST http://localhost:6006/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "你好，请介绍一下你自己" }
    ]
  }'
```

## 示例 2: 结构化数据提取 (Structured Extraction)

### 简历信息提取

```typescript
import { generateObject } from "ai";
import { z } from "zod";

// 定义输出 schema
const ResumeSchema = z.object({
  basics: z.object({
    name: z.string().describe("全名"),
    email: z.string().email().describe("电子邮箱"),
    phone: z.string().optional().describe("电话号码"),
    location: z.string().optional().describe("所在地"),
  }),
  work: z.array(z.object({
    company: z.string().describe("公司名称"),
    position: z.string().describe("职位"),
    startDate: z.string().describe("开始日期"),
    endDate: z.string().optional().describe("结束日期"),
    summary: z.string().optional().describe("工作描述"),
  })),
  skills: z.array(z.object({
    name: z.string().describe("技能名称"),
    level: z.enum(["beginner", "intermediate", "advanced", "expert"])
      .optional()
      .describe("熟练程度"),
  })),
});

type Resume = z.infer<typeof ResumeSchema>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { resumeText } = body;

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "system",
      content: "You are a resume parsing expert. Extract structured information from the resume text."
    }, {
      role: "user",
      content: `Parse the following resume:\n\n${resumeText}`
    }],
    schema: ResumeSchema,
  });

  return {
    ok: true,
    resume: result.object as Resume,
    usage: result.usage,
  };
});
```

### 产品信息提取

```typescript
const ProductSchema = z.object({
  name: z.string().describe("产品名称"),
  price: z.string().describe("价格"),
  currency: z.string().optional().describe("货币单位"),
  description: z.string().describe("产品描述"),
  specifications: z.record(z.string()).optional().describe("规格参数"),
  availability: z.enum(["in_stock", "out_of_stock", "pre_order"])
    .describe("库存状态"),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
  })).optional(),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: `Extract product information from this HTML:\n\n${htmlContent}`
  }],
  schema: ProductSchema,
});
```

## 示例 3: 浏览器自动化动作 (Browser Automation Actions)

### 生成并执行点击动作

```typescript
// 后端: 生成动作
const ActionSchema = z.object({
  xpath: z.string().describe("目标元素的 XPath"),
  action: z.enum(["click", "type", "hover", "scroll", "wait"])
    .describe("动作类型"),
  value: z.string().optional().describe("输入值"),
  reason: z.string().describe("选择此动作的原因"),
  confidence: z.number().min(0).max(1).describe("置信度"),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { domSnapshot, instruction } = body;

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "system",
      content: `You are a browser automation expert. Analyze DOM and generate actions.`
    }, {
      role: "user",
      content: `
DOM: ${domSnapshot}

Instruction: ${instruction}

Generate the appropriate action.
      `
    }],
    schema: ActionSchema,
  });

  return { ok: true, action: result.object };
});
```

```typescript
// 前端: 执行动作
async function executeAction(instruction: string) {
  const scanner = new StagehandXPathScanner(tabId);

  // 捕获 DOM
  const dom = await scanner.getDOM();

  // 获取动作
  const response = await fetch("/api/browser/generate-action", {
    method: "POST",
    body: JSON.stringify({
      domSnapshot: dom,
      instruction: instruction,
    }),
  });

  const { action } = await response.json();

  // 执行动作
  switch (action.action) {
    case "click":
      await scanner.clickElement(action.xpath);
      break;
    case "type":
      await scanner.typeText(action.xpath, action.value);
      break;
    case "hover":
      await scanner.hoverElement(action.xpath);
      break;
  }

  return action;
}
```

### 表单填写

```typescript
const FormActionSchema = z.object({
  actions: z.array(z.object({
    field: z.string().describe("字段名称"),
    xpath: z.string().describe("字段 XPath"),
    action: z.enum(["type", "select", "check"]),
    value: z.string().optional(),
  })),
  submit: z.object({
    xpath: z.string().describe("提交按钮 XPath"),
    confirmBeforeSubmit: z.boolean().optional(),
  }),
});

async function fillForm(formData: Record<string, string>) {
  const dom = await scanner.getDOM();

  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "user",
      content: `
DOM: ${dom}

Form data to fill:
${JSON.stringify(formData, null, 2)}

Generate actions to fill this form.
      `
    }],
    schema: FormActionSchema,
  });

  // 执行填写动作
  for (const action of result.object.actions) {
    switch (action.action) {
      case "type":
        await scanner.typeText(action.xpath, formData[action.field]);
        break;
      case "select":
        await scanner.selectOption(action.xpath, action.value);
        break;
      case "check":
        await scanner.checkCheckbox(action.xpath);
        break;
    }
  }

  // 提交表单
  if (result.object.submit.confirmBeforeSubmit) {
    const confirmed = await confirm("确认提交表单？");
    if (!confirmed) return;
  }

  await scanner.clickElement(result.object.submit.xpath);
}
```

## 示例 4: 工具调用 (Tool Calling)

### 使用 MCP 工具

```typescript
import { generateText } from "ai";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { query } = body;

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  const result = await generateText({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "user",
      content: query
    }],
    tools: {
      readText: {
        description: "Read a text file from the uploads directory",
        parameters: z.object({
          path: z.string().describe("File path"),
          offset: z.number().optional(),
          limit: z.number().optional(),
        }),
        execute: async (args) => {
          // 调用 MCP 工具
          const mcpResult = await mcpRegistry.call("readText", args);
          return mcpResult;
        },
      },
      globFiles: {
        description: "Find files using glob pattern",
        parameters: z.object({
          pattern: z.string().describe("Glob pattern"),
          limit: z.number().optional(),
        }),
        execute: async (args) => {
          const mcpResult = await mcpRegistry.call("globFiles", args);
          return mcpResult;
        },
      },
    },
  });

  return {
    ok: true,
    response: result.text,
    toolCalls: result.toolCalls,
  };
});
```

### 直接调用 MCP 工具

```typescript
// 读取文件
const readResult = await mcpRegistry.call("readText", {
  path: "2026-01-20/upload/index.html",
  offset: 0,
  limit: 100,
});

// 列出目录
const listResult = await mcpRegistry.call("listTree", {
  path: "2026-01-20",
});

// 查找文件
const globResult = await mcpRegistry.call("globFiles", {
  pattern: "**/*.html",
  limit: 20,
});

// 搜索内容
const grepResult = await mcpRegistry.call("grepFiles", {
  pattern: "import.*from",
  include: "*.ts",
  limit: 30,
});
```

## 示例 5: 多轮对话 (Multi-turn Conversation)

### 带上下文的对话

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { conversationId, message } = body;

  // 获取历史对话
  const history = await getConversationHistory(conversationId);

  const messages = [
    { role: "system", content: "You are a helpful coding assistant." },
    ...history,  // 历史消息
    { role: "user", content: message },
  ];

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  const result = streamText({
    model: provider.chat("qwen-max"),
    messages,
  });

  // 保存对话历史
  await saveMessage(conversationId, {
    role: "user",
    content: message,
    timestamp: Date.now(),
  });

  return result.toUIMessageStreamResponse();
});
```

### 带记忆的对话

```typescript
interface ConversationMemory {
  userProfile?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  context?: string[];
}

async function chatWithMemory(
  message: string,
  memory: ConversationMemory
) {
  const systemPrompt = buildSystemPrompt(memory);

  const result = await generateText({
    model: provider.chat("qwen-max"),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
  });

  // 更新记忆
  if (result.text.includes("remember")) {
    await updateMemory(memory, result.text);
  }

  return result;
}

function buildSystemPrompt(memory: ConversationMemory): string {
  let prompt = "You are a helpful assistant.";

  if (memory.userProfile) {
    prompt += `\n\nUser Profile:\n${JSON.stringify(memory.userProfile)}`;
  }

  if (memory.preferences) {
    prompt += `\n\nUser Preferences:\n${JSON.stringify(memory.preferences)}`;
  }

  if (memory.context && memory.context.length > 0) {
    prompt += `\n\nRecent Context:\n${memory.context.join("\n")}`;
  }

  return prompt;
}
```

## 示例 6: 错误处理与重试 (Error Handling & Retry)

### 带重试的 LLM 调用

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
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 使用
const result = await generateWithRetry(() =>
  generateObject({
    model: provider.chat("qwen-max"),
    messages: [{ role: "user", content: prompt }],
    schema: MySchema,
  })
);
```

### Schema 验证重试

```typescript
async function extractWithValidation<T>(
  content: string,
  schema: z.ZodType<T>
): Promise<T> {
  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{ role: "user", content }],
    schema,
  });

  // 验证结果
  const validation = schema.safeParse(result.object);
  if (!validation.success) {
    console.error("Validation failed:", validation.error);

    // 重试，包含错误信息
    const retryResult = await generateObject({
      model: provider.chat("qwen-max"),
      messages: [{
        role: "user",
        content: `
Previous extraction failed validation:
${JSON.stringify(validation.error.errors, null, 2)}

Please fix these issues and try again.
Original content: ${content}
        `
      }],
      schema,
    });

    return retryResult.object;
  }

  return result.object;
}
```

## 示例 7: 批量处理 (Batch Processing)

### 批量数据提取

```typescript
async function batchExtract<T>(
  items: string[],
  schema: z.ZodType<T>,
  batchSize = 5
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResult = await Promise.all(
      batch.map(item =>
        generateObject({
          model: provider.chat("qwen-max"),
          messages: [{ role: "user", content: item }],
          schema,
        })
      )
    );

    results.push(...batchResult.map(r => r.object));
  }

  return results;
}

// 使用
const resumes = await batchExtract(
  resumeTexts,
  ResumeSchema,
  3  // 每批处理 3 个
);
```

### 并发限制

```typescript
async function batchExtractWithConcurrency<T>(
  items: string[],
  schema: z.ZodType<T>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = generateObject({
      model: provider.chat("qwen-max"),
      messages: [{ role: "user", content: item }],
      schema,
    }).then(result => {
      results.push(result.object);
    });

    executing.push(promise);

    // 限制并发
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}
```

## 最佳实践 (Best Practices)

### 1. 选择合适的模型

```typescript
function selectModel(taskComplexity: "low" | "medium" | "high"): string {
  switch (taskComplexity) {
    case "low":
      return "qwen-turbo";    // 快速便宜
    case "medium":
      return "qwen-plus";     // 平衡
    case "high":
      return "qwen-max";      // 最强
  }
}
```

### 2. Token 管理

```typescript
// 限制输入长度
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;  // 粗略估算
  return text.slice(0, maxChars);
}

// 计算成本
function calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
  const promptCost = (usage.promptTokens / 1000) * 0.001;
  const completionCost = (usage.completionTokens / 1000) * 0.002;
  return promptCost + completionCost;
}
```

### 3. 缓存结果

```typescript
const cache = new Map<string, unknown>();

async function cachedGenerate(prompt: string) {
  const cacheKey = hash(prompt);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await generateText({
    model: provider.chat("qwen-max"),
    messages: [{ role: "user", content: prompt }],
  });

  cache.set(cacheKey, result);
  return result;
}
```

## 相关文件 (Related Files)

### 完整示例
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts) - 聊天端点
- [server/routes/api/resume/parse.post.ts](../../server/routes/api/resume/parse.post.ts) - 简历解析
- [apps/next-app/app/chat/[id]/ChatRuntime.tsx](../../../next-app/app/chat/[id]/ChatRuntime.tsx) - 前端集成
