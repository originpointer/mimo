import { useStorage } from 'nitropack/runtime';

export type MessageRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: number;
    parts?: Array<{ type: string; text?: string;[key: string]: any }>;
};

const STORAGE_MOUNT = 'data';

function keyByTaskId(taskId: string) {
    return `messages:task:${taskId}`;
}

export async function saveMessage(taskId: string, message: ChatMessage): Promise<void> {
    const storage = useStorage(STORAGE_MOUNT);
    const key = keyByTaskId(taskId);

    const messages = (await storage.getItem<ChatMessage[]>(key)) || [];

    // Check if message already exists (deduplication based on id)
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
        messages[existingIndex] = message;
    } else {
        messages.push(message);
    }

    await storage.setItem(key, messages);
}

export async function getMessages(taskId: string): Promise<ChatMessage[]> {
    try {
        const storage = useStorage(STORAGE_MOUNT);
        const messages = await storage.getItem<ChatMessage[]>(keyByTaskId(taskId));
        // Filter out potential nulls/invalid items
        return Array.isArray(messages) ? messages.filter(m => m && m.id) : [];
    } catch (e) {
        console.error(`[messageStore] Failed to get messages for task ${taskId}:`, e);
        return [];
    }
}

export async function clearMessages(taskId: string): Promise<void> {
    const storage = useStorage(STORAGE_MOUNT);
    await storage.removeItem(keyByTaskId(taskId));
}
