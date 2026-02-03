"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/chat/chat";
import { useBionChat } from "@/lib/hooks/use-bion-chat";
import type { ChatMessage } from "@/lib/types";
import { usePluginInfo } from "./_hooks/use-plugin-info";
import { useExtensions } from "./_hooks/use-extensions";

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
    initialMessages,
  });

  // 扩展插件 Hook：获取扩展列表并管理选中状态
  const { extensions, isLoading, selectedExtensionIds, toggleExtension } = useExtensions();

  // 发送消息处理函数
  const handleSend = (text: string) => {
    if (text.trim()) {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
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
