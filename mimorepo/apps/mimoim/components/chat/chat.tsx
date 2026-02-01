"use client";

import { useState } from "react";
import { Messages } from "./messages";
import { ChatInput } from "./chat-input";
import { BrowserSelection } from "./browser-selection";
import { BrowserTaskConfirmation } from "./browser-task-confirmation";
import type { ChatMessage } from "@/lib/types";
import { useBionChat } from "@/lib/hooks/use-bion-chat";

interface ChatProps {
  chatId: string;
  initialMessages?: ChatMessage[];
}

export function Chat({ chatId, initialMessages = [] }: ChatProps) {
  const [input, setInput] = useState("");

  const {
    messages,
    sendMessage,
    status,
    stop,
    browserSelection,
    browserTaskConfirmation,
    selectBrowser,
    confirmBrowserTask,
  } = useBionChat({
    id: chatId,
    initialMessages,
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
      <div className="mx-auto w-full max-w-4xl px-2 pt-3 md:px-4">
        {browserSelection.status === "waiting" && (
          <BrowserSelection candidates={browserSelection.candidates} onSelect={selectBrowser} />
        )}
        {browserTaskConfirmation.status === "requested" && (
          <div className="mt-2">
            <BrowserTaskConfirmation
              summary={browserTaskConfirmation.summary}
              onCancel={() =>
                confirmBrowserTask({
                  requestId: browserTaskConfirmation.requestId,
                  confirmed: false,
                })
              }
              onConfirm={() =>
                confirmBrowserTask({
                  requestId: browserTaskConfirmation.requestId,
                  confirmed: true,
                })
              }
            />
          </div>
        )}
      </div>

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
