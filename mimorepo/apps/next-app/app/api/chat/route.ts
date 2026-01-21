import { type UIMessage } from "ai";

import { saveChat } from "@/lib/chat-store";

const NITRO_CHAT_URL =
  process.env.NITRO_CHAT_URL ?? "http://localhost:6006/api/chat";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function toNitroMessages(uiMessages: UIMessage[]) {
  return uiMessages.map((message) => {
    const content = message.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("");
    return { role: message.role, content };
  });
}

async function extractAssistantTextFromSSE(
  stream: ReadableStream<Uint8Array>,
  requestId: string,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!trimmed.startsWith("data:")) continue;

      const jsonSource = trimmed.slice(5).trim();
      if (!jsonSource || jsonSource === "[DONE]") continue;

      try {
        const payload = JSON.parse(jsonSource) as { type?: string; delta?: string };
        if (payload.type === "text-delta" && payload.delta) {
          assistantText += payload.delta;
        }
      } catch {
        // ignore non-JSON lines
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const jsonSource = buffer.trim().slice(5).trim();
    if (jsonSource && jsonSource !== "[DONE]") {
      try {
        const payload = JSON.parse(jsonSource) as { type?: string; delta?: string };
        if (payload.type === "text-delta" && payload.delta) {
          assistantText += payload.delta;
        }
      } catch {
        // ignore trailing partial line
      }
    }
  }

  console.info("[chat-api] extracted assistant text", {
    requestId,
    assistantLength: assistantText.length,
  });
  return assistantText;
}

export async function POST(req: Request) {
  const requestId = `chat-api-${Date.now()}`;
  console.info("[chat-api] request start", { requestId });
  const body = (await req.json()) as { messages?: UIMessage[]; id?: string };
  const { messages, id } = body;

  if (!messages || !Array.isArray(messages)) {
    console.warn("[chat-api] invalid request body", { requestId });
    return new Response("Invalid request body", { status: 400 });
  }
  console.info("[chat-api] request parsed", {
    requestId,
    messagesCount: messages.length,
    chatId: id,
  });

  const nitroResponse = await fetch(NITRO_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: toNitroMessages(messages) }),
  });
  console.info("[chat-api] nitro response", {
    requestId,
    ok: nitroResponse.ok,
    status: nitroResponse.status,
    statusText: nitroResponse.statusText,
  });

  if (!nitroResponse.ok) {
    const errorText = await nitroResponse.text();
    console.warn("[chat-api] nitro error", {
      requestId,
      errorTextLength: errorText.length,
    });
    return new Response(errorText || "Nitro chat error", { status: 502 });
  }

  if (!nitroResponse.body) {
    console.warn("[chat-api] nitro response body empty", { requestId });
    return new Response("Nitro response body is empty", { status: 502 });
  }

  // 透传 SSE 给前端，同时 tee 一份用于保存（不阻塞响应）
  const [clientStream, saveStream] = nitroResponse.body.tee();
  if (id) {
    void (async () => {
      try {
        const assistantText = await extractAssistantTextFromSSE(saveStream, requestId);
        const assistantMessage: UIMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          parts: [{ type: "text", text: assistantText }],
        };
        await saveChat({ chatId: id, messages: [...messages, assistantMessage] });
        console.info("[chat-api] saveChat complete", {
          requestId,
          assistantLength: assistantText.length,
        });
      } catch (error) {
        console.error("[chat-api] saveChat error", { requestId, error });
      }
    })();
  } else {
    // still consume the saveStream to avoid resource leak in some runtimes
    void saveStream.cancel();
    console.info("[chat-api] skip saveChat", { requestId });
  }

  const headers = new Headers(nitroResponse.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-cache");

  return new Response(clientStream, {
    status: nitroResponse.status,
    headers,
  });
}
