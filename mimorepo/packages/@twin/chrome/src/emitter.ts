/**
 * 标签页事件发射器
 * 用于在 server 端接收和转发标签页事件
 */

import { EventEmitter } from 'events';
import type { TabEvent, TabData, WindowData, TabEventEmitterEvents } from './types';

/**
 * 标签页事件发射器
 * 接收来自 Bion 协议的标签页事件并转发给订阅者
 */
export class TabEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 允许多个监听器
  }

  /**
   * 发射标签页事件
   */
  emitTabEvent(event: TabEvent): void {
    this.emit('tab_event', event);
  }

  /**
   * 订阅标签页事件
   */
  onTabEvent(handler: (event: TabEvent) => void): this {
    return this.on('tab_event', handler);
  }

  /**
   * 取消订阅标签页事件
   */
  offTabEvent(handler: (event: TabEvent) => void): this {
    return this.off('tab_event', handler);
  }

  /**
   * 一次性订阅标签页事件
   */
  onceTabEvent(handler: (event: TabEvent) => void): this {
    return this.once('tab_event', handler);
  }
}

/**
 * 类型安全的 EventEmitter 增强（接口合并）
 */
export interface TabEventEmitter {
  on<K extends keyof TabEventEmitterEvents>(
    event: K,
    listener: (...args: TabEventEmitterEvents[K]) => void
  ): this;
  emit<K extends keyof TabEventEmitterEvents>(
    event: K,
    ...args: TabEventEmitterEvents[K]
  ): boolean;
  off<K extends keyof TabEventEmitterEvents>(
    event: K,
    listener: (...args: TabEventEmitterEvents[K]) => void
  ): this;
  once<K extends keyof TabEventEmitterEvents>(
    event: K,
    listener: (...args: TabEventEmitterEvents[K]) => void
  ): this;
}

/**
 * 从 Bion 协议消息创建 TabEvent
 */
export function createTabEventFromBionMessage(
  eventType: TabEvent['type'],
  data: { tab?: TabData; window?: WindowData; tabId?: number; windowId?: number }
): TabEvent {
  const timestamp = Date.now();

  switch (eventType) {
    case 'tab_created':
      return {
        type: 'tab_created',
        tab: convertToTabState(data.tab!),
        timestamp,
      };
    case 'tab_updated':
      return {
        type: 'tab_updated',
        tab: convertToTabState(data.tab!),
        changes: {}, // 由调用方填充具体变化
        timestamp,
      };
    case 'tab_activated':
      return {
        type: 'tab_activated',
        tabId: data.tabId!,
        windowId: data.windowId!,
        tab: data.tab ? convertToTabState(data.tab) : undefined,
        timestamp,
      };
    case 'tab_removed':
      return {
        type: 'tab_removed',
        tabId: data.tabId!,
        windowId: data.windowId!,
        timestamp,
      };
    case 'window_created':
      return {
        type: 'window_created',
        window: convertToWindowState(data.window!),
        timestamp,
      };
    case 'window_removed':
      return {
        type: 'window_removed',
        windowId: data.windowId!,
        timestamp,
      };
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { type: 'tab_created', tab: null as any, timestamp } as TabEvent;
  }
}

/**
 * 转换 TabData 为 TabState
 */
function convertToTabState(data: TabData): import('./types').TabState {
  return {
    id: data.tabId,
    windowId: data.windowId,
    url: data.url ?? null,
    title: data.title ?? null,
    favIconUrl: data.favIconUrl ?? null,
    status: data.status ?? null,
    active: data.active,
    pinned: data.pinned,
    hidden: data.hidden,
    index: data.index,
    openerTabId: data.openerTabId ?? null,
    lastUpdated: Date.now(),
  };
}

/**
 * 转换 WindowData 为 WindowState
 */
function convertToWindowState(data: WindowData): import('./types').WindowState {
  return {
    id: data.windowId,
    focused: data.focused,
    top: data.top ?? null,
    left: data.left ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    type: data.type,
    tabIds: [],
    lastUpdated: Date.now(),
  };
}
