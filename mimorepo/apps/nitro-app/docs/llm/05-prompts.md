# 提示词工程模式 (Prompt Engineering Patterns)

## 概述 (Overview)

本文档介绍 Nitro-app 中的提示词工程模式，包括系统提示词设计、模板系统和 Token 管理策略。

## 提示词模板系统 (Prompt Template System)

### 现有模板目录

```
server/lib/prompts/
├── jsonresume_xpath.ts  # JSON Resume XPath 提取模板
└── [your-prompt].ts     # 自定义模板
```

### JSON Resume XPath 模板

```typescript
// server/lib/prompts/jsonresume_xpath.ts
import { z } from "zod";

export interface ResumeSample {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    // ...
  };
  work?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    // ...
  }>;
  // ...
}

export function buildJsonResumeXpathPrompt(sample: ResumeSample): {
  system: string;
  user: string;
} {
  return {
    system: `You are a web resume parsing assistant specialized in extracting resume information from HTML pages.

Your task is to:
1. Analyze the provided HTML DOM structure
2. Identify resume sections (basics, work, education, skills)
3. Generate XPath selectors for each field
4. Return a structured JSON Resume with XPath values

Rules:
- Always return valid XPath 1.0 expressions
- Use text() for text content
- Use @attribute for attributes (href, src, etc.)
- Prioritize unique and stable selectors
- Include multiple candidate XPaths for reliability`,

    user: JSON.stringify(sample, null, 2),
  };
}
```

### 使用模板

```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { buildJsonResumeXpathPrompt } from "~/server/lib/prompts/jsonresume_xpath";

// 定义输出 schema
const ResumeXpathSchema = z.object({
  basics: z.object({
    name: z.object({
      xpath: z.string(),
      alternatives: z.array(z.string()).optional(),
    }),
    email: z.object({
      xpath: z.string(),
      alternatives: z.array(z.string()).optional(),
    }),
  }),
  // ...
});

// 构建提示词
const { system, user } = buildJsonResumeXpathPrompt(resumeSample);

// 生成结构化输出
const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [
    { role: "system", content: system },
    { role: "user", content: user }
  ],
  schema: ResumeXpathSchema,
});
```

## System Prompt 模式 (System Prompt Patterns)

### 1. 角色定义模式 (Role-Based)

```typescript
const systemPrompt = `You are an expert web automation assistant specialized in:
- Analyzing HTML DOM structures
- Generating robust XPath selectors
- Identifying interactive elements
- Understanding user interaction patterns

Your responses should be:
- Accurate and precise
- Well-structured and easy to parse
- Include reasoning when helpful
- Handle edge cases gracefully`;
```

### 2. 约束定义模式 (Constraint-Based)

```typescript
const systemPrompt = `You are a JSON response generator.

Output requirements:
- Return ONLY valid JSON, no markdown formatting
- No explanatory text outside JSON
- Use double quotes for strings
- Escape special characters properly
- Follow the exact schema provided

Error handling:
- If extraction fails, return null for missing fields
- Never return invalid JSON
- Include error details in "error" field if needed`;
```

### 3. 上下文感知模式 (Context-Aware)

```typescript
const systemPrompt = `You are a browser automation assistant.

Context:
- Target page: ${pageUrl}
- User goal: ${userGoal}
- Current state: ${currentState}

Available actions:
- click: Click an element
- type: Type text into an input
- hover: Hover over an element
- scroll: Scroll the page
- wait: Wait for an element

Respond with the most appropriate action to achieve the user's goal.`;
```

### 4. Few-Shot 学习模式 (Few-Shot Learning)

```typescript
const systemPrompt = `You are an XPath generator. Generate XPath selectors for given descriptions.

Examples:

Input: "The submit button at the bottom of the form"
Output: "//button[@type='submit' or contains(text(), 'Submit')][1]"

Input: "The email input field"
Output: "//input[@type='email' or @id='email' or @name='email'][1]"

Input: "The login link in the navigation"
Output: "//nav//a[contains(text(), 'Login') or @href='/login'][1]"

Now generate XPath for: {user_description}`;
```

## Token 管理策略 (Token Management)

### 1. 内容截断 (Content Truncation)

```typescript
function truncateContent(content: string, maxTokens: number): string {
  // 粗略估算：1 token ≈ 4 字符
  const maxChars = maxTokens * 4;

  if (content.length <= maxChars) {
    return content;
  }

  // 截断并添加省略标记
  return content.slice(0, maxChars - 100) + "\n\n[Content truncated...]";
}

