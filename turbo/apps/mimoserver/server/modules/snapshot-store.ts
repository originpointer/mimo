import type { FullStateSyncMessage, TabEventMessage } from "mimo-protocol";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const SNAPSHOT_DIR = ".data";
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "snapshot.json");

export type SnapshotState = {
  windows: Array<any>;
  tabs: Array<any>;
  tabGroups: Array<any>;
  activeWindowId: number | null;
  activeTabId: number | null;
  lastUpdated: number;
  connected: boolean;
};

export class SnapshotStore {
  private snapshot: SnapshotState = {
    windows: [],
    tabs: [],
    tabGroups: [],
    activeWindowId: null,
    activeTabId: null,
    lastUpdated: 0,
    connected: false,
  };

  private logSnapshot(event: string, details: Record<string, unknown>) {
    const enabled = process.env.MIMO_SNAPSHOT_DEBUG === "1" || process.env.MIMO_SNAPSHOT_DEBUG === "true";
    if (!enabled) return;
    // eslint-disable-next-line no-console
    console.log("[SnapshotStore]", event, details);
  }

  async load() {
    try {
      await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
      const content = await fs.readFile(SNAPSHOT_FILE, "utf-8");
      const data = JSON.parse(content);
      // Validate or sanitize if necessary
      this.snapshot = {
        ...this.snapshot,
        ...data,
        connected: false, // Start as disconnected until a new event arrives
      };
      // eslint-disable-next-line no-console
      console.log(`[SnapshotStore] Loaded snapshot from ${SNAPSHOT_FILE}`);
    } catch (err) {
      if ((err as any).code === "ENOENT") {
        // eslint-disable-next-line no-console
        console.log(`[SnapshotStore] No cached snapshot found at ${SNAPSHOT_FILE}`);
      } else {
        // eslint-disable-next-line no-console
        console.error(`[SnapshotStore] Failed to load snapshot from ${SNAPSHOT_FILE}`, err);
      }
    }
  }

