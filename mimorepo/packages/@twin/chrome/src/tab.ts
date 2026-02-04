/**
 * Tab 对象 - 统一管理标签页的属性和同步操作
 *
 * 该类封装了 Chrome 标签页的所有可采集属性，
 * 并提供了统一的更新和同步接口。
 */

import { EventEmitter } from 'events';
import type {
  TabState,
  TabEvents,
  TabRawData,
  TabExtendedProperties,
  TabProperties,
} from './types';

// Re-export TabRawData for external use
export type { TabRawData };

/**
 * Tab 对象 - 统一管理标签页的所有属性
 */
export class Tab extends EventEmitter {
  private _properties: TabProperties;
  private _extended: TabExtendedProperties;

  /**
   * 创建 Tab 实例
   * @param data - 原始标签页数据
   */
  constructor(data: TabRawData) {
    super();
    this._properties = this.initializeProperties(data);
    this._extended = this.initializeExtendedProperties();
    this.setMaxListeners(50);
  }

  /**
   * 初始化标签页属性
   */
  private initializeProperties(data: TabRawData): TabProperties {
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
   * 初始化扩展属性
   */
  private initializeExtendedProperties(): TabExtendedProperties {
    return {
      loadProgress: undefined,
      isSpecialPage: undefined,
      language: undefined,
      editable: undefined,
      contentLastModified: undefined,
      isAudible: undefined,
      isMuted: undefined,
      zoom: undefined,
      lastNavigationTime: undefined,
      loadTime: undefined,
      metadata: undefined,
    };
  }

  // ========== 基础属性访问器 ==========

  /** 获取标签页 ID */
  get id(): number {
    return this._properties.id;
  }

  /** 获取所属窗口 ID */
  get windowId(): number {
    return this._properties.windowId;
  }
  set windowId(value: number) {
    this.updateProperty('windowId', value);
  }

  /** 获取页面 URL */
  get url(): string | null {
    return this._properties.url;
  }
  set url(value: string | null) {
    this.updateProperty('url', value);
  }

  /** 获取页面标题 */
  get title(): string | null {
    return this._properties.title;
  }
  set title(value: string | null) {
    this.updateProperty('title', value);
  }

  /** 获取网站图标 URL */
  get favIconUrl(): string | null {
    return this._properties.favIconUrl;
  }
  set favIconUrl(value: string | null) {
    this.updateProperty('favIconUrl', value);
  }

  /** 获取加载状态 */
  get status(): 'loading' | 'complete' | null {
    return this._properties.status;
  }
  set status(value: 'loading' | 'complete' | null) {
    this.updateProperty('status', value);
  }

  /** 是否为当前激活标签 */
  get active(): boolean {
    return this._properties.active;
  }
  set active(value: boolean) {
    this.updateProperty('active', value);
  }

  /** 是否固定 */
  get pinned(): boolean {
    return this._properties.pinned;
  }
  set pinned(value: boolean) {
    this.updateProperty('pinned', value);
  }

  /** 是否隐藏 */
  get hidden(): boolean {
    return this._properties.hidden;
  }
  set hidden(value: boolean) {
    this.updateProperty('hidden', value);
  }

  /** 在窗口中的位置索引 */
  get index(): number {
    return this._properties.index;
  }
  set index(value: number) {
    this.updateProperty('index', value);
  }

  /** 打开此标签的源标签 ID */
  get openerTabId(): number | null {
    return this._properties.openerTabId;
  }

  /** 最后更新时间戳 */
  get lastUpdated(): number {
    return this._properties.lastUpdated;
  }

  // ========== 扩展属性访问器 ==========

  /** 页面加载进度 (0-100) */
  get loadProgress(): number | undefined {
    return this._extended.loadProgress;
  }
  set loadProgress(value: number | undefined) {
    this._extended.loadProgress = value;
  }

  /** 是否为特殊协议页面 */
  get isSpecialPage(): boolean | undefined {
    return this._extended.isSpecialPage;
  }
  set isSpecialPage(value: boolean | undefined) {
    this._extended.isSpecialPage = value;
  }

  /** 页面语言 */
  get language(): string | undefined {
    return this._extended.language;
  }
  set language(value: string | undefined) {
    this._extended.language = value;
  }

  /** 页面是否可编辑 */
  get editable(): boolean | undefined {
    return this._extended.editable;
  }
  set editable(value: boolean | undefined) {
    this._extended.editable = value;
  }

  /** 最后一次内容变化时间戳 */
  get contentLastModified(): number | undefined {
    return this._extended.contentLastModified;
  }
  set contentLastModified(value: number | undefined) {
    this._extended.contentLastModified = value;
  }

  /** 页面是否包含音频 */
  get isAudible(): boolean | undefined {
    return this._extended.isAudible;
  }
  set isAudible(value: boolean | undefined) {
    this._extended.isAudible = value;
  }

  /** 页面是否静音 */
  get isMuted(): boolean | undefined {
    return this._extended.isMuted;
  }
  set isMuted(value: boolean | undefined) {
    this._extended.isMuted = value;
  }

  /** 页面缩放比例 */
  get zoom(): number | undefined {
    return this._extended.zoom;
  }
  set zoom(value: number | undefined) {
    this._extended.zoom = value;
  }

  /** 最后一次导航时间戳 */
  get lastNavigationTime(): number | undefined {
    return this._extended.lastNavigationTime;
  }
  set lastNavigationTime(value: number | undefined) {
    this._extended.lastNavigationTime = value;
  }

  /** 页面加载耗时（毫秒） */
  get loadTime(): number | undefined {
    return this._extended.loadTime;
  }
  set loadTime(value: number | undefined) {
    this._extended.loadTime = value;
  }

  /** 自定义元数据 */
  get metadata(): Record<string, unknown> | undefined {
    return this._extended.metadata;
  }
  set metadata(value: Record<string, unknown> | undefined) {
    this._extended.metadata = value;
  }

  // ========== 同步更新方法 ==========

  /**
   * 从原始数据更新属性
   * @param data - 原始标签页数据
   * @param changes - 可选的变化字段标记
   */
  syncFromRawData(data: TabRawData, changes?: Partial<Record<keyof TabProperties, boolean>>): void {
    const oldUrl = this._properties.url;
    const oldTitle = this._properties.title;
    const oldStatus = this._properties.status;

    if (data.url !== undefined) this._properties.url = data.url ?? null;
    if (data.title !== undefined) this._properties.title = data.title ?? null;
    if (data.favIconUrl !== undefined) this._properties.favIconUrl = data.favIconUrl ?? null;
    if (data.status !== undefined) this._properties.status = data.status ?? null;
    if (data.active !== undefined) this._properties.active = data.active;
    if (data.pinned !== undefined) this._properties.pinned = data.pinned;
    if (data.hidden !== undefined) this._properties.hidden = data.hidden;
    if (data.index !== undefined) this._properties.index = data.index;
    if (data.windowId !== undefined) this._properties.windowId = data.windowId;
    if (data.openerTabId !== undefined) this._properties.openerTabId = data.openerTabId ?? null;

    this._properties.lastUpdated = Date.now();

    // 发出更新事件
    this.emit('updated', this.toState());

    // 如果提供了 changes 参数，检查具体变化并发出事件
    if (changes) {
      if (changes.url && data.url !== oldUrl) {
        this.emit('propertyChanged', {
          property: 'url',
          oldValue: oldUrl,
          newValue: this._properties.url,
          timestamp: Date.now(),
        });
      }
      if (changes.title && data.title !== oldTitle) {
        this.emit('propertyChanged', {
          property: 'title',
          oldValue: oldTitle,
          newValue: this._properties.title,
          timestamp: Date.now(),
        });
      }
      if (changes.status && data.status !== oldStatus) {
        this.emit('propertyChanged', {
          property: 'status',
          oldValue: oldStatus,
          newValue: this._properties.status,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 批量更新属性
   * @param properties - 要更新的属性对象
   */
  updateProperties(properties: Partial<TabProperties>): void {
    for (const [key, value] of Object.entries(properties)) {
      if (key in this._properties) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this._properties as any)[key] = value;
      }
    }
    this._properties.lastUpdated = Date.now();
    this.emit('updated', this.toState());
  }

  /**
   * 更新单个属性
   * @param property - 属性名
   * @param value - 新值
   */
  private updateProperty<K extends keyof TabProperties>(property: K, value: TabProperties[K]): void {
    const oldValue = this._properties[property];
    if (oldValue !== value) {
      this._properties[property] = value;
      this._properties.lastUpdated = Date.now();
      this.emit('propertyChanged', {
        property,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
      });
      this.emit('updated', this.toState());
    }
  }

  // ========== 状态导出方法 ==========

  /**
   * 转换为 TabState 格式
   */
  toState(): TabState {
    return {
      id: this._properties.id,
      windowId: this._properties.windowId,
      url: this._properties.url,
      title: this._properties.title,
      favIconUrl: this._properties.favIconUrl,
      status: this._properties.status,
      active: this._properties.active,
      pinned: this._properties.pinned,
      hidden: this._properties.hidden,
      index: this._properties.index,
      openerTabId: this._properties.openerTabId,
      lastUpdated: this._properties.lastUpdated,
    };
  }

  /**
   * 转换为 JSON 格式（包含扩展属性）
   */
  toJSON(): {
    properties: TabProperties;
    extended: TabExtendedProperties;
  } {
    return {
      properties: { ...this._properties },
      extended: { ...this._extended },
    };
  }

  // ========== 实用方法 ==========

  /**
   * 检查是否为特殊协议页面
   */
  checkIsSpecialPage(): boolean {
    if (this._properties.url) {
      return this._properties.url.startsWith('chrome://') ||
             this._properties.url.startsWith('about:') ||
             this._properties.url.startsWith('edge://') ||
             this._properties.url.startsWith('opera://');
    }
    return false;
  }

  /**
   * 获取域名
   */
  getHostname(): string | null {
    if (this._properties.url) {
      try {
        return new URL(this._properties.url).hostname;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取页面路径
   */
  getPathname(): string | null {
    if (this._properties.url) {
      try {
        return new URL(this._properties.url).pathname;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 检查是否正在加载
   */
  isLoading(): boolean {
    return this._properties.status === 'loading';
  }

  /**
   * 检查是否加载完成
   */
  isLoaded(): boolean {
    return this._properties.status === 'complete';
  }

  /**
   * 关闭标签页（发出关闭事件）
   */
  close(): void {
    this.emit('closed');
    this.removeAllListeners();
  }
}

/**
 * 类型安全的 EventEmitter 增强（接口合并）
 */
export interface Tab {
  on<K extends keyof TabEvents>(
    event: K,
    listener: (...args: TabEvents[K]) => void
  ): this;
  emit<K extends keyof TabEvents>(
    event: K,
    ...args: TabEvents[K]
  ): boolean;
  off<K extends keyof TabEvents>(
    event: K,
    listener: (...args: TabEvents[K]) => void
  ): this;
  once<K extends keyof TabEvents>(
    event: K,
    listener: (...args: TabEvents[K]) => void
  ): this;
}
