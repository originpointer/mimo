/**
 * Tab Events Handler
 *
 * 监听 Chrome 标签页和窗口事件，并通过 Bion 协议实时同步到 Server 端。
 * 用于维护浏览器数字孪生状态。
 */

import type { BionTabEventMessage, BionTabData, BionWindowData, BionTabGroupData } from '@bion/protocol';
import type { BionSocketManager } from '../managers/mimo-engine-manager';

export class TabEventsHandler {
  private socketManager: BionSocketManager;
  private enabled: boolean = false;
  private listeners: {
    tabs?: {
      onCreated?: (tab: chrome.tabs.Tab) => void;
      onUpdated?: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void;
      onActivated?: (activeInfo: chrome.tabs.TabActiveInfo) => void;
      onRemoved?: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void;
    };
    windows?: {
      onCreated?: (window: chrome.windows.Window) => void;
      onRemoved?: (windowId: number) => void;
      onFocusChanged?: (windowId: number) => void;
    };
    groups?: {
      onCreated?: (group: chrome.tabGroups.TabGroup) => void;
      onUpdated?: (group: chrome.tabGroups.TabGroup) => void;
      onRemoved?: (group: chrome.tabGroups.TabGroup) => void;
      onMoved?: (group: chrome.tabGroups.TabGroup) => void;
    };
  } = {};

  constructor(socketManager: BionSocketManager) {
    this.socketManager = socketManager;
  }

  /**
   * 启动监听 Chrome 标签页、窗口和标签组事件
   */
  start(): void {
    if (this.enabled) {
      console.warn('[TabEventsHandler] Already started');
      return;
    }

    this.enabled = true;
    console.info('[TabEventsHandler] Starting...');

    // 监听标签页创建
    this.listeners.tabs = this.listeners.tabs || {};
    this.listeners.tabs.onCreated = (tab: chrome.tabs.Tab) => {
      this.sendTabEvent('tab_created', { tab: this.toTabData(tab) });
    };
    chrome.tabs.onCreated.addListener(this.listeners.tabs.onCreated);

    // 监听标签页更新
    this.listeners.tabs.onUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      this.sendTabEvent('tab_updated', {
        tab: this.toTabData(tab),
        tabId,
        windowId: tab.windowId,
      });
    };
    chrome.tabs.onUpdated.addListener(this.listeners.tabs.onUpdated);

