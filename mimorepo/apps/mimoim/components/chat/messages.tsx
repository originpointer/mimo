"use client";

import { useEffect, useRef } from "react";
import { Message } from "./message";
import { Greeting } from "./greeting";
import type { ChatMessage, ChatStatus } from "@/lib/types";

interface MessagesProps {
  messages: ChatMessage[];
  status: ChatStatus;
}

export function Messages({ messages, status }: MessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="relative flex-1">
      <div className="absolute inset-0 touch-pan-y overflow-y-auto">
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
        {messages.length === 0 && <Greeting />}

        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLoading={isLoading && index === messages.length - 1}
          />
        ))}

        <div ref={endRef} className="min-h-[24px] min-w-[24px] shrink-0" />
      </div>
    </div>
  </div>
  );
}