// 使用
const domContent = truncateContent(fullDom, 10000);  // 限制约 2500 tokens
```

### 2. 候选限制 (Candidate Limiting)

```typescript
function limitCandidates<T>(items: T[], maxCandidates: number): T[] {
  return items.slice(0, maxCandidates);
}

// 使用：限制 DOM 元素候选
const candidates = limitCandidates(allElements, 100);  // 只取前 100 个元素
```

### 3. 分块处理 (Chunked Processing)

```typescript
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processor(chunk);
    results.push(...chunkResults);
  }

  return results;
}

// 使用：分块处理大量元素
const allXpaths = await processInChunks(
  domElements,
  50,  // 每次处理 50 个
  async (chunk) => {
    const result = await generateObject({
      model: provider.chat("qwen-max"),
      messages: [{
        role: "user",
        content: `Generate XPath for these elements: ${JSON.stringify(chunk)}`
      }],
      schema: z.array(z.object({
        xpath: z.string(),
        element: z.string(),
      })),
    });
    return result.object;
  }
);
```

### 4. 渐进式细化 (Progressive Refinement)

```typescript
// 第一步：快速识别
const quickResult = await generateText({
  model: provider.chat("qwen-turbo"),  // 使用快速模型
  messages: [{
    role: "user",
    content: `Quickly identify the main sections of this page: ${domContent.slice(0, 2000)}`
  }],
});

// 第二步：详细提取
const detailedResult = await generateObject({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "system",
    content: `Based on the identified sections: ${quickResult.text}
              Extract detailed information for each section.`
  }],
  schema: DetailSchema,
});
```

## 上下文构建策略 (Context Building Strategies)

### 1. 静态上下文 (Static Context)

```typescript
// 预定义的系统提示词
const STATIC_CONTEXT = {
  role: "You are a web automation expert",
  capabilities: [
    "Generate XPath selectors",
    "Analyze DOM structure",
    "Identify interactive elements",
  ],
  constraints: [
    "Return valid XPath 1.0",
    "Prioritize unique selectors",
    "Include fallback options",
  ],
};

function buildSystemPrompt(): string {
  return `
${STATIC_CONTEXT.role}

Capabilities:
${STATIC_CONTEXT.capabilities.map(c => `- ${c}`).join("\n")}

Constraints:
${STATIC_CONTEXT.constraints.map(c => `- ${c}`).join("\n")}
  `.trim();
}
```

### 2. 动态上下文 (Dynamic Context)

```typescript
function buildDynamicContext(options: {
  pageUrl: string;
  pageTitle: string;
  userGoal: string;
  currentState: string;
}): string {
  return `
Page Context:
- URL: ${options.pageUrl}
- Title: ${options.pageTitle}

User Goal:
${options.userGoal}

Current State:
${options.currentState}
  `.trim();
}

// 使用
const context = buildDynamicContext({
  pageUrl: page.url(),
  pageTitle: await page.title(),
  userGoal: "Fill out the registration form",
  currentState: "Viewing registration page",
});
```

### 3. 工具输出上下文 (Tool Output Context)

```typescript
// 将 MCP 工具输出添加到上下文
async function buildContextWithToolOutputs(
  baseContext: string,
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>
): Promise<string> {
  let context = baseContext;

  for (const call of toolCalls) {
    // 执行工具
    const result = await executeMcpTool(call.name, call.args);

    // 添加输出到上下文
    context += `\n\nTool: ${call.name}\nResult: ${JSON.stringify(result, null, 2)}`;
  }

  return context;
}
```

### 4. 浏览器状态上下文 (Browser State Context)

```typescript
interface BrowserState {
  url: string;
  title: string;
  visibleElements: Array<{
    tag: string;
    text: string;
    xpath: string;
  }>;
  currentFocus?: string;
}

