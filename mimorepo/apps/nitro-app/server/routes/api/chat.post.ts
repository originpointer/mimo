import { defineEventHandler, readBody, setResponseHeaders, createError } from "h3";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, UI_MESSAGE_STREAM_HEADERS } from "ai";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

function getTextFromMessage(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;

  if (Array.isArray(record.parts)) {
    const text = record.parts
      .filter(
        (part): part is { type: "text"; text?: string } =>
          Boolean(part) && typeof part === "object" && (part as { type?: string }).type === "text",
      )
      .map((part) => part.text ?? "")
      .join("");

    return text || null;
  }

  if (typeof record.content === "string") {
    return record.content;
  }

  return null;
}

export default defineEventHandler(async (event) => {
  // 设置 CORS 头
  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  const requestId = `nitro-chat-${Date.now()}`;
  console.info("[nitro-chat] request start", { requestId });
  try {
    if (!process.env.DASHSCOPE_API_KEY) {
      const cwdEnvPath = path.join(process.cwd(), "apps", "nitro-app", ".env");
      const appEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));
      const repoEnvPath = fileURLToPath(new URL("../../../../../.env", import.meta.url));

      if (existsSync(cwdEnvPath)) {
        config({ path: cwdEnvPath });
      } else if (existsSync(appEnvPath)) {
        config({ path: appEnvPath });
      } else if (existsSync(repoEnvPath)) {
        config({ path: repoEnvPath });
      }
    }

    const qwenBaseUrl =
      process.env.QWEN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const qwenModel = process.env.QWEN_MODEL ?? "qwen-max";
    const qwenApiKey = process.env.DASHSCOPE_API_KEY;
    if (!process.env.OPENAI_API_KEY && qwenApiKey) {
      process.env.OPENAI_API_KEY = qwenApiKey;
    }
    if (!process.env.OPENAI_BASE_URL && qwenBaseUrl) {
      process.env.OPENAI_BASE_URL = qwenBaseUrl;
    }

    if (!qwenApiKey) {
      throw createError({
        statusCode: 500,
        message: "DASHSCOPE_API_KEY is not configured",
      });
    }

    const body = await readBody(event);
    const { messages } = body;
    console.info("[nitro-chat] body parsed", {
      requestId,
      messagesCount: Array.isArray(messages) ? messages.length : 0,
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn("[nitro-chat] invalid messages", { requestId });
      throw createError({
        statusCode: 400,
        message: "Invalid messages format",
      });
    }

    const textMessages = messages.map((message: unknown) => {
      const rawRole = (message as { role?: "user" | "assistant" | "system" | "tool" }).role;
      const content = getTextFromMessage(message) ?? "";

      if (rawRole === "assistant") {
        return { role: "assistant", content } as const;
      }

      if (rawRole === "system") {
        return { role: "system", content } as const;
      }

      return { role: "user", content } as const;
    });

    if (textMessages.some((message) => !message.content)) {
      console.warn("[nitro-chat] empty message content", {
        requestId,
        textMessagesCount: textMessages.length,
      });
      throw createError({
        statusCode: 400,
        message: "Invalid message content",
      });
    }

    setResponseHeaders(event, UI_MESSAGE_STREAM_HEADERS);

    console.info("[nitro-chat] config", {
      requestId,
      qwenModel,
      qwenBaseUrl,
      hasApiKey: Boolean(qwenApiKey),
    });
    console.debug("[nitro-chat] textMessages", { requestId, textMessages });

    const provider = createOpenAI({
      apiKey: qwenApiKey,
      baseURL: qwenBaseUrl,
    });

    console.info("[nitro-chat] streamText start", { requestId });
    const result = streamText({
      model: provider.chat(qwenModel),
      messages: textMessages,
      system: "You are a helpful assistant.",
    });

    console.info("[nitro-chat] streamText created", { requestId });

    console.info("[nitro-chat] response stream ready", { requestId });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[nitro-chat] error", { requestId, error });
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
