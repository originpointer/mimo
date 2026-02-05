import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { join } from "node:path";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

const STORAGE_BASE = join(process.cwd(), ".data", "kv");

// Create a singleton storage instance
let storageInstance: ReturnType<typeof createStorage> | null = null;

async function getStorage() {
  if (!storageInstance) {
    storageInstance = createStorage({
      driver: fsDriver({
        base: STORAGE_BASE,
      }),
    });
  }
  return storageInstance;
}

function keyByTaskId(taskId: string) {
  return `messages:task:${taskId}`;
}

export async function saveMessage(taskId: string, message: ChatMessage): Promise<void> {
  const storage = await getStorage();
  const key = keyByTaskId(taskId);
  const messages = (await storage.getItem<ChatMessage[]>(key)) || [];

  const existingIndex = messages.findIndex((m: ChatMessage) => m.id === message.id);
  if (existingIndex >= 0) messages[existingIndex] = message;
  else messages.push(message);

  await storage.setItem(key, messages);
}

export async function getMessages(taskId: string): Promise<ChatMessage[]> {
  try {
    const storage = await getStorage();
    const messages = await storage.getItem<ChatMessage[]>(keyByTaskId(taskId));
    return Array.isArray(messages) ? messages.filter((m) => m && m.id) : [];
  } catch {
    return [];
  }
}
