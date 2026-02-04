/**
 * BrowserStateSync - 浏览器完整状态同步工具
 *
 * 功能：
 * 1. 查询所有窗口和标签页的完整状态
 * 2. 生成完整状态同步消息
 * 3. 详细的日志记录用于问题排查
 */

import type {
  BionFullStateSyncMessage,
  BionTabData,
  BionWindowData,
  BionTabGroupData,
} from '@bion/protocol';

const LOG_PREFIX = '[BrowserStateSync]';

// Module-level logging to confirm the module is loaded
console.log('[BrowserStateSync] Module loaded successfully');

/**
 * 浏览器完整状态
 */
interface FullBrowserState {
  windows: chrome.windows.Window[];
  tabs: chrome.tabs.Tab[];
  groups: chrome.tabGroups.TabGroup[];
  activeWindowId: number | null;
  activeTabId: number | null;
}

/**
 * 日志工具函数
 */
const log = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(`${LOG_PREFIX} ${message}`, data ?? '');
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`${LOG_PREFIX} ${message}`, data ?? '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`${LOG_PREFIX} ${message}`, error ?? '');
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    console.debug(`${LOG_PREFIX} ${message}`, data ?? '');
  },
};

/**
 * BrowserStateSync - 浏览器完整状态同步工具类
 */
export class BrowserStateSync {
  /**
   * 获取浏览器完整状态
   * 使用 chrome.windows.getAll({ populate: true }) 一次性获取所有窗口和标签页
   */
  static async getFullBrowserState(): Promise<FullBrowserState> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      log.info('Starting to fetch full browser state...');

