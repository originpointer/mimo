import { generateId, type UIMessage } from "ai";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function getChatFile(chatId: string): string {
  const chatDir = path.join(process.cwd(), ".chats");
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return path.join(chatDir, `${chatId}.json`);
}

function getChatDir(): string {
  const chatDir = path.join(process.cwd(), ".chats");
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return chatDir;
}

function extractTitleFromMessages(messages: UIMessage[]): string {
  for (const m of messages) {
    const text =
      m.parts
        ?.filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("")
        .trim() ?? "";
    if (text) return text;
  }
  return "未命名任务";
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

export type ChatListItem = {
  id: string;
  title: string;
  updatedAt: number;
};

export async function listChats(): Promise<ChatListItem[]> {
  const dir = getChatDir();
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const items = await Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map(async (file) => {
        const id = file.replace(/\.json$/, "");
        const fullPath = path.join(dir, file);
        let updatedAt = 0;
        try {
          const s = await stat(fullPath);
          updatedAt = s.mtimeMs || 0;
        } catch {
          updatedAt = 0;
        }

        let title = "未命名任务";
        try {
          const content = await readFile(fullPath, "utf8");
          const messages = JSON.parse(content) as UIMessage[];
          title = extractTitleFromMessages(messages);
        } catch {
          title = "未命名任务";
        }

        const maxLen = 60;
        const normalized = title.replace(/\s+/g, " ").trim();
        const clipped =
          normalized.length > maxLen ? normalized.slice(0, maxLen) + "…" : normalized;

        return { id, title: clipped || "未命名任务", updatedAt } satisfies ChatListItem;
      }),
  );

  return items.sort((a, b) => b.updatedAt - a.updatedAt);
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
