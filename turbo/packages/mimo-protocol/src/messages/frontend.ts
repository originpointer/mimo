import type { MimoProtocolVersion } from "../version";

export type FrontendToServerMessageType = "user_message";

export type FrontendEventType = "chatDelta" | "structuredOutput" | "snapshotSync";

export interface FrontendUserMessage {
  v?: MimoProtocolVersion;
  type: "user_message";
  id: string;
  timestamp: number;
  taskId: string;
  content: string;
}

export type FrontendToServerMessage = FrontendUserMessage | (Record<string, unknown> & { type: string });

export interface ChatDeltaEvent {
  id: string;
  type: "chatDelta";
  timestamp: number;
  sender: "assistant" | "user";
  targetEventId: string;
  finished: boolean;
  delta: {
    content: string;
  };
}

export interface StructuredOutputEvent {
  id: string;
  type: "structuredOutput";
  timestamp: number;
  status: "streaming" | "success" | "error";
  schemaName?: string;
  data?: unknown;
  error?: string;
  isComplete: boolean;
  targetEventId?: string;
}

export interface SnapshotSyncEvent {
  id: string;
  type: "snapshotSync";
  timestamp: number;
  mode: "full";
  seq: number;
  state: {
    windows: unknown[];
    tabs: unknown[];
    tabGroups: unknown[];
    activeWindowId: number | null;
    activeTabId: number | null;
    lastUpdated: number;
  };
}

export type FrontendEvent = ChatDeltaEvent | StructuredOutputEvent | SnapshotSyncEvent | (Record<string, unknown> & { type: string });

export interface FrontendEventEnvelope {
  type: "event";
  id: string;
  taskId: string;
  timestamp: number;
  event: FrontendEvent;
}
