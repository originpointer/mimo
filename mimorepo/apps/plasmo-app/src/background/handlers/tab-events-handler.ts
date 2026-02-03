/**
 * Tab Events Handler
 *
 * 监听 Chrome 标签页和窗口事件，并通过 Bion 协议实时同步到 Server 端。
 * 用于维护浏览器数字孪生状态。
 */

import type { BionTabEventMessage, BionTabData, BionWindowData } from '@bion/protocol';
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
    };
  } = {};

  constructor(socketManager: BionSocketManager) {
    this.socketManager = socketManager;
  }

  /**
   * 启动监听 Chrome 标签页和窗口事件
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

    console.info('[TabEventsHandler] Started - Listening to tabs and windows events');
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
      tabId?: number;
      windowId?: number;
    }
  ): void {
    const message: BionTabEventMessage = {
      type: 'tab_event',
      eventType,
      tab: data.tab,
      window: data.window,
      tabId: data.tabId,
      windowId: data.windowId,
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
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      status: tab.status === 'loading' || tab.status === 'complete' ? tab.status : undefined,
      active: tab.active,
      pinned: tab.pinned,
      hidden: tab.hidden || false,
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