  private async save() {
    try {
      await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
      await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(this.snapshot, null, 2), "utf-8");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[SnapshotStore] Failed to save snapshot to ${SNAPSHOT_FILE}`, err);
    }
  }

  getSnapshot() {
    const now = Date.now();
    const ageMs = this.snapshot.lastUpdated ? now - this.snapshot.lastUpdated : 0;
    return {
      ...this.snapshot,
      ageMs,
      stale: !this.snapshot.connected || ageMs > 30_000,
    };
  }

  applyFullSync(msg: FullStateSyncMessage) {
    this.snapshot = {
      windows: msg.windows,
      tabs: msg.tabs,
      tabGroups: msg.tabGroups,
      activeWindowId: msg.activeWindowId,
      activeTabId: msg.activeTabId,
      lastUpdated: msg.timestamp,
      connected: true,
    };
    this.logSnapshot("full_state_sync", {
      windows: msg.windows.length,
      tabs: msg.tabs.length,
      tabGroups: msg.tabGroups.length,
      activeWindowId: msg.activeWindowId,
      activeTabId: msg.activeTabId,
      timestamp: msg.timestamp,
    });
    void this.save();
  }

  applyTabEvent(msg: TabEventMessage) {
    const prevCounts = {
      windows: this.snapshot.windows.length,
      tabs: this.snapshot.tabs.length,
      tabGroups: this.snapshot.tabGroups.length,
      activeWindowId: this.snapshot.activeWindowId,
      activeTabId: this.snapshot.activeTabId,
    };

    // Minimal incremental update: update lastUpdated and mark connected.
    this.snapshot = {
      ...this.snapshot,
      lastUpdated: msg.timestamp,
      connected: true,
    };

    const tabs = new Map(this.snapshot.tabs.map((t: any) => [t.tabId ?? t.id, t]));
    const windows = new Map(this.snapshot.windows.map((w: any) => [w.windowId ?? w.id, w]));
    const groups = new Map(this.snapshot.tabGroups.map((g: any) => [g.id, g]));

    const ensureWindowTabIds = (windowId: number, tabId: number) => {
      const window = windows.get(windowId);
      if (!window) return;
      const tabIds = Array.isArray(window.tabIds) ? window.tabIds : [];
      if (!tabIds.includes(tabId)) {
        window.tabIds = [...tabIds, tabId];
        windows.set(windowId, window);
      }
    };

    const removeWindowTabId = (windowId: number, tabId: number) => {
      const window = windows.get(windowId);
      if (!window || !Array.isArray(window.tabIds)) return;
      window.tabIds = window.tabIds.filter((id: number) => id !== tabId);
      windows.set(windowId, window);
    };

    switch (msg.eventType) {
      case "tab_created":
      case "tab_updated": {
        if (msg.tab) {
          tabs.set(msg.tab.tabId, msg.tab);
          ensureWindowTabIds(msg.tab.windowId, msg.tab.tabId);
          if (msg.tab.active) {
            this.snapshot.activeTabId = msg.tab.tabId;
            this.snapshot.activeWindowId = msg.tab.windowId;
          }
        }
        break;
      }
      case "tab_activated": {
        const tabId = msg.tab?.tabId ?? msg.tabId;
        const windowId = msg.tab?.windowId ?? msg.windowId;
        if (msg.tab) {
          tabs.set(msg.tab.tabId, msg.tab);
          ensureWindowTabIds(msg.tab.windowId, msg.tab.tabId);
        }
        if (typeof tabId === "number") this.snapshot.activeTabId = tabId;
        if (typeof windowId === "number") this.snapshot.activeWindowId = windowId;
        break;
      }
      case "tab_removed": {
        const tabId = msg.tabId ?? msg.tab?.tabId;
        const windowId = msg.windowId ?? msg.tab?.windowId;
        if (typeof tabId === "number") {
          tabs.delete(tabId);
          if (typeof windowId === "number") {
            removeWindowTabId(windowId, tabId);
          }
          if (this.snapshot.activeTabId === tabId) {
            this.snapshot.activeTabId = null;
          }
        }
        break;
      }
      case "window_created": {
        if (msg.window) {
          windows.set(msg.window.windowId, msg.window);
        }
        break;
      }
      case "window_removed": {
        const windowId = msg.windowId ?? msg.window?.windowId;
        if (typeof windowId === "number") {
          windows.delete(windowId);
          for (const [tabId, tab] of tabs.entries()) {
            if ((tab as any)?.windowId === windowId) {
              tabs.delete(tabId);
            }
          }
          if (this.snapshot.activeWindowId === windowId) {
            this.snapshot.activeWindowId = null;
            this.snapshot.activeTabId = null;
          }
        }
        break;
      }
      case "window_focused": {
        const windowId = msg.windowId ?? msg.window?.windowId;
        if (msg.window) {
          windows.set(msg.window.windowId, msg.window);
        }
        if (typeof windowId === "number") {
          this.snapshot.activeWindowId = windowId;
        }
        break;
      }
      case "tab_group_created":
      case "tab_group_updated":
      case "tab_group_moved": {
        if (msg.tabGroup) {
          groups.set(msg.tabGroup.id, msg.tabGroup);
        }
        break;
      }
      case "tab_group_removed": {
        const groupId = msg.tabGroupId ?? msg.tabGroup?.id;
        if (typeof groupId === "number") {
          groups.delete(groupId);
          for (const [tabId, tab] of tabs.entries()) {
            if ((tab as any)?.groupId === groupId) {
              tabs.set(tabId, { ...tab, groupId: undefined });
            }
          }
        }
        break;
      }
      default: {
        if (msg.tab) {
          tabs.set(msg.tab.tabId, msg.tab);
        }
        if (msg.window) {
          windows.set(msg.window.windowId, msg.window);
        }
        if (msg.tabGroup) {
          groups.set(msg.tabGroup.id, msg.tabGroup);
        }
      }
    }

    this.snapshot.tabs = Array.from(tabs.values());
    this.snapshot.windows = Array.from(windows.values());
    this.snapshot.tabGroups = Array.from(groups.values());

    const nextCounts = {
      windows: this.snapshot.windows.length,
      tabs: this.snapshot.tabs.length,
      tabGroups: this.snapshot.tabGroups.length,
      activeWindowId: this.snapshot.activeWindowId,
      activeTabId: this.snapshot.activeTabId,
    };

    this.logSnapshot("tab_event", {
      eventType: msg.eventType,
      timestamp: msg.timestamp,
      counts: nextCounts,
      delta: {
        windows: nextCounts.windows - prevCounts.windows,
        tabs: nextCounts.tabs - prevCounts.tabs,
        tabGroups: nextCounts.tabGroups - prevCounts.tabGroups,
        activeWindowChanged: prevCounts.activeWindowId !== nextCounts.activeWindowId,
        activeTabChanged: prevCounts.activeTabId !== nextCounts.activeTabId,
      },
    });

    void this.save();
  }
}
