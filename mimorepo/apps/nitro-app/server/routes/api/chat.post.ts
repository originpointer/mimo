import { defineEventHandler, readBody, setResponseHeaders, createError } from "h3";
import Letta from "@letta-ai/letta-client";

// Letta client - 连接到 Self-hosted Letta 服务
const lettaClient = new Letta({
  baseUrl: process.env.LETTA_BASE_URL || "http://localhost:8283",
});

// Agent ID - 需要在 Letta 中预先创建
const AGENT_ID = process.env.LETTA_AGENT_ID;

// AI SDK v5 UI Message Stream 格式
function createUIMessageStream(content: string): string {
  const textId = Math.random().toString(36).substring(2, 15);
  const lines: string[] = [];
  
  // text-start
  lines.push(JSON.stringify({ type: "text-start", id: textId }));
  
  // text-delta (分块发送内容)
  const words = content.split(" ");
  for (const word of words) {
    lines.push(JSON.stringify({ type: "text-delta", id: textId, delta: word + " " }));
  }
  
  // text-end
  lines.push(JSON.stringify({ type: "text-end", id: textId }));
  
  // 每行用换行符分隔
  return lines.join("\n") + "\n";
}

export default defineEventHandler(async (event) => {
  // 设置 CORS 头
  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  try {
    const body = await readBody(event);
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw createError({
        statusCode: 400,
        message: "Invalid messages format",
      });
    }

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage.content;

    // 设置 AI SDK v5 流式响应头
    setResponseHeaders(event, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
      "x-accel-buffering": "no",
    });

    if (!AGENT_ID) {
      // 如果没有配置 Agent ID，返回模拟响应（用于测试）
      console.warn("LETTA_AGENT_ID not configured, returning mock response");
      
      const mockResponse = `I received your message: "${userContent}". However, Letta is not configured yet. Please set LETTA_AGENT_ID environment variable.`;
      
      return createUIMessageStream(mockResponse);
    }

    // 调用 Letta API
    const lettaResponse = await lettaClient.agents.messages.create(AGENT_ID, {
      input: userContent,
    });

    // 提取助手消息
    let assistantContent = "";
    for (const message of lettaResponse.messages) {
      if (message.message_type === "assistant_message" && message.content) {
        assistantContent += message.content;
      }
    }

    return createUIMessageStream(assistantContent);
  } catch (error) {
    console.error("Chat API error:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});
