/**
 * @twin/chrome - 浏览器数字孪生状态管理包
 *
 * 提供浏览器标签页和窗口的实时状态同步与管理
 */

export * from './types';
export * from './store';
export * from './emitter';
export * from './tab';
export * from './extensionManager';
export * from './systemManager';

import { BrowserTwinStore } from './store';
import { TabEventEmitter } from './emitter';
import { Tab } from './tab';

/**
 * 创建浏览器数字孪生状态存储
 */
export function createBrowserTwin(): BrowserTwinStore {
  return new BrowserTwinStore();
}

/**
 * 创建标签页事件发射器
 */
export function createTabEventEmitter(): TabEventEmitter {
  return new TabEventEmitter();
}

/**
 * 创建完整的浏览器数字孪生系统
 * 返回状态存储和事件发射器的组合
 */
export function createBrowserTwinSystem(): {
  store: BrowserTwinStore;
  emitter: TabEventEmitter;
} {
  const store = createBrowserTwin();
  const emitter = createTabEventEmitter();

  // 将发射器的事件自动应用到存储
  emitter.onTabEvent((event) => {
    store.applyEvent(event);
  });

  return { store, emitter };
}

/**
 * 创建 Tab 实例
 * @param data - 原始标签页数据
 * @returns Tab 对象
 */
export function createTab(data: import('./tab').TabRawData): Tab {
  return new Tab(data);
}