async function captureBrowserState(page: Page): Promise<BrowserState> {
  return {
    url: page.url(),
    title: await page.title(),
    visibleElements: await getVisibleElements(page),
    currentFocus: await getFocusedElement(page),
  };
}

function buildPromptWithBrowserState(
  instruction: string,
  state: BrowserState
): string {
  return `
Browser State:
- URL: ${state.url}
- Title: ${state.title}
- Focused: ${state.currentFocus || "none"}

Visible Elements:
${state.visibleElements.map(e => `- ${e.tag}: ${e.text}`).join("\n")}

Instruction:
${instruction}
  `.trim();
}
```

## 提示词优化技巧 (Prompt Optimization)

### 1. 清晰指令 (Clear Instructions)

```typescript
// ❌ 不好的提示词
const badPrompt = "Extract data";

// ✅ 好的提示词
const goodPrompt = `Extract the following information from the resume:
1. Full name
2. Email address
3. Phone number
4. Current position

Return as JSON with keys: name, email, phone, position`;
```

### 2. 结构化输出 (Structured Output)

```typescript
const schema = z.object({
  actions: z.array(z.object({
    xpath: z.string().describe("XPath selector"),
    action: z.enum(["click", "type", "hover"]),
    value: z.string().optional(),
    reason: z.string().describe("Why this action"),
  })),
  confidence: z.number().describe("Confidence score 0-1"),
});

const prompt = `Analyze this DOM and generate a sequence of actions to achieve the goal.

Return a JSON object with:
- actions: Array of action objects
- confidence: Overall confidence score

Each action should include reasoning.`;
```

### 3. 错误处理 (Error Handling)

```typescript
const prompt = `Extract product information. If any field is missing:
- Use null for required fields
- Use empty string for optional text fields
- Include error details in "errors" array

Response format:
{
  "name": "string or null",
  "price": "string or null",
  "errors": ["error message if extraction failed"]
}`;
```

### 4. 迭代改进 (Iterative Improvement)

```typescript
async function extractWithRefinement(
  content: string,
  schema: z.ZodType,
  maxIterations = 3
): Promise<z.infer<typeof schema>> {
  let result = await generateObject({ model, messages: [{ role: "user", content }], schema });

  for (let i = 0; i < maxIterations; i++) {
    // 验证结果
    const validation = validateResult(result.object);

    if (validation.valid) {
      break;
    }

    // 优化提示词
    const refinedPrompt = `
Previous attempt had issues:
${validation.errors.join("\n")}

Please fix these issues and try again.
Original content: ${content}
    `.trim();

    result = await generateObject({
      model,
      messages: [{ role: "user", content: refinedPrompt }],
      schema,
    });
  }

  return result.object;
}
```

## Stagehand 提示词模式参考

### Stagehand System Prompt

```typescript
// .refer/.sources/stagehand/packages/core/lib/inference.ts
const STAGEHAND_SYSTEM_PROMPT = `You are Stagehand, an AI web browser automation agent.

Your goal is to help users accomplish tasks on web pages by:
1. Understanding the user's instruction
2. Analyzing the current page state
3. Generating appropriate actions (click, type, hover, etc.)
4. Providing clear reasoning

You have access to:
- The page DOM structure
- Element information (text, attributes, position)
- XPath selectors
- Previous actions and results

Response format:
- Always include reasoning for your actions
- Provide multiple candidate elements when uncertain
- Use the most stable selectors available
- Consider accessibility attributes when present`;
```

## 相关文件 (Related Files)

### Nitro-App 实现
- [server/lib/prompts/jsonresume_xpath.ts](../../server/lib/prompts/jsonresume_xpath.ts) - XPath 提取模板
- [server/routes/api/resume/parse.post.ts](../../server/routes/api/resume/parse.post.ts) - 提示词使用示例

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/inference.ts](../../../../.refer/.sources/stagehand/packages/core/lib/inference.ts)
- [.refer/.sources/stagehand/packages/core/lib/v3/handlers/extractHandler.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/extractHandler.ts)
