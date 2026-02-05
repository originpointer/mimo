import { ChatPageClient } from "./chat-page-client";
import type { Metadata } from "next";
import { generateUUID } from "@/lib/utils";

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

async function getTask(taskId: string) {
  const bionUrl = process.env.NEXT_PUBLIC_BION_URL || "http://localhost:6007";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch(`${bionUrl}/api/task/${taskId}`, {
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    if (!res || !res.ok) return null;
    const json = await res.json();
    return json.ok ? json.data : null;
  } catch (e) {
    return null;
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const task = await getTask(id);

  let initialMessages: any[] = [];
  if (task?.messages && Array.isArray(task.messages)) {
    initialMessages = task.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      parts: m.parts,
      metadata: { createdAt: new Date(m.createdAt).toISOString() },
    }));
  } else if (task?.initialMessage) {
    initialMessages.push({
      id: generateUUID(),
      role: 'user',
      content: task.initialMessage,
      createdAt: new Date(task.createdAt),
    });
  }

  return <ChatPageClient chatId={id} initialMessages={initialMessages} />;
}
