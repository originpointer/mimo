export interface SnapshotState {
  windows: Array<{
    id: number;
    focused: boolean;
    top: number | null;
    left: number | null;
    width: number | null;
    height: number | null;
    type: "normal" | "popup" | "panel" | "app" | "devtools";
    tabIds: number[];
    lastUpdated: number;
  }>;
  tabs: Array<{
    id: number;
    windowId: number;
    groupId?: number;
    url: string | null;
    title: string | null;
    favIconUrl: string | null;
    status: "loading" | "complete" | null;
    active: boolean;
    pinned: boolean;
    hidden: boolean;
    index: number;
    openerTabId: number | null;
    lastUpdated: number;
  }>;
  tabGroups: Array<{
    id: number;
    collapsed: boolean;
    color: string;
    title?: string;
    windowId: number;
  }>;
  activeWindowId: number | null;
  activeTabId: number | null;
  lastUpdated: number;
}
