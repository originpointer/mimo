import { nanoid } from 'nanoid';

/**
 * Generate a unique task ID using nanoid.
 * @param prefix - Optional prefix for the task ID
 * @param size - Length of the random ID (default: 16)
 * @returns Task ID with optional prefix
 * @example
 * generateTaskId()           // "V1StGXR8_Z5jdHi6B-myT"
 * generateTaskId('chat')     // "chat-V1StGXR8_Z5jdHi6"
 * generateTaskId('task', 10) // "task-V1StGXR8_Z"
 */
export function generateTaskId(prefix?: string, size?: number): string {
  const id = nanoid(size ?? 16);
  return prefix ? `${prefix}-${id}` : id;
}
