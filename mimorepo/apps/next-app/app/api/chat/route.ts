import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.5",
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
    tools: {
      getWeatherInformation: {
        description: "show the weather in a given city to the user",
        inputSchema: z.object({ city: z.string() }),
        execute: async () => {
          const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
          return weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
        },
      },
      askForConfirmation: {
        description: "Ask the user for confirmation.",
        inputSchema: z.object({
          message: z.string().describe("The message to ask for confirmation."),
        }),
      },
      getLocation: {
        description:
          "Get the user location. Always ask for confirmation before using this tool.",
        inputSchema: z.object({}),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
