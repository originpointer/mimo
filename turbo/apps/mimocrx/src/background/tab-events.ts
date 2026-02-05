import type { PluginBusClient } from "mimo-bus/client";
import type { FullStateSyncMessage, TabEventMessage, TabGroupData, TabData, WindowData } from "mimo-protocol";

// Chrome tabs event types (type definition varies across @types/chrome versions)
type TabChangeInfo = {
  audible?: boolean;
  discarded?: boolean;
  favIconUrl?: string;
  mutedInfo?: chrome.tabs.MutedInfo;
  pinned?: boolean;
  status?: string;
  title?: string;
  url?: string;
};

type TabActiveInfo = {
  tabId: number;
  windowId: number;
};

type TabRemoveInfo = {
  windowId: number;
  isWindowClosing: boolean;
};

type TabEventsHandler = {
  start(): Promise<void>;
  stop(): void;
  fullSync(): Promise<void>;
};

const TAB_GROUP_NONE = typeof chrome.tabGroups?.TAB_GROUP_ID_NONE === "number" ? chrome.tabGroups.TAB_GROUP_ID_NONE : -1;

function toTabData(tab: chrome.tabs.Tab): TabData | null {
  if (tab.id == null || tab.windowId == null) return null;
  const openerTabId = typeof tab.openerTabId === "number" && tab.openerTabId >= 0 ? tab.openerTabId : undefined;
  const status = tab.status === "loading" || tab.status === "complete" ? tab.status : undefined;
  const groupId = typeof tab.groupId === "number" && tab.groupId !== TAB_GROUP_NONE ? tab.groupId : undefined;

  return {
    tabId: tab.id,
    windowId: tab.windowId,
    groupId,
    url: tab.url ?? undefined,
    title: tab.title ?? undefined,
    favIconUrl: tab.favIconUrl ?? undefined,
    status,
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    hidden: Boolean((tab as any).hidden ?? false),
    index: typeof tab.index === "number" ? tab.index : 0,
    openerTabId,
  };
}

function toWindowData(window: chrome.windows.Window): WindowData | null {
  if (window.id == null) return null;
  return {
    windowId: window.id,
    focused: Boolean(window.focused),
    top: window.top ?? undefined,
    left: window.left ?? undefined,
    width: window.width ?? undefined,
    height: window.height ?? undefined,
    type: (window.type as WindowData["type"]) ?? "normal",
  };
}

function toTabGroupData(group: chrome.tabGroups.TabGroup): TabGroupData | null {
  if (group.id == null) return null;
  return {
    id: group.id,
    collapsed: Boolean(group.collapsed),
    color: group.color as TabGroupData["color"],
    title: group.title ?? undefined,
    windowId: group.windowId,
  };
}

async function getAllWindows(): Promise<chrome.windows.Window[]> {
  return await new Promise((resolve) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      if (chrome.runtime.lastError) {
        console.warn("[mimocrx] windows.getAll failed", chrome.runtime.lastError.message);
        resolve([]);
        return;
      }
      resolve(windows ?? []);
    });
  });
}

async function getTab(tabId: number): Promise<chrome.tabs.Tab | null> {
  return await new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab ?? null);
    });
  });
}

async function getWindow(windowId: number): Promise<chrome.windows.Window | null> {
  return await new Promise((resolve) => {
    chrome.windows.get(windowId, {}, (window) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(window ?? null);
    });
  });
}

async function getTabGroups(): Promise<chrome.tabGroups.TabGroup[]> {
  if (!chrome.tabGroups?.query) return [];
  return await new Promise((resolve) => {
    chrome.tabGroups.query({}, (groups) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      resolve(groups ?? []);
    });
  });
}

