import { generateId, type UIMessage } from "ai";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function getChatFile(chatId: string): string {
  const chatDir = path.join(process.cwd(), ".chats");
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return path.join(chatDir, `${chatId}.json`);
}

export async function createChat(): Promise<string> {
  const id = generateId();
  await writeFile(getChatFile(id), "[]", "utf8");
  return id;
}

export async function loadChat(chatId: string): Promise<UIMessage[]> {
  try {
    const content = await readFile(getChatFile(chatId), "utf8");
    return JSON.parse(content) as UIMessage[];
  } catch {
    return [];
  }
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const content = JSON.stringify(messages, null, 2);
  await writeFile(getChatFile(chatId), content, "utf8");
}
