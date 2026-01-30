/**
 * Type definitions for the chat application
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessagePart {
  type: 'text' | 'file';
  text?: string;
  url?: string;
  name?: string;
  mediaType?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  createdAt: string;
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
