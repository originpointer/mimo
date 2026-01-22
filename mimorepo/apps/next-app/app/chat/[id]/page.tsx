import ChatShell from "@/components/chat/chat-shell";
import { listChats, loadChat } from "@/lib/chat-store";
import ChatRuntime from "./ChatRuntime";
import { newTask } from "../_actions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const messages = await loadChat(id);
  const chats = await listChats();
  const sp = searchParams ? await searchParams : undefined;
  const rawPrompt = sp?.prompt;
  const prompt = Array.isArray(rawPrompt) ? rawPrompt[0] : rawPrompt;

  return (
    <ChatShell chats={chats} currentChatId={id} newTask={newTask}>
      <div className="h-dvh bg-background">
        <ChatRuntime id={id} initialMessages={messages} initialPrompt={prompt} />
      </div>
    </ChatShell>
  );
}
