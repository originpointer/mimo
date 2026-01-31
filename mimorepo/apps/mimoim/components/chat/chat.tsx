"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Messages } from "./messages";
import { ChatInput } from "./chat-input";
import type { ChatMessage } from "@/lib/types";

interface ChatProps {
  chatId: string;
  initialMessages?: ChatMessage[];
}

export function Chat({ chatId, initialMessages = [] }: ChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: () => crypto.randomUUID(),
  });

  const handleSend = () => {
    if (input.trim()) {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: input }],
      });
      setInput("");
    }
  };

  return (
    <div className="overscroll-behavior-contain flex h-dvh w-full min-w-0 touch-pan-y flex-col bg-background">
      <Messages messages={messages} status={status} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={stop}
        status={status}
      />
    </div>
  );
}
