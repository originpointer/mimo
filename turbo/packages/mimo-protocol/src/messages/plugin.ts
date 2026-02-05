import type { MimoProtocolVersion } from "../version";

export interface ActivateExtensionMessage {
  v?: MimoProtocolVersion;
  type: "activate_extension";
  id: string;
  clientId: string;
  ua: string;
  version: string;
  browserName: string;
  allowOtherClient: boolean;
  skipAuthorization: boolean;
}

export type TabEventType =
  | "tab_created"
  | "tab_updated"
  | "tab_activated"
  | "tab_removed"
  | "window_created"
  | "window_removed"
  | "tab_group_created"
  | "tab_group_updated"
  | "tab_group_removed"
  | "tab_group_moved"
  | "window_focused";

export interface TabData {
  tabId: number;
  windowId: number;
  groupId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: "loading" | "complete";
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;
  openerTabId?: number;
}

export interface WindowData {
  windowId: number;
  focused: boolean;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  type: "normal" | "popup" | "panel" | "app" | "devtools";
}

export interface TabGroupData {
  id: number;
  collapsed: boolean;
  color: "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";
  title?: string;
  windowId: number;
}

export interface TabEventMessage {
  v?: MimoProtocolVersion;
  type: "tab_event";
  eventType: TabEventType;
  tab?: TabData;
  window?: WindowData;
  tabGroup?: TabGroupData;
  tabId?: number;
  windowId?: number;
  tabGroupId?: number;
  timestamp: number;
}

export interface FullStateSyncMessage {
  v?: MimoProtocolVersion;
  type: "full_state_sync";
  windows: Array<WindowData & { tabIds: number[] }>;
  tabs: TabData[];
  tabGroups: TabGroupData[];
  activeWindowId: number | null;
  activeTabId: number | null;
  timestamp: number;
}

export type BrowserActionName = string;

export interface BrowserActionMessage {
  v?: MimoProtocolVersion;
  type: "browser_action";
  id: string;
  taskId: string;
  clientId: string;
  timestamp: number;
  action: Record<BrowserActionName, Record<string, unknown>>;
  screenshotPresignedUrl?: string;
}

export interface BrowserActionResult {
  v?: MimoProtocolVersion;
  type: "browser_action_result";
  actionId: string;
  taskId: string;
  clientId: string;
  status: "success" | "error" | "partial";
  result?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean } | { code?: string; message?: string } | unknown;
}

export type PluginMessage =
  | ActivateExtensionMessage
  | FullStateSyncMessage
  | TabEventMessage
  | BrowserActionMessage
  | BrowserActionResult
  | (Record<string, unknown> & { type: string });
