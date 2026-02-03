/**
 * 标签页状态模型
 */

export interface TabState {
  id: number;
  windowId: number;
  url: string | null;
  title: string | null;
  favIconUrl: string | null;
  status: 'loading' | 'complete' | null;
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;
  openerTabId: number | null;
  lastUpdated: number;
}

/**
 * 窗口状态模型
 */
export interface WindowState {
  id: number;
  focused: boolean;
  top: number | null;
  left: number | null;
  width: number | null;
  height: number | null;
  type: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
  tabIds: number[];
  lastUpdated: number;
}

/**
 * 浏览器数字孪生状态
 */
export interface BrowserTwinState {
  windows: Map<number, WindowState>;
  tabs: Map<number, TabState>;
  activeWindowId: number | null;
  activeTabId: number | null;
  lastUpdated: number;
}

/**
 * 标签页事件类型
 */
export type TabEventType =
  | 'tab_created'
  | 'tab_updated'
  | 'tab_activated'
  | 'tab_removed'
  | 'window_created'
  | 'window_removed';

/**
 * 标签页事件基础接口
 */
export interface TabEventBase {
  type: TabEventType;
  timestamp: number;
}

/**
 * 标签页创建事件
 */
export interface TabCreatedEvent extends TabEventBase {
  type: 'tab_created';
  tab: TabState;
}

/**
 * 标签页更新事件
 */
export interface TabUpdatedEvent extends TabEventBase {
  type: 'tab_updated';
  tab: TabState;
  changes: {
    url?: boolean;
    status?: boolean;
    title?: boolean;
    favIconUrl?: boolean;
  };
}

/**
 * 标签页激活事件
 */
export interface TabActivatedEvent extends TabEventBase {
  type: 'tab_activated';
  tabId: number;
  windowId: number;
  tab?: TabState;
}

/**
 * 标签页移除事件
 */
export interface TabRemovedEvent extends TabEventBase {
  type: 'tab_removed';
  tabId: number;
  windowId: number;
}

/**
 * 窗口创建事件
 */
export interface WindowCreatedEvent extends TabEventBase {
  type: 'window_created';
  window: WindowState;
}

/**
 * 窗口移除事件
 */
export interface WindowRemovedEvent extends TabEventBase {
  type: 'window_removed';
  windowId: number;
}

/**
 * 所有标签页事件联合类型
 */
export type TabEvent =
  | TabCreatedEvent
  | TabUpdatedEvent
  | TabActivatedEvent
  | TabRemovedEvent
  | WindowCreatedEvent
  | WindowRemovedEvent;

/**
 * Bion 协议中的标签页数据（从插件发送）
 */
export interface TabData {
  tabId: number;
  windowId: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: 'loading' | 'complete';
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;
  openerTabId?: number;
}

/**
 * Bion 协议中的窗口数据（从插件发送）
 */
export interface WindowData {
  windowId: number;
  focused: boolean;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  type: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  state: BrowserTwinState;
  event?: TabEvent;
}

/**
 * 从 TabData 转换为 TabState
 */
export function tabDataToState(data: TabData): TabState {
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
 * 从 WindowData 转换为 WindowState
 */
export function windowDataToState(data: WindowData, tabIds: number[] = []): WindowState {
  return {
    id: data.windowId,
    focused: data.focused,
    top: data.top ?? null,
    left: data.left ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    type: data.type,
    tabIds,
    lastUpdated: Date.now(),
  };
}

// ============================================
// Tab Event Emitter Types (from emitter.ts)
// ============================================

/**
 * TabEventEmitter 事件类型
 */
export interface TabEventEmitterEvents {
  tab_event: [event: TabEvent];
}

// ============================================
// Browser Twin Store Types (from store.ts)
// ============================================

/**
 * BrowserTwinStore 事件类型
 */
export interface BrowserTwinStoreEvents {
  state_changed: [event: StateChangeEvent];
  tab_created: [tab: TabState];
  tab_updated: [tab: TabState, changes: TabUpdatedEvent['changes']];
  tab_activated: [tabId: number, windowId: number];
  tab_removed: [tabId: number, windowId: number];
  window_created: [window: WindowState];
  window_removed: [windowId: number];
}

// ============================================
// Tab Object Types (from tab.ts)
// ============================================

/**
 * Tab 属性变化事件类型
 */
export interface TabPropertyChangeEvent {
  /** 属性名称 */
  property: keyof TabProperties;
  /** 旧值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
  /** 变化时间戳 */
  timestamp: number;
}

/**
 * Tab 对象事件类型
 */
export interface TabEvents {
  /** 属性变化事件 */
  propertyChanged: [change: TabPropertyChangeEvent];
  /** 标签页状态完全更新事件 */
  updated: [state: TabState];
  /** 标签页关闭事件 */
  closed: [];
}

/**
 * Tab 原始属性数据（从 Chrome API 获取）
 */
export interface TabRawData {
  tabId: number;
  windowId: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: 'loading' | 'complete';
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;
  openerTabId?: number;
}

/**
 * Tab 扩展属性（除 Chrome API 原生属性外，可额外采集的属性）
 */
export interface TabExtendedProperties {
  /** 页面加载进度 (0-100) */
  loadProgress?: number;
  /** 是否为特殊协议页面 (chrome://, about: 等) */
  isSpecialPage?: boolean;
  /** 页面语言 */
  language?: string;
  /** 页面是否可编辑 */
  editable?: boolean;
  /** 最后一次内容变化时间戳 */
  contentLastModified?: number;
  /** 页面是否包含音频 */
  isAudible?: boolean;
  /** 页面是否正在录音 */
  isMuted?: boolean;
  /** 页面缩放比例 */
  zoom?: number;
  /** 最后一次导航时间戳 */
  lastNavigationTime?: number;
  /** 页面加载耗时（毫秒） */
  loadTime?: number;
  /** 自定义元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * Tab 统一属性集合
 */
export interface TabProperties {
  /** 标签页 ID */
  id: number;
  /** 所属窗口 ID */
  windowId: number;
  /** 页面 URL */
  url: string | null;
  /** 页面标题 */
  title: string | null;
  /** 网站图标 URL */
  favIconUrl: string | null;
  /** 加载状态 */
  status: 'loading' | 'complete' | null;
  /** 是否为当前激活标签 */
  active: boolean;
  /** 是否固定 */
  pinned: boolean;
  /** 是否隐藏 */
  hidden: boolean;
  /** 在窗口中的位置索引 */
  index: number;
  /** 打开此标签的源标签 ID */
  openerTabId: number | null;
  /** 最后更新时间戳 */
  lastUpdated: number;
}
