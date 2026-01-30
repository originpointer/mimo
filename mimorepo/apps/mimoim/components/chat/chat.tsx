"use client";

import { useMockChat } from "@/lib/hooks/use-mock-chat";
import { Messages } from "./messages";
import { ChatInput } from "./chat-input";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

interface ChatProps {
  chatId: string;
  initialMessages?: ChatMessage[];
}

export function Chat({ chatId, initialMessages = [] }: ChatProps) {
  const { messages, sendMessage, status, stop, input, setInput } =
    useMockChat({
      initialMessages,
    });

  const handleSend = () => {
    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: "user",
      parts: [{ type: "text", text: input }],
      createdAt: new Date().toISOString(),
    };

    sendMessage(userMessage);
    setInput("");
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
