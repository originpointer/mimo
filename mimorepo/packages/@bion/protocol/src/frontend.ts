export type BionAgentSender = 'user' | 'assistant';

export type BionFrontendMessageType =
  | 'chat'
  | 'chatDelta'
  | 'liveStatus'
  | 'statusUpdate'
  | 'planUpdate'
  | 'newPlanStep'
  | 'toolUsed'
  | 'explanation'
  | 'structuredOutput'
  | 'myBrowserSelection'
  | 'browserTaskConfirmationRequested'
  | 'queueStatusChange'
  | 'sandboxUpdate'
  | 'taskModeChanged';

export interface BionFrontendEventBase {
  id: string;
  type: BionFrontendMessageType;
  timestamp: number;
  /**
   * Optional plan step link (commonly used in `.reverse` traces).
   */
  planStepId?: string;
}

export interface BionChatDeltaEvent extends BionFrontendEventBase {
  type: 'chatDelta';
  delta: {
    content: string;
    thought?: string;
  };
  finished: boolean;
  sender: BionAgentSender;
  targetEventId: string;
  rollback?: boolean;
}

export interface BionExplanationEvent extends BionFrontendEventBase {
  type: 'explanation';
  content: string;
  status: 'streaming' | 'end';
  planStepId: string;
}

export interface BionLiveStatusEvent extends BionFrontendEventBase {
  type: 'liveStatus';
  text: string;
}

export interface BionPlanTask {
  status: 'todo' | 'doing' | 'done' | 'error';
  title: string;
  startedAt?: number;
  endAt?: number;
}

export interface BionPlanUpdateEvent extends BionFrontendEventBase {
  type: 'planUpdate';
  tasks: BionPlanTask[];
}

export interface BionToolUsedEvent extends BionFrontendEventBase {
  type: 'toolUsed';
  tool: string;
  actionId: string;
  status: 'start' | 'streaming' | 'argumentsFinished' | 'success' | 'error';
  brief?: string;
  description?: string;
  message?: {
    action: string;
    param?: string;
  };
  argumentsDetail?: unknown;
  detail?: unknown;
}

export interface BionStructuredOutputEvent extends BionFrontendEventBase {
  type: 'structuredOutput';
  status: 'streaming' | 'success' | 'error';
  /**
   * Optional schema name/id for UI rendering.
   */
  schemaName?: string;
  /**
   * Structured data payload (present when status is streaming/success).
   */
  data?: unknown;
  /**
   * Error message (present when status is error).
   */
  error?: string;
  /**
   * Whether the structured output is complete.
   */
  isComplete: boolean;
  /**
   * Optional link to a chat/user event id.
   */
  targetEventId?: string;
}

export interface BionBrowserCandidate {
  clientId: string;
  clientName: string;
  ua: string;
  allowOtherClientId: boolean;
}

export interface BionMyBrowserSelectionEvent extends BionFrontendEventBase {
  type: 'myBrowserSelection';
  status: 'waiting_for_selection' | 'selected';
  browserCandidates?: BionBrowserCandidate[];
  connectedBrowser?: BionBrowserCandidate;
}

export interface BionBrowserTaskConfirmationRequestedEvent extends BionFrontendEventBase {
  type: 'browserTaskConfirmationRequested';
  requestId: string;
  /**
   * The selected browser extension clientId (if already selected).
   * If absent, UI should first guide the user to select a browser.
   */
  clientId?: string;
  /**
   * Short, user-facing summary of what will happen.
   */
  summary: string;
  /**
   * Optional preview of the browser_action payload that will be sent to the extension.
   */
  browserActionPreview?: unknown;
  /**
   * Optional link to a chat/user event id.
   */
  targetEventId?: string;
}

export type BionFrontendEvent =
  | BionChatDeltaEvent
  | BionExplanationEvent
  | BionLiveStatusEvent
  | BionPlanUpdateEvent
  | BionToolUsedEvent
  | BionStructuredOutputEvent
  | BionMyBrowserSelectionEvent
  | BionBrowserTaskConfirmationRequestedEvent
  // fallback for events we don't model strictly yet
  | (BionFrontendEventBase & Record<string, unknown>);

/**
 * `message` event envelope (Backend → Frontend) aligning with `.reverse` traces.
 */
export interface BionFrontendMessageEnvelope {
  type: 'event';
  id: string;
  sessionId: string;
  timestamp: number;
  event: BionFrontendEvent;
}

/**
 * Frontend → Backend messages sent over the Socket.IO `message` event.
 */
export interface BionUserMessage {
  type: 'user_message';
  id: string;
  timestamp: number;
  sessionId: string;
  /**
   * Plain text convenience field.
   */
  content?: string;
  /**
   * Rich content array (as seen in `.reverse`).
   */
  contents?: Array<{ type: 'text'; value: string }>;
  messageType?: 'text';
  taskMode?: string;
  attachments?: unknown[];
  extData?: unknown;
  messageStatus?: 'pending' | 'sent';
}

export interface BionSelectMyBrowser {
  type: 'select_my_browser';
  id: string;
  timestamp: number;
  sessionId: string;
  targetClientId: string;
  sourceClientId?: string;
}

export interface BionConfirmBrowserTask {
  type: 'confirm_browser_task';
  id: string;
  timestamp: number;
  sessionId: string;
  requestId: string;
  confirmed: boolean;
}

export type BionFrontendToServerMessage =
  | BionUserMessage
  | BionSelectMyBrowser
  | BionConfirmBrowserTask
  | (Record<string, unknown> & { type: string });

