"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";

import { ChatInterface } from "@/components/chat-interface";

export default function ChatRuntime({
  id,
  initialMessages,
  initialPrompt,
}: {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string;
}) {
  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === "getLocation") {
        const cities = ["New York", "Los Angeles", "Chicago", "San Francisco"];
        const city = cities[Math.floor(Math.random() * cities.length)];
        addToolOutput({
          tool: "getLocation",
          toolCallId: toolCall.toolCallId,
          output: { city },
        });
      }
    },
  });

  // ChatInterface 需要受控 input；useChat 本身不提供 input state，这里用本地 state 管理输入框内容。
  const [draft, setDraft] = useState("");
  const isLoading = status === "submitted" || status === "streaming";
  const hasSentInitialPrompt = useRef(false);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim() || status !== "ready") return;
    sendMessage({ text: draft.trim() });
    setDraft("");
  };

  useEffect(() => {
    if (!error) return;
    const description = error instanceof Error ? error.message : "请求失败，请稍后重试。";
    toast.error("请求发生错误", { description });
  }, [error]);

  useEffect(() => {
    if (hasSentInitialPrompt.current) return;
    const p = String(initialPrompt ?? "").trim();
    if (!p) return;
    if (status !== "ready") return;
    if (messages.length > 0) return;
    hasSentInitialPrompt.current = true;
    sendMessage({ text: p });
  }, [initialPrompt, messages.length, sendMessage, status]);

  return (
    <ChatInterface
      messages={messages as unknown as UIMessage[]}
      input={draft}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      isLoading={isLoading}
      addToolOutput={addToolOutput}
    />
  );
}
