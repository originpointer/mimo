"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Chat } from "@/components/chat/chat";
import { useBionChat } from "@/lib/hooks/use-bion-chat";
import type { ChatMessage, ChatStatus } from "@/lib/types";
import { useExtensions } from "./_hooks/use-extensions";

type PersistedChatStateV1 = {
  v: 1;
  chatId: string;
  updatedAt: number;
  status: ChatStatus;
  messages: ChatMessage[];
};

function chatStorageKey(chatId: string): string {
  return `mimoim.chat.${chatId}`;
}

function readPersistedChat(chatId: string): PersistedChatStateV1 | null {
  try {
    const raw = localStorage.getItem(chatStorageKey(chatId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedChatStateV1>;
    if (parsed?.v !== 1) return null;
    if (parsed.chatId !== chatId) return null;
    if (!Array.isArray(parsed.messages)) return null;
    if (typeof parsed.updatedAt !== "number") return null;
    if (
      parsed.status !== "ready" &&
      parsed.status !== "submitted" &&
      parsed.status !== "streaming" &&
      parsed.status !== "error"
    ) {
      return null;
    }

    const status: ChatStatus =
      (parsed.status === "submitted" || parsed.status === "streaming") &&
      Date.now() - parsed.updatedAt > 60_000
        ? "ready"
        : (parsed.status as ChatStatus);

    return { ...(parsed as PersistedChatStateV1), status };
  } catch {
    return null;
  }
}

function writePersistedChat(state: PersistedChatStateV1): void {
  try {
    localStorage.setItem(chatStorageKey(state.chatId), JSON.stringify(state));
  } catch {
    // Best-effort persistence only
  }
}

function mergeMessagesById(preferred: ChatMessage[], fallback: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  const order: string[] = [];

  for (const m of preferred) {
    if (!m?.id) continue;
    if (!map.has(m.id)) order.push(m.id);
    map.set(m.id, m);
  }

  for (const m of fallback) {
    if (!m?.id) continue;
    if (!map.has(m.id)) order.push(m.id);
    map.set(m.id, m);
  }

  return order.map((id) => map.get(id)!);
}

/**
 * 聊天页面客户端组件属性
 */
interface ChatPageClientProps {
  /** 聊天 ID（对应 Bion sessionId） */
  chatId: string;
  /** 初始消息列表 */
  initialMessages?: ChatMessage[];
}

/**
 * 聊天页面客户端组件
 *
 * 负责管理聊天状态、插件信息探测以及浏览器选择等交互逻辑。
 */
export function ChatPageClient({ chatId, initialMessages = [] }: ChatPageClientProps) {
  // 输入框文本状态
  const [input, setInput] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  const persisted = useMemo(() => readPersistedChat(chatId), [chatId]);
  const mergedInitialMessages = useMemo(() => {
    if (!persisted?.messages?.length) return initialMessages;
    // Prefer local messages (includes in-progress assistant deltas) and fall back to server-provided messages.
    return mergeMessagesById(persisted.messages, initialMessages);
  }, [initialMessages, persisted?.messages]);

  // Bion 聊天 Hook：管理消息发送、接收和浏览器选择
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
    initialMessages: mergedInitialMessages,
    initialStatus: persisted?.status,
  });

  // 扩展插件 Hook：获取扩展列表并管理选中状态
  const { extensions, isLoading, selectedExtensionIds, toggleExtension } = useExtensions();

  useEffect(() => {
    writePersistedChat({
      v: 1,
      chatId,
      updatedAt: Date.now(),
      status,
      messages,
    });
  }, [chatId, messages, status]);

  // 发送消息处理函数
  const handleSend = (text: string) => {
    if (text.trim()) {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
      // If we are on the default chat page, redirect to the specific task page
      if (pathname === "/chat") {
        router.replace(`/chat/${chatId}`);
      }
    }
  };

  // 选择浏览器处理函数
  const handleSelectBrowser = (clientId: string) => {
    selectBrowser(clientId);
  };

  // 确认浏览器任务处理函数
  const handleConfirmBrowserTask = (requestId: string, confirmed: boolean) => {
    confirmBrowserTask({ requestId, confirmed });
  };

  return (
    <Chat
      messages={messages}
      status={status}
      input={input}
      setInput={setInput}
      onSend={handleSend}
      onStop={stop}
      browserSelection={browserSelection}
      browserTaskConfirmation={browserTaskConfirmation}
      onSelectBrowser={handleSelectBrowser}
      onConfirmBrowserTask={handleConfirmBrowserTask}
      extensions={extensions}
      extensionsLoading={isLoading}
      selectedExtensionIds={selectedExtensionIds}
      onToggleExtension={toggleExtension}
    />
  );
}
