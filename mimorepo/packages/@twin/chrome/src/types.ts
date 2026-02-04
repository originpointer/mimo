/**
 * 标签页状态模型
 */

export enum TabStatus {
  Loading = 'loading',
  Complete = 'complete',
}

export interface TabState {
  id: number;
  windowId: number;
  groupId?: number;
  url: string | null;
  title: string | null;
  favIconUrl: string | null;
  status: TabStatus | null;
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;

  openerTabId: number | null;
  // Navigation State
  canGoBack: boolean;
  canGoForward: boolean;
  // Visual State
  zoomFactor: number;
  scrollPosition?: { x: number; y: number };
  lastUpdated: number;
}

/**
 * 窗口状态模型
 */
export enum WindowType {
  Normal = 'normal',
  Popup = 'popup',
  Panel = 'panel',
  App = 'app',
  Devtools = 'devtools',
}

export interface WindowState {
  id: number;
  focused: boolean;
  top: number | null;
  left: number | null;
  width: number | null;
  height: number | null;
  type: WindowType;
  tabIds: number[];
  lastUpdated: number;
}

/**
 * Tab Group State
 */
export enum TabGroupColor {
  Grey = 'grey',
  Blue = 'blue',
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green',
  Pink = 'pink',
  Purple = 'purple',
  Cyan = 'cyan',
  Orange = 'orange',
}

export interface TabGroupState {
  id: number;
  collapsed: boolean;
  color: TabGroupColor;
  title?: string;
  windowId: number;
}



/**
 * 浏览器数字孪生状态
 */
export interface BrowserTwinState {
  windows: Map<number, WindowState>;
  tabs: Map<number, TabState>;
  groups: Map<number, TabGroupState>;
  activeWindowId: number | null;
  activeTabId: number | null;


  extensionState: ExtensionState;
  systemState: SystemState;
  lastUpdated: number;
}

/**
 * 标签页事件类型
 */
export enum TabEventType {
  TabCreated = 'tab_created',
  TabUpdated = 'tab_updated',
  TabActivated = 'tab_activated',
  TabRemoved = 'tab_removed',
  WindowCreated = 'window_created',
  WindowRemoved = 'window_removed',
  TabGroupCreated = 'tab_group_created',
  TabGroupUpdated = 'tab_group_updated',
  TabGroupRemoved = 'tab_group_removed',
  TabGroupMoved = 'tab_group_moved',
  WindowFocused = 'window_focused',
}

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
  type: TabEventType.TabCreated;
  tab: TabState;
}

/**
 * 标签页更新事件
 */
export interface TabUpdatedEvent extends TabEventBase {
  type: TabEventType.TabUpdated;
  tab: TabState;
  changes: {
    url?: boolean;
    status?: boolean;
    title?: boolean;
    favIconUrl?: boolean;
    pinned?: boolean;
    // New state changes
    navigation?: boolean; // canGoBack/Forward changed
    zoom?: boolean;
    scroll?: boolean;
  };
}

/**
 * 标签页激活事件
 */
export interface TabActivatedEvent extends TabEventBase {
  type: TabEventType.TabActivated;
  tabId: number;
  windowId: number;
  tab?: TabState;
}

/**
 * 标签页移除事件
 */
export interface TabRemovedEvent extends TabEventBase {
  type: TabEventType.TabRemoved;
  tabId: number;
  windowId: number;
}

/**
 * 窗口创建事件
 */
export interface WindowCreatedEvent extends TabEventBase {
  type: TabEventType.WindowCreated;
  window: WindowState;
}

/**
 * 窗口移除事件
 */
export interface WindowRemovedEvent extends TabEventBase {
  type: TabEventType.WindowRemoved;
  windowId: number;
}


// Tab Group Events
export interface TabGroupCreatedEvent extends TabEventBase {
  type: TabEventType.TabGroupCreated;
  tabGroup: TabGroupState;
}

export interface TabGroupUpdatedEvent extends TabEventBase {
  type: TabEventType.TabGroupUpdated;
  tabGroup: TabGroupState;
}

