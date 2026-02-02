import fs from 'node:fs/promises';
import path from 'node:path';

export type MessageRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: MessageRole;
  content: string;
  timestamp?: number;
};

export type PersistMessageInput = {
  sessionId: string;
  userMessageId: string;
  llmActionId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  userText: string;
  llmMessages: ChatMessage[];
  assistantText: string;
  usage?: unknown;
  durationMs?: number;
  tools?: unknown;
  error?: { message: string; stack?: string };
};

function isoDate(): string {
  // YYYY-MM-DD in UTC (stable across TZ)
  return new Date().toISOString().slice(0, 10);
}

function getDataDir(): string {
  // Save under the mimoserver project root `.data/`
  return path.resolve(process.cwd(), '.data');
}

function safeSegment(input: string): string {
  // prevent directory traversal and overly weird filenames
  return input.replaceAll(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function persistMessage(input: PersistMessageInput): Promise<string> {
  const day = isoDate();
  const dir = path.join(
    getDataDir(),
    'messages',
    day,
    safeSegment(input.sessionId)
  );
  await fs.mkdir(dir, { recursive: true });

  // Generate filename with timestamp and userMessageId
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${safeSegment(input.userMessageId)}_${timestamp}.json`);

  const payload = {
    savedAt: new Date().toISOString(),
    ...input,
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return filePath;
}
