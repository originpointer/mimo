"use client";

import type { ChatMessage, ChatStatus } from "@/lib/types";
import type { BionBrowserCandidate } from "@bion/protocol";
import type { ExtensionRegistration } from "@/lib/extension-discovery";
import { Messages } from "./messages";
import { ChatInput } from "./chat-input";
import { BrowserSelection } from "./browser-selection";
import { BrowserTaskConfirmation } from "./browser-task-confirmation";

interface ChatProps {
  messages: ChatMessage[];
  status: ChatStatus;
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  browserSelection:
    | { status: "idle" }
    | { status: "waiting"; candidates: BionBrowserCandidate[] }
    | { status: "selected"; connected: BionBrowserCandidate };
  browserTaskConfirmation:
    | { status: "idle" }
    | { status: "requested"; requestId: string; summary: string; clientId?: string };
  onSelectBrowser: (clientId: string) => void;
  onConfirmBrowserTask: (requestId: string, confirmed: boolean) => void;
  // 扩展插件相关 props
  extensions: ExtensionRegistration[];
  extensionsLoading: boolean;
  selectedExtensionIds: Set<string>;
  onToggleExtension: (extensionId: string) => void;
}

export function Chat({
  messages,
  status,
  input,
  setInput,
  onSend,
  onStop,
  browserSelection,
  browserTaskConfirmation,
  onSelectBrowser,
  onConfirmBrowserTask,
  extensions,
  extensionsLoading,
  selectedExtensionIds,
  onToggleExtension,
}: ChatProps) {
  const handleSend = () => {
    onSend(input);
    setInput("");
  };

  return (
    <div className="overscroll-behavior-contain flex h-dvh w-full min-w-0 touch-pan-y flex-col bg-background">
      <div className="mx-auto w-full max-w-4xl px-2 pt-3 md:px-4">
        {browserSelection.status === "waiting" && (
          <BrowserSelection candidates={browserSelection.candidates} onSelect={onSelectBrowser} />
        )}
        {browserTaskConfirmation.status === "requested" && (
          <div className="mt-2">
            <BrowserTaskConfirmation
              summary={browserTaskConfirmation.summary}
              onCancel={() =>
                onConfirmBrowserTask(browserTaskConfirmation.requestId, false)
              }
              onConfirm={() =>
                onConfirmBrowserTask(browserTaskConfirmation.requestId, true)
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
        onStop={onStop}
        status={status}
        extensions={extensions}
        extensionsLoading={extensionsLoading}
        selectedExtensionIds={selectedExtensionIds}
        onToggleExtension={onToggleExtension}
      />
    </div>
  );
}
