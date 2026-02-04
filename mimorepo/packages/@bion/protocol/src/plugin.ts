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
  | 'window_removed'
  | 'tab_group_created'
  | 'tab_group_updated'
  | 'tab_group_removed'
  | 'tab_group_moved';

/**
 * 标签页数据（对应 chrome.tabs.Tab）
 */
export interface BionTabData {
  tabId: number;
  windowId: number;
  groupId?: number; // Added groupId
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
 * 标签组数据 (对应 chrome.tabGroups.TabGroup)
 */
export interface BionTabGroupData {
  id: number;
  collapsed: boolean;
  color: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';
  title?: string;
  windowId: number;
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
  tabGroup?: BionTabGroupData; // Added tabGroup
  tabId?: number;  // 用于 tab_activated 和 tab_removed
  windowId?: number;  // 用于 tab_activated、tab_removed 和 window_removed
  tabGroupId?: number; // Used for tab_group_removed
  timestamp: number;
}

/**
 * 浏览器完整状态快照消息
 * 用于扩展在连接后主动同步完整浏览器状态到服务端
 */
export interface BionFullStateSyncMessage {
  type: 'full_state_sync';
  windows: Array<BionWindowData & { tabIds: number[] }>;
  tabs: BionTabData[];
  tabGroups: BionTabGroupData[]; // Added tabGroups
  activeWindowId: number | null;
  activeTabId: number | null;
  timestamp: number;
}

export type BionPluginMessage =
  | BionActivateExtensionMessage
  | BionExtensionConnectedMessage
  | BionSessionStatusMessage
  | BionBrowserActionMessage
  | BionBrowserActionResult
  | BionTabEventMessage
  | BionFullStateSyncMessage
  | (Record<string, unknown> & { type: string });

/**
 * 浏览器数字孪生状态同步消息
 * 用于从服务端向前端实时同步浏览器标签页和窗口状态
 */
export interface BionTwinStateSyncMessage {
  type: 'twin_state_sync';
  state: {
    windows: Array<{
      id: number;
      focused: boolean;
      top: number | null;
      left: number | null;
      width: number | null;
      height: number | null;
      type: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
      tabIds: number[];
      lastUpdated: number;
    }>;
    tabs: Array<{
      id: number;
      windowId: number;
      url: string | null;
      title: string | null;
      favIconUrl: string | null;
      status: 'loading' | 'complete' | null;
      active: boolean;
      pinned: boolean;
      hidden: boolean;
      index: number;
      openerTabId: number | null;
      lastUpdated: number;
    }>;
    activeWindowId: number | null;
    activeTabId: number | null;
    lastUpdated: number;
  };
}

