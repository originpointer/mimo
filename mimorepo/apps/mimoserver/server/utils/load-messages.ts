import fs from 'node:fs/promises';
import path from 'node:path';

export type MessageRole = 'user' | 'assistant' | 'system';

export type StoredChatMessage = {
  role: MessageRole;
  content: string;
  timestamp?: number;
};

export type StoredMessageFile = {
  savedAt: string;
  sessionId: string;
  taskId?: string;
  userMessageId: string;
  llmActionId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  userText: string;
  llmMessages: StoredChatMessage[];
  assistantText: string;
  usage?: unknown;
  durationMs?: number;
  tools?: string[];
  error?: { message: string; stack?: string };
};

function getDataDir(): string {
  return path.resolve(process.cwd(), '.data');
}

function safeSegment(input: string): string {
  return input.replaceAll(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/**
 * 按 taskId 加载消息
 * 从 .data/tasks/{taskId}/messages/ 目录读取
 */
export async function loadMessagesByTaskId(taskId: string): Promise<StoredMessageFile[]> {
  const taskMessagesDir = path.join(getDataDir(), 'tasks', safeSegment(taskId), 'messages');
  const allMessages: StoredMessageFile[] = [];

  try {
    const dates = await fs.readdir(taskMessagesDir);

    for (const date of dates) {
      const datePath = path.join(taskMessagesDir, date);
      try {
        const sessions = await fs.readdir(datePath);
        for (const sessionId of sessions) {
          const sessionDir = path.join(datePath, sessionId);
          const files = await fs.readdir(sessionDir);
          for (const file of files.filter(f => f.endsWith('.json'))) {
            const content = await fs.readFile(path.join(sessionDir, file), 'utf-8');
            allMessages.push(JSON.parse(content));
          }
        }
      } catch {
        // 目录不存在，跳过
      }
    }
  } catch {
    // 任务目录不存在，返回空数组
  }

  // 按时间戳排序
  return allMessages.sort((a, b) =>
    new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
  );
}

/**
 * 按 sessionId 加载消息（普通会话）
 * 从 .data/messages/ 目录读取
 */
export async function loadMessagesBySessionId(sessionId: string): Promise<StoredMessageFile[]> {
  const messagesDir = path.join(getDataDir(), 'messages');
  const allMessages: StoredMessageFile[] = [];

  try {
    const dates = await fs.readdir(messagesDir);

    for (const date of dates) {
      const sessionPath = path.join(messagesDir, date, safeSegment(sessionId));
      try {
        const files = await fs.readdir(sessionPath);
        for (const file of files.filter(f => f.endsWith('.json'))) {
          const content = await fs.readFile(path.join(sessionPath, file), 'utf-8');
          allMessages.push(JSON.parse(content));
        }
      } catch {
        // 目录不存在，跳过
      }
    }
  } catch {
    // 目录不存在，返回空数组
  }

  return allMessages.sort((a, b) =>
    new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
  );
}

/**
 * 将存储的消息转换为前端 UIMessage 格式
 */
export function toUIMessages(stored: StoredMessageFile[]): Array<{
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{ type: 'text'; text: string }>;
  metadata?: { createdAt: string };
}> {
  const messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: Array<{ type: 'text'; text: string }>;
    metadata?: { createdAt: string };
  }> = [];

  for (const file of stored) {
    // 从 llmMessages 中提取所有消息
    for (const msg of file.llmMessages) {
      messages.push({
        id: msg.timestamp?.toString() || Date.now().toString(),
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: [{ type: 'text', text: msg.content }],
        metadata: { createdAt: new Date(msg.timestamp || Date.now()).toISOString() },
      });
    }
  }

  return messages;
}
