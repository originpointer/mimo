"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, ChatStatus } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

interface UseMockChatOptions {
  initialMessages?: ChatMessage[];
}

interface UseMockChatReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (message: ChatMessage) => Promise<void>;
  status: ChatStatus;
  stop: () => void;
  input: string;
  setInput: (value: string) => void;
}

// Mock responses for demo purposes
const MOCK_RESPONSES = [
  "That's an interesting question! Let me think about it...",
  "I understand what you're asking. Here's what I think:",
  "Great point! Based on my understanding:",
  "Thanks for sharing that. From my perspective:",
  "That's a thoughtful observation. I would say:",
  "I appreciate you bringing this up. Let me explain:",
];

export function useMockChat({
  initialMessages = [],
}: UseMockChatOptions = {}): UseMockChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [input, setInput] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: ChatMessage) => {
    setStatus("submitted");

    // Add user message
    setMessages((prev) => [...prev, message]);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if stopped
    if (abortControllerRef.current?.signal.aborted) {
      setStatus("ready");
      return;
    }

    setStatus("streaming");

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: generateUUID(),
      role: "assistant",
      parts: [{ type: "text", text: "" }],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Select random mock response
    const baseResponse =
      MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const fullResponse =
      baseResponse +
      " This is a mock response from the assistant. The backend is not yet implemented, but the UI is fully functional and ready to be connected to a real API. You can type messages, see them appear, and watch the streaming animation in action!";

    // Simulate streaming response
    let currentText = "";
    const chars = fullResponse.split("");

    for (let i = 0; i < chars.length; i++) {
      // Check if stopped
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30));
      currentText += chars[i];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, parts: [{ type: "text", text: currentText }] }
            : msg
        )
      );
    }

    setStatus("ready");
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setStatus("ready");
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    input,
    setInput,
  };
}
