/**
 * Type definitions for the chat application
 */

import type { UIMessage } from "ai";

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessagePart {
  type: 'text' | 'file';
  text?: string;
  url?: string;
  name?: string;
  mediaType?: string;
}

// Use AI SDK's UIMessage type for compatibility
export type ChatMessage = UIMessage<
  { createdAt: string },
  Record<string, never>,
  Record<string, never>
>;

// Core message format for AI SDK compatibility
export interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export interface ChatRequest {
  id: string;
  message: ChatMessage;
  selectedChatModel?: string;
  selectedVisibilityType?: 'public' | 'private';
}
