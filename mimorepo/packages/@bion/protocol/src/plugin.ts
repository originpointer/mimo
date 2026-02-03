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

/**
 * 标签页事件类型
 */
export type BionTabEventType =
  | 'tab_created'
  | 'tab_updated'
  | 'tab_activated'
  | 'tab_removed'
  | 'window_created'
  | 'window_removed';

/**
 * 标签页数据（对应 chrome.tabs.Tab）
 */
export interface BionTabData {
  tabId: number;
  windowId: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: 'loading' | 'complete';
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;
  openerTabId?: number;
}

/**
 * 窗口数据（对应 chrome.windows.Window）
 */
export interface BionWindowData {
  windowId: number;
  focused: boolean;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  type: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
}

/**
 * 标签页事件消息
 * 用于从插件实时同步标签页和窗口状态到 server
 */
export interface BionTabEventMessage {
  type: 'tab_event';
  eventType: BionTabEventType;
  tab?: BionTabData;
  window?: BionWindowData;
  tabId?: number;  // 用于 tab_activated 和 tab_removed
  windowId?: number;  // 用于 tab_activated、tab_removed 和 window_removed
  timestamp: number;
}

export type BionPluginMessage =
  | BionActivateExtensionMessage
  | BionExtensionConnectedMessage
  | BionSessionStatusMessage
  | BionBrowserActionMessage
  | BionBrowserActionResult
  | BionTabEventMessage
  | (Record<string, unknown> & { type: string });