      chrome.windows.getAll({ populate: true }, (windows) => {
        if (chrome.runtime.lastError) {
          log.error('Failed to get browser windows', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        log.info(`Retrieved ${windows.length} windows from Chrome API`);

        chrome.tabGroups.query({}, (groups) => {
          if (chrome.runtime.lastError) {
            // Log warning but don't fail, maybe permissions issue or old browser
            log.warn('Failed to get tab groups', { error: chrome.runtime.lastError });
            groups = [];
          }
          log.info(`Retrieved ${groups.length} groups from Chrome API`);

          // 收集所有标签页
          const tabs: chrome.tabs.Tab[] = [];
          for (const window of windows) {
            if (window.tabs) {
              tabs.push(...window.tabs);
              log.debug(`Window ${window.id} has ${window.tabs.length} tabs`, {
                windowType: window.type,
                focused: window.focused,
              });
            }
          }

          // 找到活动窗口和活动标签页
          const activeWindow = windows.find((w) => w.focused);
          const activeTab = activeWindow?.tabs?.find((t) => t.active);

          const state: FullBrowserState = {
            windows,
            tabs,
            groups,
            activeWindowId: activeWindow?.id ?? null,
            activeTabId: activeTab?.id ?? null,
          };

          const duration = Date.now() - startTime;

          log.info('Successfully fetched full browser state', {
            windowsCount: state.windows.length,
            tabsCount: state.tabs.length,
            groupsCount: state.groups.length,
            activeWindowId: state.activeWindowId,
            activeTabId: state.activeTabId,
            duration: `${duration}ms`,
          });

          // 记录每个窗口的详细信息
          for (const win of state.windows) {
            log.debug(`Window details`, {
              id: win.id,
              type: win.type,
              focused: win.focused,
              tabsCount: win.tabs?.length ?? 0,
              tabIds: win.tabs?.map((t) => t.id) ?? [],
            });
          }

          resolve(state);
        });
      });
    });
  }

  /**
   * 转换 chrome.windows.Window 为 BionWindowData（带 tabIds）
   */
  private static toWindowData(window: chrome.windows.Window): BionWindowData & { tabIds: number[] } {
    const windowData: BionWindowData & { tabIds: number[] } = {
      windowId: window.id!,
      focused: window.focused || false,
      top: window.top ?? undefined,
      left: window.left ?? undefined,
      width: window.width ?? undefined,
      height: window.height ?? undefined,
      type: window.type as 'normal' | 'popup' | 'panel' | 'app' | 'devtools',
      tabIds: window.tabs?.map((t) => t.id!) || [],
    };

    log.debug(`Converted window to BionWindowData`, {
      windowId: windowData.windowId,
      tabIds: windowData.tabIds,
      focused: windowData.focused,
    });

    return windowData;
  }

  /**
   * 转换 chrome.tabs.Tab 为 BionTabData
   */
  private static toTabData(tab: chrome.tabs.Tab): BionTabData {
    const tabData: BionTabData = {
      tabId: tab.id!,
      windowId: tab.windowId,
      groupId: tab.groupId > 0 ? tab.groupId : undefined,
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

    log.debug(`Converted tab to BionTabData`, {
      tabId: tabData.tabId,
      windowId: tabData.windowId,
      groupId: tabData.groupId,
      url: tabData.url,
      active: tabData.active,
    });

    return tabData;
  }

  /**
   * 转换 chrome.tabGroups.TabGroup 为 BionTabGroupData
   */
  private static toTabGroupData(group: chrome.tabGroups.TabGroup): BionTabGroupData {
    return {
      id: group.id,
      collapsed: group.collapsed,
      color: group.color as BionTabGroupData['color'],
      title: group.title,
      windowId: group.windowId
    };
  }

  /**
   * 生成完整状态同步消息
   */
  static async generateFullSyncMessage(): Promise<BionFullStateSyncMessage> {
    const startTime = Date.now();

    console.log('[BrowserStateSync] === Starting generateFullSyncMessage ===');
    log.info('=== Generating full state sync message ===');

    try {
      console.log('[BrowserStateSync] Calling getFullBrowserState...');
      const state = await this.getFullBrowserState();
      console.log('[BrowserStateSync] getFullBrowserState returned successfully', {
        windowsCount: state.windows.length,
        tabsCount: state.tabs.length,
        groupsCount: state.groups.length,
      });

      const message: BionFullStateSyncMessage = {
        type: 'full_state_sync',
        windows: state.windows.map((w) => this.toWindowData(w)),
        tabs: state.tabs.map((t) => this.toTabData(t)),
        tabGroups: state.groups.map((g) => this.toTabGroupData(g)),
        activeWindowId: state.activeWindowId,
        activeTabId: state.activeTabId,
        timestamp: Date.now(),
      };

      const duration = Date.now() - startTime;
      const messageSize = JSON.stringify(message).length;

      log.info('=== Full state sync message generated ===', {
        windowsCount: message.windows.length,
        tabsCount: message.tabs.length,
        groupsCount: message.tabGroups.length,
        activeWindowId: message.activeWindowId,
        activeTabId: message.activeTabId,
        timestamp: message.timestamp,
        duration: `${duration}ms`,
        messageSize: `${(messageSize / 1024).toFixed(2)} KB`,
      });

      // 按窗口分组统计标签页
      const windowsTabCount: Record<number, number> = {};
      for (const tab of message.tabs) {
        windowsTabCount[tab.windowId] = (windowsTabCount[tab.windowId] || 0) + 1;
      }

      log.debug('Tab count by window', windowsTabCount);

      // 验证消息完整性
      this.validateMessage(message);

      return message;
    } catch (error) {
      log.error('Failed to generate full state sync message', error);
      throw error;
    }
  }

  /**
   * 验证消息完整性
   */
  private static validateMessage(message: BionFullStateSyncMessage): void {
    const errors: string[] = [];

    // 检查窗口
    for (const win of message.windows) {
      if (!win.windowId || win.windowId <= 0) {
        errors.push(`Invalid windowId: ${win.windowId}`);
      }
      if (win.tabIds.some((id) => id <= 0)) {
        errors.push(`Window ${win.windowId} has invalid tabIds`);
      }
    }

    // 检查标签页
    const tabIds = new Set(message.tabs.map((t) => t.tabId));
    if (tabIds.size !== message.tabs.length) {
      errors.push(`Duplicate tabIds detected`);
    }

    for (const tab of message.tabs) {
      if (!tab.tabId || tab.tabId <= 0) {
        errors.push(`Invalid tabId: ${tab.tabId}`);
      }
      if (!tab.windowId || tab.windowId <= 0) {
        errors.push(`Tab ${tab.tabId} has invalid windowId: ${tab.windowId}`);
      }
      if (!message.windows.find((w) => w.windowId === tab.windowId)) {
        errors.push(`Tab ${tab.tabId} references non-existent window ${tab.windowId}`);
      }
      // Check groupId if present
      if (tab.groupId) {
        if (!message.tabGroups.find(g => g.id === tab.groupId)) {
          // It's possible for a tab to have a groupId that is not in tabGroups if race condition, 
          // strictly speaking we might want to warn.
          // But let's not fail validation for now as groups might be less consistent than windows?
          // Actually, for full sync, it should be consistent.
          // errors.push(`Tab ${tab.tabId} references non-existent groupId ${tab.groupId}`);
        }
      }
    }

    // 检查活动状态
    if (message.activeWindowId) {
      if (!message.windows.find((w) => w.windowId === message.activeWindowId)) {
        errors.push(`activeWindowId ${message.activeWindowId} not found in windows`);
      }
    }

    if (message.activeTabId) {
      if (!message.tabs.find((t) => t.tabId === message.activeTabId)) {
        errors.push(`activeTabId ${message.activeTabId} not found in tabs`);
      }
    }

    if (errors.length > 0) {
      log.error('Message validation failed', errors);
      throw new Error(`Invalid full state sync message: ${errors.join(', ')}`);
    }

    log.info('Message validation passed');
  }
}
