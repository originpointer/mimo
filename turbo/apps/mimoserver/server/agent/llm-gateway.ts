import { createGateway } from "@ai-sdk/gateway";
import { generateText, streamText, tool, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";
import type { FrontendUserMessage } from "mimo-protocol";

/**
 * Runtime JSON Schema to Zod converter
 * Converts JSON Schema objects to Zod schemas at runtime
 */
function jsonSchemaToZod(schema: {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  description?: string;
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}): z.ZodTypeAny {
  switch (schema.type) {
    case "object": {
      if (schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const key in schema.properties) {
          shape[key] = jsonSchemaToZod(schema.properties[key] as typeof schema);
        }
        let zodObject = z.object(shape);
        if (schema.required && Array.isArray(schema.required)) {
          const requiredFields = schema.required.reduce<Record<string, true>>(
            (acc, field) => ({ ...acc, [field]: true }),
            {},
          );
          zodObject = zodObject.partial().required(requiredFields);
        }
        if (schema.description) {
          zodObject = zodObject.describe(schema.description);
        }
        return zodObject;
      } else {
        return z.object({});
      }
    }
    case "array":
      if (schema.items) {
        let zodArray = z.array(jsonSchemaToZod(schema.items as typeof schema));
        if (schema.description) {
          zodArray = zodArray.describe(schema.description);
        }
        return zodArray;
      } else {
        return z.array(z.any());
      }
    case "string": {
      if (schema.enum) {
        return z.string().refine((val) => schema.enum!.includes(val));
      }
      let zodString = z.string();
      if (schema.format === "uri" || schema.format === "url") {
        zodString = zodString.url();
      } else if (schema.format === "email") {
        zodString = zodString.email();
      } else if (schema.format === "uuid") {
        zodString = zodString.uuid();
      }
      if (schema.description) {
        zodString = zodString.describe(schema.description);
      }
      return zodString;
    }
    case "number": {
      let zodNumber = z.number();
      if (schema.minimum !== undefined) {
        zodNumber = zodNumber.min(schema.minimum);
      }
      if (schema.maximum !== undefined) {
        zodNumber = zodNumber.max(schema.maximum);
      }
      if (schema.description) {
        zodNumber = zodNumber.describe(schema.description);
      }
      return zodNumber;
    }
    case "boolean": {
      let zodBoolean = z.boolean();
      if (schema.description) {
        zodBoolean = zodBoolean.describe(schema.description);
      }
      return zodBoolean;
    }
    default:
      return z.any();
  }
}

export type LlmDelta = { type: "delta"; content: string };
export type LlmToolCall = {
  type: "tool_call";
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
};
export type LlmError = { type: "error"; code: string; message: string; retryable?: boolean };
export type LlmDone = { type: "done" };
export type LlmEvent = LlmDelta | LlmToolCall | LlmDone | LlmError;

export interface LlmGateway {
  streamChat(input: {
    taskId: string;
    messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
    context?: { snapshot?: unknown; page?: unknown };
    timeoutMs?: number;
  }): AsyncIterable<LlmEvent>;

  /**
   * 分析用户的意图，判断是否需要浏览器操作以及目标 URL
   * @param text 用户输入文本
   * @param context 当前任务对上下文
   */
  analyzeIntent(text: string, context: { status: string; currentUrl?: string }): Promise<{ isBrowserRequired: boolean; url?: string | null }>;
}

type IntentResult = { isBrowserRequired: boolean; url: string | null };

const INTENT_TOOL_SCHEMA = z.object({
  isBrowserRequired: z.boolean(),
  url: z.string().nullable(),
});

function extractFirstUrl(text: string): string | null {
  const match = text.match(/\bhttps?:\/\/[^\s)]+/i) || text.match(/\bwww\.[^\s)]+/i);
  if (!match) return null;
  const raw = match[0].replace(/[.,!?;:]+$/g, "");
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function extractSearchQuery(text: string): string | null {
  const trimmed = text.trim();
  const match =
    trimmed.match(/^(?:search\s+for|google)\s+(.+)$/i) ||
    trimmed.match(/^(?:帮我)?(?:搜索|搜一下|搜下|搜)\s*(.+)$/);
  const query = match?.[1]?.trim();
  return query ? query.replace(/[.。！？!?]+$/g, "") : null;
}

function looksLikeNonBrowserTask(text: string): boolean {
  const lower = text.toLowerCase();

  if (lower.includes("```")) return true;
  if (/\b(import|export|const|let|var|function|class|interface|type|extends|implements|return)\b/.test(lower)) return true;
  if (/\b(ts|tsx|js|jsx|py|python|go|golang|rs|rust|java|c\+\+|c#|sql|regex|eslint|tsc|pnpm|npm|yarn|git|docker)\b/.test(lower)) return true;
  if (/[\\/][\w./-]+\.(?:ts|tsx|js|jsx|json|md|py|go|rs|java|sql)\b/i.test(text)) return true;

  if (/(写代码|修复|报错|堆栈|单元测试|重构|实现|编译|类型|接口|函数|正则|数据库)/.test(text)) return true;
  if (/(翻译|润色|改写|总结|提炼|生成|写一篇|写个|写段|写封)/.test(text)) return true;
  if (/(算一下|计算|证明|推导)/.test(text)) return true;

  return false;
}

function analyzeIntentHeuristic(text: string, context: { status: string; currentUrl?: string }): IntentResult | null {
  const trimmed = text.trim();
  if (!trimmed) return { isBrowserRequired: false, url: null };

  if (/(不要|不需要|不用).*(浏览器|网页|网站|搜索|上网)/.test(trimmed)) {
    return { isBrowserRequired: false, url: null };
  }

  const explicitUrl = extractFirstUrl(trimmed);
  if (explicitUrl) return { isBrowserRequired: true, url: explicitUrl };

  const searchQuery = extractSearchQuery(trimmed);
  if (searchQuery) {
    return { isBrowserRequired: true, url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` };
  }

  const browserKeywords =
    /(浏览器|网页|页面|网站|链接|网址|地址栏|tab|chrome|firefox|safari|edge|web\s*page|website|link)/i.test(trimmed);
  if (browserKeywords) return { isBrowserRequired: true, url: null };

  const continuationKeywords =
    /(scroll|滚动|往下|向下|上一页|下一页|点击|点开|打开第|第\d+个|返回|后退|前进|刷新|提交|输入|选择|切换|展开|收起)/i.test(trimmed);
  if (context.currentUrl && continuationKeywords) {
    return { isBrowserRequired: true, url: null };
  }

  if (looksLikeNonBrowserTask(trimmed)) {
    return { isBrowserRequired: false, url: null };
  }

  // If we are already in a browsing session, short "continue" style prompts usually imply browser interaction.
  if (context.status !== "created" && context.currentUrl && /^(继续|下一步|照做|开始|go|next)\b/i.test(trimmed)) {
    return { isBrowserRequired: true, url: null };
  }

  return null;
}

export class AiGateway implements LlmGateway {
  async analyzeIntent(text: string, context: { status: string; currentUrl?: string }): Promise<{ isBrowserRequired: boolean; url?: string | null }> {
    const apiKey = process.env.MIMO_AI_GATEWAY_KEY;
    const modelId = process.env.MIMO_AI_INTENT_MODEL || process.env.MIMO_AI_MODEL || "openai/gpt-4o-mini";

    const heuristic = analyzeIntentHeuristic(text, context);
    if (heuristic) return heuristic;

    if (!apiKey) return { isBrowserRequired: false, url: null };

    try {
      const gateway = createGateway({ apiKey });
      const model = gateway.languageModel(modelId);

      const { toolCalls } = await generateText({
        model,
        tools: {
          resolveIntent: tool({
            description: "Resolve the user's intent to determine if browser usage is required and the target URL.",
            inputSchema: INTENT_TOOL_SCHEMA,
          }),
        },
        toolChoice: "required",
        system: `You are an intent classifier for a hybrid assistant that can either chat normally (no browser) or use a web browser agent.
Return isBrowserRequired=true ONLY when browsing is necessary. Default to FALSE.

Context:
- Task Status: ${context.status}
- Current URL: ${context.currentUrl || "None"}

Guidelines:
- Return FALSE for: writing, coding, reasoning, math, translation, summarizing user-provided text, general knowledge questions.
- Return TRUE for: opening/visiting a site, web search, interacting with a webpage (click/scroll/form), or continuing an ongoing browsing session.
- url:
  - If an explicit URL is provided, return it.
  - If the user asks to search, return https://www.google.com/search?q=<encoded query>.
  - If continuing on the current page or no specific URL is provided, return null.`,
        messages: [{ role: "user", content: text }],
      });

      const candidate = toolCalls?.[0]?.input;
      const parsed = INTENT_TOOL_SCHEMA.safeParse(candidate);
      if (!parsed.success) return { isBrowserRequired: false, url: null };

      // Safety: if it looks clearly like a non-browser task, avoid forcing browser mode.
      if (!extractFirstUrl(text) && looksLikeNonBrowserTask(text) && !parsed.data.url) {
        return { isBrowserRequired: false, url: null };
      }

      return parsed.data;
    } catch {
      return { isBrowserRequired: false, url: null };
    }
  }

  async *streamChat(input: {
    taskId: string;
    messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
    context?: { snapshot?: unknown; page?: unknown };
    timeoutMs?: number;
  }): AsyncIterable<LlmEvent> {
    const apiKey = process.env.MIMO_AI_GATEWAY_KEY;
    const modelId = process.env.MIMO_AI_MODEL || "openai/gpt-4o-mini";

    if (!apiKey) {
      yield {
        type: "delta",
        content: "MIMO_AI_GATEWAY_KEY is not set. Please configure the ai-gateway key.",
      };
      yield { type: "done" };
      return;
    }

    const gateway = createGateway({ apiKey });
    const model = gateway.languageModel(modelId);

    // Convert tools to AI SDK v6 format using tool() helper
    // Convert JSON Schema objects to Zod schemas for proper validation
    const tools: ToolSet | undefined = input.tools
      ? input.tools.reduce<ToolSet>(
        (acc, toolDef) => ({
          ...acc,
          [toolDef.name]: tool({
            description: toolDef.description,
            // Convert JSON Schema to Zod schema
            inputSchema: jsonSchemaToZod(toolDef.parameters as unknown as Parameters<typeof jsonSchemaToZod>[0]),
          }),
        }),
        {} as ToolSet
      )
      : undefined;

    const result = await streamText({
      model,
      messages: input.messages as unknown as ModelMessage[],
      tools,
      abortSignal: undefined,
    });

    // Handle both text deltas and tool calls
    for await (const chunk of result.fullStream) {
      switch (chunk.type) {
        case "text-delta":
          if (chunk.text) yield { type: "delta", content: chunk.text };
          break;
        case "tool-call":
          yield {
            type: "tool_call",
            toolCallId: chunk.toolCallId,
            name: chunk.toolName,
            arguments: chunk.input as Record<string, unknown>,
          };
          break;
        case "finish":
          yield { type: "done" };
          break;
      }
    }
  }
}

export function userMessageToChat(msg: FrontendUserMessage) {
  return { role: "user" as const, content: msg.content };
}
