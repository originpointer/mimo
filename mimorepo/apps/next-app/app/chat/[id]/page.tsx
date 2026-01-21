import { loadChat } from "@/lib/chat-store";
import ChatRuntime from "./ChatRuntime";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const messages = await loadChat(id);

  return (
    <div className="h-dvh bg-background">
      <ChatRuntime id={id} initialMessages={messages} />
    </div>
  );
}