export interface TabGroupRemovedEvent extends TabEventBase {
  type: TabEventType.TabGroupRemoved;
  tabGroupId: number;
}

export interface TabGroupMovedEvent extends TabEventBase {
  type: TabEventType.TabGroupMoved;
  tabGroup: TabGroupState;
}

export interface WindowFocusedEvent extends TabEventBase {
  type: TabEventType.WindowFocused;
  windowId: number;
  focused: boolean;
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
  | WindowRemovedEvent
  | TabGroupCreatedEvent
  | TabGroupUpdatedEvent
  | TabGroupRemovedEvent
  | TabGroupMovedEvent
  | WindowFocusedEvent;

/**
 * Bion 协议中的标签页数据（从插件发送）
 */
export interface TabData {
  tabId: number;
  windowId: number;
  groupId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: TabStatus;
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;

  openerTabId?: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  zoomFactor?: number;
  scrollPosition?: { x: number; y: number };
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
  type: WindowType;
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
    groupId: data.groupId,
    url: data.url ?? null,
    title: data.title ?? null,
    favIconUrl: data.favIconUrl ?? null,
    status: data.status ?? null,
    active: data.active,
    pinned: data.pinned,
    hidden: data.hidden,
    index: data.index,
    openerTabId: data.openerTabId ?? null,
    canGoBack: data.canGoBack ?? false,
    canGoForward: data.canGoForward ?? false,
    zoomFactor: data.zoomFactor ?? 1,
    scrollPosition: data.scrollPosition,
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
  log: [message: string, data?: any];
  tab_created: [tab: TabState];
  tab_updated: [tab: TabState, changes: TabUpdatedEvent['changes']];
  tab_activated: [tabId: number, windowId: number];
  tab_removed: [tabId: number, windowId: number];
  window_created: [window: WindowState];
  window_removed: [windowId: number];
  tab_group_created: [group: TabGroupState];
  tab_group_updated: [group: TabGroupState];
  tab_group_removed: [groupId: number];
  tab_group_moved: [group: TabGroupState];
  window_focused: [windowId: number, focused: boolean];
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
  groupId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: TabStatus;
  active: boolean;
  pinned: boolean;
  hidden: boolean;
  index: number;

  openerTabId?: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  zoomFactor?: number;
  scrollPosition?: { x: number; y: number };
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
  /** 所属标签组 ID */
  groupId?: number;
  /** 页面 URL */
  url: string | null;
  /** 页面标题 */
  title: string | null;
  /** 网站图标 URL */
  favIconUrl: string | null;
  /** 加载状态 */
  status: TabStatus | null;
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
  /** 是否可后退 */
  canGoBack: boolean;
  /** 是否可前进 */
  canGoForward: boolean;
  /** 页面缩放比例 */
  zoomFactor: number;
  /** 滚动位置 */
  scrollPosition?: { x: number; y: number };
  /** 最后更新时间戳 */
  lastUpdated: number;
}

/**
 * Extension (Content Script) State
 */
export enum ExtensionState {
  Idle = 'idle',
  Hidden = 'hidden',
  Ongoing = 'ongoing',
  Takeover = 'takeover',
}

/**
 * System (Background Session) State
 */
export enum SystemState {
  Running = 'running',
  Stopped = 'stopped',
  Takeover = 'takeover',
  Ongoing = 'ongoing',
  Completed = 'completed',
  Waiting = 'waiting',
  Error = 'error',
}

/**
 * Extension State Change Event
 */
export interface ExtensionStateChangeEvent {
  newState: ExtensionState;
  oldState: ExtensionState;
  timestamp: number;
}

/**
 * System State Change Event
 */
export interface SystemStateChangeEvent {
  newState: SystemState;
  oldState: SystemState;
  timestamp: number;
}

/**
 * Extension Manager Events
 */
export interface ExtensionManagerEvents {
  state_changed: [event: ExtensionStateChangeEvent];
}

/**
 * System Manager Events
 */
export interface SystemManagerEvents {
  state_changed: [event: SystemStateChangeEvent];
}
