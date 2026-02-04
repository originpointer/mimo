/**
 * 浏览器数字孪生状态存储
 * 维护浏览器标签页和窗口的实时状态
 */

import { EventEmitter } from 'events';
import type {
  TabState,
  WindowState,
  BrowserTwinState,
  TabEvent,
  BrowserTwinStoreEvents,
  TabGroupState,
  TabUpdatedEvent,
} from './types';

/**
 * 浏览器数字孪生状态存储类
 */
export class BrowserTwinStore extends EventEmitter {
  private state: BrowserTwinState;
  private windowTabIdsMap: Map<number, Set<number>>;

  constructor() {
    super();
    this.state = this.emptyState();
    this.windowTabIdsMap = new Map();
  }

  /**
   * 创建空状态
   */
  private emptyState(): BrowserTwinState {
    return {
      windows: new Map(),
      tabs: new Map(),
      groups: new Map(),
      activeWindowId: null,
      activeTabId: null,
      extensionState: 'idle',
      systemState: 'stopped', // Default to stopped until synced
      lastUpdated: Date.now(),
    };
  }

  /**
   * 应用事件更新状态
   */
  applyEvent(event: TabEvent): void {
    switch (event.type) {
      case 'tab_created':
        this.applyTabCreated(event);
        break;
      case 'tab_updated':
        this.applyTabUpdated(event);
        break;
      case 'tab_activated':
        this.applyTabActivated(event);
        break;
      case 'tab_removed':
        this.applyTabRemoved(event);
        break;
      case 'window_created':
        this.applyWindowCreated(event);
        break;
      case 'window_removed':
        this.applyWindowRemoved(event);
        break;
      case 'tab_group_created':
        this.applyTabGroupCreated(event);
        break;
      case 'tab_group_updated':
        this.applyTabGroupUpdated(event);
        break;
      case 'tab_group_removed':
        this.applyTabGroupRemoved(event);
        break;
      case 'tab_group_moved':
        this.applyTabGroupMoved(event);
        break;
      case 'window_focused':
        this.applyWindowFocused(event);
        break;
    }
    this.state.lastUpdated = Date.now();
    this.emit('state_changed', { state: this.snapshot(), event });
  }

  /**
   * 处理标签页创建
   */
  private applyTabCreated(event: TabEvent & { type: 'tab_created' }): void {
    const { tab } = event;
    this.state.tabs.set(tab.id, tab);
    this.addTabToWindow(tab.windowId, tab.id);
    this.emit('tab_created', tab);
  }

  /**
   * 处理标签页更新
   */
  private applyTabUpdated(event: TabEvent & { type: 'tab_updated' }): void {
    const { tab, changes } = event;
    this.state.tabs.set(tab.id, tab);
    // 检查是否有窗口变更（通常不发生，但如果是移动标签页的情况）
    if (changes && changes.pinned !== undefined) {
      // Pinned state changed
    }
    this.emit('tab_updated', tab, changes);
  }

  /**
   * 处理标签页激活
   */
  private applyTabActivated(event: TabEvent & { type: 'tab_activated' }): void {
    const { tabId, windowId } = event;

    // 更新所有标签页的 active 状态
    // 注意：Chrome 中每个窗口都有一个 active tab，但通常全局只有一个 active tab
    // 这里我们简单地将指定 tab 设为 active，同窗口其他 tab 设为 inactive

    const windowTabs = this.getTabsByWindow(windowId);
    for (const tab of windowTabs) {
      if (tab.id === tabId) {
        tab.active = true;
      } else {
        tab.active = false;
      }
    }

    this.state.activeTabId = tabId;
    this.state.activeWindowId = windowId; // 激活标签页通常意味着窗口也被激活（或至少是该窗口内的操作）

    this.emit('tab_activated', { tabId, windowId });
  }

  /**
   * 处理标签页移除
   */
  private applyTabRemoved(event: TabEvent & { type: 'tab_removed' }): void {
    const { tabId, windowId } = event;
    this.state.tabs.delete(tabId);
    this.removeTabFromWindow(windowId, tabId);

    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = null;
    }

