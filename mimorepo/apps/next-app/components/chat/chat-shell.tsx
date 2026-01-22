import type { ReactNode } from "react";

import type { ChatListItem } from "@/lib/chat-store";
import { TaskSidebar } from "@/components/chat/task-sidebar";

export default function ChatShell({
  chats,
  currentChatId,
  newTask,
  children,
}: {
  chats: ChatListItem[];
  currentChatId?: string;
  newTask: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full bg-muted/40 text-foreground">
      <TaskSidebar chats={chats} currentChatId={currentChatId} newTask={newTask} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