export function createTabEventsHandler(client: PluginBusClient): TabEventsHandler {
  let started = false;
  const cleanup: Array<() => void> = [];

  const emitTabEvent = (payload: Omit<TabEventMessage, "type" | "timestamp">) => {
    const message: TabEventMessage = {
      type: "tab_event",
      timestamp: Date.now(),
      ...payload,
    };
    client.emit(message as any);
  };

  const fullSync = async () => {
    const windows = await getAllWindows();
    const tabs = windows.flatMap((window) => window.tabs ?? []);
    const groups = await getTabGroups();

    const windowPayload = windows
      .map((window) => {
        const base = toWindowData(window);
        if (!base) return null;
        const tabIds = (window.tabs ?? []).map((tab) => tab.id).filter((id): id is number => typeof id === "number");
        return { ...base, tabIds };
      })
      .filter((window): window is FullStateSyncMessage["windows"][number] => Boolean(window));

    const tabPayload = tabs.map(toTabData).filter((tab): tab is TabData => Boolean(tab));
    const groupPayload = groups.map(toTabGroupData).filter((group): group is TabGroupData => Boolean(group));

    const activeWindowId = windows.find((window) => window.focused)?.id ?? null;
    const activeTabId =
      tabs.find((tab) => tab.active && tab.windowId === activeWindowId)?.id ??
      tabs.find((tab) => tab.active)?.id ??
      null;

    const message: FullStateSyncMessage = {
      type: "full_state_sync",
      windows: windowPayload,
      tabs: tabPayload,
      tabGroups: groupPayload,
      activeWindowId,
      activeTabId,
      timestamp: Date.now(),
    };

    client.emit(message as any);
  };

  const start = async () => {
    if (started) return;
    started = true;

    const onTabCreated = (tab: chrome.tabs.Tab) => {
      const payload = toTabData(tab);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_created", tab: payload });
    };

    const onTabUpdated = (_tabId: number, _changeInfo: TabChangeInfo, tab: chrome.tabs.Tab) => {
      const payload = toTabData(tab);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_updated", tab: payload });
    };

    const onTabActivated = (activeInfo: TabActiveInfo) => {
      void (async () => {
        const tab = await getTab(activeInfo.tabId);
        if (tab) {
          const payload = toTabData(tab);
          if (payload) {
            emitTabEvent({ eventType: "tab_activated", tab: payload, tabId: payload.tabId, windowId: payload.windowId });
            return;
          }
        }
        emitTabEvent({ eventType: "tab_activated", tabId: activeInfo.tabId, windowId: activeInfo.windowId });
      })();
    };

    const onTabRemoved = (tabId: number, removeInfo: TabRemoveInfo) => {
      emitTabEvent({ eventType: "tab_removed", tabId, windowId: removeInfo.windowId });
    };

    const onWindowCreated = (window: chrome.windows.Window) => {
      const payload = toWindowData(window);
      if (!payload) return;
      emitTabEvent({ eventType: "window_created", window: payload, windowId: payload.windowId });
    };

    const onWindowRemoved = (windowId: number) => {
      emitTabEvent({ eventType: "window_removed", windowId });
    };

    const onWindowFocusChanged = (windowId: number) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      void (async () => {
        const window = await getWindow(windowId);
        const payload = window ? toWindowData(window) : null;
        emitTabEvent({ eventType: "window_focused", window: payload ?? undefined, windowId });
      })();
    };

    const onTabGroupCreated = (group: chrome.tabGroups.TabGroup) => {
      const payload = toTabGroupData(group);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_group_created", tabGroup: payload, tabGroupId: payload.id, windowId: payload.windowId });
    };

    const onTabGroupUpdated = (group: chrome.tabGroups.TabGroup) => {
      const payload = toTabGroupData(group);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_group_updated", tabGroup: payload, tabGroupId: payload.id, windowId: payload.windowId });
    };

    const onTabGroupRemoved = (groupOrId: chrome.tabGroups.TabGroup | number) => {
      if (typeof groupOrId === "number") {
        emitTabEvent({ eventType: "tab_group_removed", tabGroupId: groupOrId });
        return;
      }
      const payload = toTabGroupData(groupOrId);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_group_removed", tabGroup: payload, tabGroupId: payload.id, windowId: payload.windowId });
    };

    const onTabGroupMoved = (groupOrId: chrome.tabGroups.TabGroup | number) => {
      if (typeof groupOrId === "number") {
        chrome.tabGroups.get(groupOrId, (group) => {
          if (chrome.runtime.lastError || !group) return;
          const payload = toTabGroupData(group);
          if (!payload) return;
          emitTabEvent({ eventType: "tab_group_moved", tabGroup: payload, tabGroupId: payload.id, windowId: payload.windowId });
        });
        return;
      }
      const payload = toTabGroupData(groupOrId);
      if (!payload) return;
      emitTabEvent({ eventType: "tab_group_moved", tabGroup: payload, tabGroupId: payload.id, windowId: payload.windowId });
    };

    chrome.tabs.onCreated.addListener(onTabCreated);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.tabs.onActivated.addListener(onTabActivated);
    chrome.tabs.onRemoved.addListener(onTabRemoved);

    chrome.windows.onCreated.addListener(onWindowCreated);
    chrome.windows.onRemoved.addListener(onWindowRemoved);
    chrome.windows.onFocusChanged.addListener(onWindowFocusChanged);

    if (chrome.tabGroups?.onCreated) {
      chrome.tabGroups.onCreated.addListener(onTabGroupCreated);
      chrome.tabGroups.onUpdated.addListener(onTabGroupUpdated);
      chrome.tabGroups.onRemoved.addListener(onTabGroupRemoved);
      chrome.tabGroups.onMoved.addListener(onTabGroupMoved);
    }

    cleanup.push(() => chrome.tabs.onCreated.removeListener(onTabCreated));
    cleanup.push(() => chrome.tabs.onUpdated.removeListener(onTabUpdated));
    cleanup.push(() => chrome.tabs.onActivated.removeListener(onTabActivated));
    cleanup.push(() => chrome.tabs.onRemoved.removeListener(onTabRemoved));
    cleanup.push(() => chrome.windows.onCreated.removeListener(onWindowCreated));
    cleanup.push(() => chrome.windows.onRemoved.removeListener(onWindowRemoved));
    cleanup.push(() => chrome.windows.onFocusChanged.removeListener(onWindowFocusChanged));

    if (chrome.tabGroups?.onCreated) {
      cleanup.push(() => chrome.tabGroups.onCreated.removeListener(onTabGroupCreated));
      cleanup.push(() => chrome.tabGroups.onUpdated.removeListener(onTabGroupUpdated));
      cleanup.push(() => chrome.tabGroups.onRemoved.removeListener(onTabGroupRemoved));
      cleanup.push(() => chrome.tabGroups.onMoved.removeListener(onTabGroupMoved));
    }

    await fullSync();
  };

  const stop = () => {
    if (!started) return;
    started = false;
    for (const dispose of cleanup.splice(0, cleanup.length)) {
      dispose();
    }
  };

  return { start, stop, fullSync };
}
