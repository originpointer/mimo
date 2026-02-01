export interface BionActivateExtensionMessage {
  type: 'activate_extension';
  id: string;
  clientId: string;
  ua: string;
  version: string;
  browserName: string;
  allowOtherClient: boolean;
  skipAuthorization: boolean;
}

export interface BionExtensionConnectedMessage {
  type: 'my_browser_extension_connected';
  id: string;
  success: boolean;
  roomId: string;
  clientId: string;
  timestamp: number;
}

export interface BionSessionStatusMessage {
  type: 'session_status';
  id?: string;
  sessionId: string;
  sessionTitle: string;
  status: 'running' | 'stopped';
  clientId?: string;
  timestamp: number;
}

export type BionBrowserActionName = string;

export interface BionBrowserActionMessage {
  type: 'browser_action';
  /**
   * Request id (matches `.reverse` logs; used for ack correlation).
   */
  id: string;
  sessionId: string;
  clientId: string;
  timestamp: number;
  action: Record<BionBrowserActionName, Record<string, unknown>>;
  /**
   * TS-first names (codec can map to wire snake_case).
   */
  screenshotPresignedUrl?: string;
  cleanScreenshotPresignedUrl?: string;
}

export interface BionBrowserActionResultSuccess {
  url: string;
  title: string;
  result: string;
  elements: string;
  markdown: string;
  fullMarkdown: string;
  viewportWidth: number;
  viewportHeight: number;
  pixelsAbove: number;
  pixelsBelow: number;
  newPages: unknown[];
  screenshotUploaded: boolean;
  cleanScreenshotUploaded: boolean;
  cleanScreenshotPath?: string;
}

export interface BionBrowserActionResult {
  sessionId?: string;
  clientId?: string;
  /**
   * Must match request `id` (wire uses `actionId` field).
   */
  actionId: string;
  status: 'success' | 'error';
  result?: BionBrowserActionResultSuccess;
  error?: string;
}

export type BionPluginMessage =
  | BionActivateExtensionMessage
  | BionExtensionConnectedMessage
  | BionSessionStatusMessage
  | BionBrowserActionMessage
  | BionBrowserActionResult
  | (Record<string, unknown> & { type: string });

