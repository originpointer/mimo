import { createGateway } from "@ai-sdk/gateway";
import { generateText, streamText } from "ai";
import { z } from "zod";
import type { FrontendUserMessage } from "mimo-protocol";

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

export class AiGateway implements LlmGateway {
  async analyzeIntent(text: string, context: { status: string; currentUrl?: string }): Promise<{ isBrowserRequired: boolean; url?: string | null }> {
    const apiKey = process.env.MIMO_AI_GATEWAY_KEY;
    const modelId = process.env.MIMO_AI_INTENT_MODEL || process.env.MIMO_AI_MODEL || "openai/gpt-4o-mini";

    if (!apiKey) return { isBrowserRequired: true, url: null };

    const gateway = createGateway({ apiKey });
    const model = gateway.languageModel(modelId);

    const { toolCalls } = await generateText({
      model,
      tools: {
        resolveIntent: {
          description: "Resolve the user's intent to determine if browser usage is required and the target URL.",
          parameters: z.object({
            isBrowserRequired: z.boolean().describe("Whether the user's request requires using a web browser."),
            url: z.string().nullable().describe("The specific URL to navigate to. Return null if continuing on the current page or if no specific URL is provided."),
          }),
        } as any,
      },
      toolChoice: "required",
      system: `You are an intent classifier for a browser agent.
Your task is to determine if the user's request requires using a web browser and if a specific URL is targeted.

Context:
- Task Status: \${context.status}
- Current URL: \${context.currentUrl || "None"}

Rules:
1. "isBrowserRequired":
   - Return TRUE if the user wants to search, view a webpage, click elements, or interact with web content.
   - Return TRUE if the user implies continuing a previous browser session (e.g., "scroll down", "click the first link").
   - Return FALSE for general chat, calculations, or questions not needing real-time web access.

2. "url":
   - Extract the full URL if explicitly provided (e.g., "https://google.com").
   - If the user says "search for X", return "https://www.google.com/search?q=X" (or similar).
   - If the user implies continuing on the Current URL (e.g., "scroll down"), return NULL.
   - If the user says "I want to browse" without a specific site, return NULL (the system will handle defaults).`,
      messages: [{ role: "user", content: text }],
    });

    const result = (toolCalls?.[0] as any)?.args;

    // 添加默认兜底，虽然 required tool choice 应该保证有结果
    return result || { isBrowserRequired: true, url: null };
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

    // Convert tools array to object format expected by AI SDK (uses inputSchema)
    const tools = input.tools
      ? input.tools.reduce(
        (acc, tool) => ({
          ...acc,
          [tool.name]: {
            description: tool.description,
            inputSchema: tool.parameters,
          },
        }),
        {} as Record<string, { description: string; inputSchema: Record<string, unknown> }>
      )
      : undefined;

    const result = await streamText({
      model,
      messages: input.messages as any,
      tools: tools as any,
      abortSignal: undefined,
    });

    for await (const chunk of result.textStream) {
      if (chunk) yield { type: "delta", content: chunk };
    }

    yield { type: "done" };
  }
}

export function userMessageToChat(msg: FrontendUserMessage) {
  return { role: "user" as const, content: msg.content };
}
