import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Chat API endpoint with streaming AI responses
 * Uses Vercel AI Gateway to communicate with LLMs
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, modelId = DEFAULT_CHAT_MODEL } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request: missing messages array", { status: 400 });
    }

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(modelId),
          system: systemPrompt(),
          messages: await convertToModelMessages(messages),
        });

        dataStream.merge(result.toUIMessageStream());
      },
      generateId: generateUUID,
      onError: () => "Oops, an error occurred!",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