    this.emit('tab_removed', tabId, windowId);
  }

  /**
   * 处理窗口创建
   */
  private applyWindowCreated(event: TabEvent & { type: 'window_created' }): void {
    const { window } = event;
    // 如果事件中包含了 tabIds，我们需要初始化它们
    if (window.tabIds && window.tabIds.length > 0) {
      if (!this.windowTabIdsMap.has(window.id)) {
        this.windowTabIdsMap.set(window.id, new Set(window.tabIds));
      } else {
        const set = this.windowTabIdsMap.get(window.id)!;
        for (const tid of window.tabIds) set.add(tid);
      }
    } else {
      // 没有任何 tab 的新窗口
      if (!this.windowTabIdsMap.has(window.id)) {
        this.windowTabIdsMap.set(window.id, new Set());
      }
    }

    // 确保 state 中的 window 对象也是同步的
    window.tabIds = Array.from(this.windowTabIdsMap.get(window.id)!);

    this.state.windows.set(window.id, window);
    this.emit('window_created', window);
  }

  /**
   * 处理窗口移除
   */
  private applyWindowRemoved(event: TabEvent & { type: 'window_removed' }): void {
    const { windowId } = event;

    const tabIds = this.windowTabIdsMap.get(windowId);
    if (tabIds) {
      for (const tabId of tabIds) {
        this.state.tabs.delete(tabId);
      }
      this.windowTabIdsMap.delete(windowId);
    }

    this.state.windows.delete(windowId);

    if (this.state.activeWindowId === windowId) {
      this.state.activeWindowId = null;
      this.state.activeTabId = null;
    }

    this.emit('window_removed', windowId);
  }

  /**
   * 处理窗口焦点变化
   */
  private applyWindowFocused(event: TabEvent & { type: 'window_focused' }): void {
    const { windowId, focused } = event;
    const window = this.state.windows.get(windowId);

    // DEBUG LOGGING
    this.emit('log', '[BrowserTwinStore] applyWindowFocused', {
      windowId,
      focused,
      windowFound: !!window,
      currentActiveWindowId: this.state.activeWindowId,
      windowIdType: typeof windowId,
      mapKeys: Array.from(this.state.windows.keys()).map(k => `${k} (${typeof k})`)
    });

    if (window) {
      window.focused = focused;
      window.lastUpdated = event.timestamp;

      this.emit('log', '[BrowserTwinStore] Window state updated:', {
        windowId,
        newFocused: window.focused,
        timestamp: window.lastUpdated
      });
    } else {
      this.emit('log', '[BrowserTwinStore] Window not found for focus update:', windowId);
    }

    if (focused) {
      // Ensure no other windows are focused
      for (const win of this.state.windows.values()) {
        if (win.id !== windowId && win.focused) {
          win.focused = false;
          // Ideally we update lastUpdated for other windows too, but pure state update is enough for now
        }
      }
      this.state.activeWindowId = windowId;

      // If the window has an active tab, update system active tab state
      if (window) {
        // Find the active tab in this window
        const activeTabId = window.tabIds.find(tid => {
          const t = this.state.tabs.get(tid);
          return t && t.active;
        });
        if (activeTabId) {
          this.state.activeTabId = activeTabId;
        }
      }

    } else {
      // If window lost focus and it was the active one, clear activeWindowId
      if (this.state.activeWindowId === windowId) {
        this.state.activeWindowId = null;
        // Should we clear activeTabId too? 
        // Chrome usually keeps an active tab per window, but "system active tab" implies the one in the focused window.
        // this.state.activeTabId = null; // Keep active tab ID for continuity if needed, or clear it.
        // Let's keep it for now unless specific requirement says otherwise.
      }
    }

    this.emit('window_focused', windowId, focused);
  }

  /**
   * 处理标签组创建
   */
  private applyTabGroupCreated(event: TabEvent & { type: 'tab_group_created' }): void {
    const { tabGroup } = event;
    this.state.groups.set(tabGroup.id, tabGroup);
    this.emit('tab_group_created', tabGroup);
  }

  /**
   * 处理标签组更新
   */
  private applyTabGroupUpdated(event: TabEvent & { type: 'tab_group_updated' }): void {
    const { tabGroup } = event;
    this.state.groups.set(tabGroup.id, tabGroup);
    this.emit('tab_group_updated', tabGroup);
  }

  /**
   * 处理标签组移除
   */
  private applyTabGroupRemoved(event: TabEvent & { type: 'tab_group_removed' }): void {
    const { tabGroupId } = event;
    this.state.groups.delete(tabGroupId);
    this.emit('tab_group_removed', tabGroupId);
  }

  /**
   * 处理标签组移动
   */
  private applyTabGroupMoved(event: TabEvent & { type: 'tab_group_moved' }): void {
    const { tabGroup } = event;
    this.state.groups.set(tabGroup.id, tabGroup);
    this.emit('tab_group_moved', tabGroup);
  }

  /**
   * 将标签页添加到窗口
   */
  private addTabToWindow(windowId: number, tabId: number): void {
    if (!this.windowTabIdsMap.has(windowId)) {
      this.windowTabIdsMap.set(windowId, new Set());
    }
    this.windowTabIdsMap.get(windowId)!.add(tabId);

    const window = this.state.windows.get(windowId);
    if (window) {
      window.tabIds = Array.from(this.windowTabIdsMap.get(windowId)!);
    }
  }

  /**
   * 从窗口移除标签页
   */
  private removeTabFromWindow(windowId: number, tabId: number): void {
    const tabIds = this.windowTabIdsMap.get(windowId);
    if (tabIds) {
      tabIds.delete(tabId);

      const window = this.state.windows.get(windowId);
      if (window) {
        window.tabIds = Array.from(tabIds);
      }
    }
  }

  /**
   * 获取当前状态快照
   */
  snapshot(): BrowserTwinState {
    return {
      windows: new Map(this.state.windows),
      tabs: new Map(this.state.tabs),
      groups: new Map(this.state.groups),
      activeWindowId: this.state.activeWindowId,
      activeTabId: this.state.activeTabId,
      extensionState: this.state.extensionState,
      systemState: this.state.systemState,
      lastUpdated: this.state.lastUpdated,
    };
  }

  /**
   * 获取状态的可序列化版本（用于 JSON 传输）
   */
  toJSON(): {
    windows: Record<number, WindowState>;
    tabs: Record<number, TabState>;
    groups: Record<number, TabGroupState>;
    activeWindowId: number | null;
    activeTabId: number | null;
    extensionState: string;
    systemState: string;
    lastUpdated: number;
  } {
    return {
      windows: Object.fromEntries(
        Array.from(this.state.windows.entries()).map(([id, win]) => [
          id,
          { ...win, tabIds: [...win.tabIds] },
        ])
      ),
      tabs: Object.fromEntries(this.state.tabs.entries()),
      groups: Object.fromEntries(this.state.groups.entries()),
      activeWindowId: this.state.activeWindowId,
      activeTabId: this.state.activeTabId,
      extensionState: this.state.extensionState,
      systemState: this.state.systemState,
      lastUpdated: this.state.lastUpdated,
    };
  }

  /**
   * 获取特定标签页状态
   */
  getTab(tabId: number): TabState | undefined {
    return this.state.tabs.get(tabId);
  }

  /**
   * 获取所有标签页
   */
  getAllTabs(): TabState[] {
    return Array.from(this.state.tabs.values());
  }

  /**
   * 获取特定窗口的所有标签页
   */
  getTabsByWindow(windowId: number): TabState[] {
    const tabIds = this.windowTabIdsMap.get(windowId);
    if (!tabIds) return [];

    return Array.from(tabIds)
      .map((id) => this.state.tabs.get(id))
      .filter((tab): tab is TabState => tab !== undefined);
  }

  /**
   * 获取活动标签页
   */
  getActiveTab(): TabState | undefined {
    return this.state.activeTabId ? this.state.tabs.get(this.state.activeTabId) : undefined;
  }

  /**
   * 获取特定窗口状态
   */
  getWindow(windowId: number): WindowState | undefined {
    return this.state.windows.get(windowId);
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): WindowState[] {
    return Array.from(this.state.windows.values());
  }

  /**
   * 获取活动窗口
   */
  getActiveWindow(): WindowState | undefined {
    return this.state.activeWindowId ? this.state.windows.get(this.state.activeWindowId) : undefined;
  }

  /**
   * 获取特定标签组
   */
  getGroup(groupId: number): TabGroupState | undefined {
    return this.state.groups.get(groupId);
  }

  /**
   * 获取所有标签组
   */
  getAllGroups(): TabGroupState[] {
    return Array.from(this.state.groups.values());
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state = this.emptyState();
    this.windowTabIdsMap.clear();
    this.emit('state_changed', { state: this.snapshot() });
  }
}

/**
 * 类型安全的 EventEmitter 增强（接口合并）
 */
export interface BrowserTwinStore {
  on<K extends keyof BrowserTwinStoreEvents>(
    event: K,
    listener: (...args: BrowserTwinStoreEvents[K]) => void
  ): this;
  emit<K extends keyof BrowserTwinStoreEvents>(
    event: K,
    ...args: BrowserTwinStoreEvents[K]
  ): boolean;
  off<K extends keyof BrowserTwinStoreEvents>(
    event: K,
    listener: (...args: BrowserTwinStoreEvents[K]) => void
  ): this;
}