    // 监听标签页激活
    this.listeners.tabs.onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        this.sendTabEvent('tab_activated', {
          tab: this.toTabData(tab),
          tabId: activeInfo.tabId,
          windowId: activeInfo.windowId,
        });
      });
    };
    chrome.tabs.onActivated.addListener(this.listeners.tabs.onActivated);

    // 监听标签页关闭
    this.listeners.tabs.onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
      this.sendTabEvent('tab_removed', {
        tabId,
        windowId: removeInfo.windowId,
      });
    };
    chrome.tabs.onRemoved.addListener(this.listeners.tabs.onRemoved);

    // 监听窗口创建
    this.listeners.windows = this.listeners.windows || {};
    this.listeners.windows.onCreated = (window: chrome.windows.Window) => {
      this.sendTabEvent('window_created', {
        window: this.toWindowData(window),
      });
    };
    chrome.windows.onCreated.addListener(this.listeners.windows.onCreated);

    // 监听窗口关闭
    this.listeners.windows.onRemoved = (windowId: number) => {
      this.sendTabEvent('window_removed', {
        windowId,
      });
    };
    chrome.windows.onRemoved.addListener(this.listeners.windows.onRemoved);

    // 监听窗口焦点变化
    this.listeners.windows.onFocusChanged = (windowId: number) => {
      // 过滤掉开发者工具等特殊窗口引起的焦点变化，以及失焦事件 (WINDOW_ID_NONE)
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }

      chrome.windows.get(windowId, { populate: false }, (window) => {
        if (chrome.runtime.lastError) {
          // 窗口可能已经关闭
          return;
        }
        this.sendTabEvent('window_focused', {
          window: this.toWindowData(window),
          windowId: window.id,
        });
      });
    };
    chrome.windows.onFocusChanged.addListener(this.listeners.windows.onFocusChanged);

    // 监听标签组事件
    this.listeners.groups = this.listeners.groups || {};

    // Group Created
    this.listeners.groups.onCreated = (group: chrome.tabGroups.TabGroup) => {
      this.sendTabEvent('tab_group_created', {
        tabGroup: this.toTabGroupData(group)
      });
    };
    chrome.tabGroups.onCreated.addListener(this.listeners.groups.onCreated);

    // Group Updated
    this.listeners.groups.onUpdated = (group: chrome.tabGroups.TabGroup) => {
      this.sendTabEvent('tab_group_updated', {
        tabGroup: this.toTabGroupData(group)
      });
    };
    chrome.tabGroups.onUpdated.addListener(this.listeners.groups.onUpdated);

    // Group Removed
    this.listeners.groups.onRemoved = (group: chrome.tabGroups.TabGroup) => {
      // NOTE: chrome.tabGroups.onRemoved signature passes the TabGroup object in typical definitions, 
      // but checking generic docs, it might pass the group object. 
      // However, @types/chrome definition for onRemoved says: (group: TabGroup) => void. 
      // Wait, let me double check standard chrome API. Usually Removed events pass ID.
      // Checking local @types/chrome: `onRemoved: Event<(group: TabGroup) => void>;` seems weird for "Removed".
      // Actually standard API usually passes the object representing the closed group because it's gone?
      // Re-reading docs: "Fired when a group is closed." Callback args: "(group: TabGroup)".
      // So yes, we get the group object.

      this.sendTabEvent('tab_group_removed', {
        tabGroupId: group.id,
        tabGroup: this.toTabGroupData(group)
      });
    };
    chrome.tabGroups.onRemoved.addListener(this.listeners.groups.onRemoved);

    // Group Moved
    this.listeners.groups.onMoved = (group: chrome.tabGroups.TabGroup) => {
      this.sendTabEvent('tab_group_moved', {
        tabGroup: this.toTabGroupData(group)
      });
    };
    chrome.tabGroups.onMoved.addListener(this.listeners.groups.onMoved);

    console.info('[TabEventsHandler] Started - Listening to tabs, windows and groups events');
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    console.info('[TabEventsHandler] Stopping...');

    // 移除标签页监听器
    if (this.listeners.tabs) {
      if (this.listeners.tabs.onCreated) {
        chrome.tabs.onCreated.removeListener(this.listeners.tabs.onCreated);
      }
      if (this.listeners.tabs.onUpdated) {
        chrome.tabs.onUpdated.removeListener(this.listeners.tabs.onUpdated);
      }
      if (this.listeners.tabs.onActivated) {
        chrome.tabs.onActivated.removeListener(this.listeners.tabs.onActivated);
      }
      if (this.listeners.tabs.onRemoved) {
        chrome.tabs.onRemoved.removeListener(this.listeners.tabs.onRemoved);
      }
    }

    // 移除窗口监听器
    if (this.listeners.windows) {
      if (this.listeners.windows.onCreated) {
        chrome.windows.onCreated.removeListener(this.listeners.windows.onCreated);
      }
      if (this.listeners.windows.onRemoved) {
        chrome.windows.onRemoved.removeListener(this.listeners.windows.onRemoved);
      }
      if (this.listeners.windows.onFocusChanged) {
        chrome.windows.onFocusChanged.removeListener(this.listeners.windows.onFocusChanged);
      }
    }

    // 移除标签组监听器
    if (this.listeners.groups) {
      if (this.listeners.groups.onCreated) chrome.tabGroups.onCreated.removeListener(this.listeners.groups.onCreated);
      if (this.listeners.groups.onUpdated) chrome.tabGroups.onUpdated.removeListener(this.listeners.groups.onUpdated);
      if (this.listeners.groups.onRemoved) chrome.tabGroups.onRemoved.removeListener(this.listeners.groups.onRemoved);
      if (this.listeners.groups.onMoved) chrome.tabGroups.onMoved.removeListener(this.listeners.groups.onMoved);
    }

    this.listeners = {};
    console.info('[TabEventsHandler] Stopped');
  }

  /**
   * 发送标签页事件到 Server
   */
  private sendTabEvent(
    eventType: BionTabEventMessage['eventType'],
    data: {
      tab?: BionTabData;
      window?: BionWindowData;
      tabGroup?: BionTabGroupData;
      tabId?: number;
      windowId?: number;
      tabGroupId?: number;
    }
  ): void {
    const message: BionTabEventMessage = {
      type: 'tab_event',
      eventType,
      tab: data.tab,
      window: data.window,
      tabGroup: data.tabGroup,
      tabId: data.tabId,
      windowId: data.windowId,
      tabGroupId: data.tabGroupId,
      timestamp: Date.now(),
    };

    this.socketManager.sendTabEvent(message);
  }

  /**
   * 将 chrome.tabs.Tab 转换为 BionTabData
   */
  private toTabData(tab: chrome.tabs.Tab): BionTabData {
    return {
      tabId: tab.id!,
      windowId: tab.windowId,
      groupId: tab.groupId > 0 ? tab.groupId : undefined, // chrome returns -1 for no group
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      status: tab.status === 'loading' || tab.status === 'complete' ? tab.status : undefined,
      active: tab.active,
      pinned: tab.pinned,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hidden: (tab as any).hidden || false,
      index: tab.index,
      openerTabId: tab.openerTabId,
    };
  }

  /**
   * 将 chrome.windows.Window 转换为 BionWindowData
   */
  private toWindowData(window: chrome.windows.Window): BionWindowData {
    return {
      windowId: window.id!,
      focused: window.focused || false,
      top: window.top,
      left: window.left,
      width: window.width,
      height: window.height,
      type: window.type as 'normal' | 'popup' | 'panel' | 'app' | 'devtools',
    };
  }

  /**
   * 将 chrome.tabGroups.TabGroup 转换为 BionTabGroupData
   */
  private toTabGroupData(group: chrome.tabGroups.TabGroup): BionTabGroupData {
    return {
      id: group.id,
      collapsed: group.collapsed,
      color: group.color as BionTabGroupData['color'],
      title: group.title,
      windowId: group.windowId
    };
  }

  /**
   * 检查是否已启动
   */
  isStarted(): boolean {
    return this.enabled;
  }
}

/**
 * 生命周期感知接口
 */
export interface LifecycleAware {
  start(): void;
  stop(): void;
}
