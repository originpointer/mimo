"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { type UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";

import { ChatInterface } from "@/components/chat-interface";

export default function ChatRuntime({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const { messages, sendMessage, status } = useChat({
    initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    // 将 chat id 传给后端用于 saveChat
    body: { id },
  });

  // ChatInterface 需要受控 input；useChat 本身不提供 input state，这里用本地 state 管理输入框内容。
  const [draft, setDraft] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim() || status !== "ready") return;
    sendMessage({ text: draft.trim() });
    setDraft("");
  };

  return (
    <ChatInterface
      messages={messages as unknown as UIMessage[]}
      input={draft}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
