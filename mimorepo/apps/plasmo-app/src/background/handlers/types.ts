/**
 * Handler Types
 *
 * Shared types for message handlers in the background service worker.
 */

/**
 * All legacy message type constants
 *
 * These are the 13 custom message types used by the extension before
 * the HubCommandType system was introduced.
 */
export enum LegacyMessageType {
  STAGEHAND_XPATH_SCAN = 'STAGEHAND_XPATH_SCAN',
  STAGEHAND_VIEWPORT_SCREENSHOT = 'STAGEHAND_VIEWPORT_SCREENSHOT',
  RESUME_BLOCKS_EXTRACT = 'RESUME_BLOCKS_EXTRACT',
  RESUME_XPATH_VALIDATE = 'RESUME_XPATH_VALIDATE',
  JSON_COMMON_XPATH_FIND = 'JSON_COMMON_XPATH_FIND',
  XPATH_MARK_ELEMENTS = 'XPATH_MARK_ELEMENTS',
  XPATH_GET_HTML = 'XPATH_GET_HTML',
  LIST_TABS = 'LIST_TABS',
  CREATE_TAB_GROUP = 'CREATE_TAB_GROUP',
  UPDATE_TAB_GROUP = 'UPDATE_TAB_GROUP',
  DELETE_TAB_GROUP = 'DELETE_TAB_GROUP',
  QUERY_TAB_GROUPS = 'QUERY_TAB_GROUPS',
  ADD_TABS_TO_GROUP = 'ADD_TABS_TO_GROUP',
  WINDOW_FOCUS = 'WINDOW_FOCUS',
  CDP_CLICK_BY_XPATH = 'CDP_CLICK_BY_XPATH',
}

/**
 * Message handler function type
 *
 * Handlers receive a payload and context, and return a response promise.
 */
export interface MessageHandler<TPayload, TResponse> {
  (payload: TPayload, context: HandlerContext): Promise<TResponse>;
}

/**
 * Context provided to message handlers
 */
export interface HandlerContext {
  /** The resolved tab ID */
  tabId: number;
  /** The tab URL */
  tabUrl: string;
  /** The Chrome runtime message sender */
  sender: chrome.runtime.MessageSender;
}

/**
 * Response callback function type
 *
 * Used by handlers to send responses back to the message sender.
 */
export type ResponseCallback<TResponse> = (response: TResponse) => void;

/**
 * Handler registration configuration
 *
 * Defines how a message type is routed to its handler.
 */
export interface HandlerRegistration<TPayload, TResponse> {
  /** The message type */
  type: string;
  /** The handler function */
  handler: (
    payload: TPayload,
    context: HandlerContext,
    sendResponse: ResponseCallback<TResponse>
  ) => boolean | Promise<boolean>;
}

/**
 * Base message structure for legacy messages
 */
export interface LegacyMessage<TPayload = unknown> {
  type: string;
  payload?: TPayload;
}

/**
 * Discriminated union for all message types.
 *
 * NOTE: HubCommandType support is intentionally disabled in bion mode.
 */
export type ExtensionMessage = LegacyMessage;

/**
 * Result type for tab resolution
 */
export interface TabResolution {
  tabId: number;
  tabUrl: string;
}

/**
 * Standard response format with success flag
 */
export type StandardResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };
