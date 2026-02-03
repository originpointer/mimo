import { ChatPageClient } from "./chat-page-client";
import { Sidebar } from "@/components/sidebar/sidebar";
import type { Metadata } from "next";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ChatPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Chat - ${id}`,
    description: "Chat with AI assistant",
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return (
    <main className="flex h-dvh">
      <Sidebar />
      <ChatPageClient chatId={id} />
    </main>
  );
}
