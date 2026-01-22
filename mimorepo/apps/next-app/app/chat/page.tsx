import ChatHome from "@/components/chat/chat-home";
import ChatShell from "@/components/chat/chat-shell";
import { listChats } from "@/lib/chat-store";

import { newTask } from "./_actions";

export default async function ChatPage() {
  const chats = await listChats();
  return (
    <ChatShell chats={chats} newTask={newTask}>
      <ChatHome newTask={newTask} />
    </ChatShell>
  );
}
