import { NextResponse } from "next/server";
import type { ChatRequest } from "@/lib/types";

export const runtime = "edge";

/**
 * Mock chat API endpoint
 * This is a placeholder implementation that returns a static response.
 * In production, this would connect to an AI service like OpenAI or Anthropic.
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();

    // Basic validation
    if (!body.message || !body.id) {
      return NextResponse.json(
        { error: "Invalid request: missing message or id" },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return mock response
    return NextResponse.json({
      id: body.id,
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "This is a mock response from the API endpoint. The backend logic is not yet implemented. Please use the client-side mock chat hook for testing the UI.",
          },
        ],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
