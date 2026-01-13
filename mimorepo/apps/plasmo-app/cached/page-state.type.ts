/**
 * 页面加载状态类型定义
 */

export enum PageLoadState {
    /** 初始状态，尚未开始检测 */
    UNKNOWN = 'UNKNOWN',
    /** 检测到页面导航开始 */
    NAVIGATING = 'NAVIGATING',
    /** DOM 正在解析 */
    DOM_LOADING = 'DOM_LOADING',
    /** DOM 解析完成 */
    DOM_READY = 'DOM_READY',
    /** 资源正在加载 */
    RESOURCE_LOADING = 'RESOURCE_LOADING',
    /** 内容正在稳定（SPA 特有） */
    CONTENT_STABILIZING = 'CONTENT_STABILIZING',
    /** 完全就绪 */
    READY = 'READY',
    /** 错误状态 */
    ERROR = 'ERROR',
  }
  
  export interface PageStateInfo {
    /** 当前状态 */
    state: PageLoadState;
    /** 页面 URL */
    url: string;
    /** Tab ID */
    tabId?: number;
    /** Frame ID */
    frameId?: number;
    /** 时间戳 */
    timestamp: number;
    /** 详细信息 */
    details?: {
      /** document.readyState */
      readyState?: string;
      /** 关键元素是否存在 */
      hasKeyElements?: boolean;
      /** 是否有加载指示器 */
      hasLoadingIndicators?: boolean;
      /** 网络是否安静 */
      networkQuiet?: boolean;
      /** DOM 是否稳定 */
      domStable?: boolean;
      /** 资源是否加载完成 */
      resourcesLoaded?: boolean;
      /** 是否为 SPA */
      isSPA?: boolean;
      /** 错误信息 */
      error?: string;
    };
  }
  
  export interface ObserverConfig {
    /** DOM 稳定期阈值（毫秒） */
    domStableThreshold?: number;
    /** 网络安静期阈值（毫秒） */
    networkQuietThreshold?: number;
    /** 状态更新防抖时间（毫秒） */
    debounceTime?: number;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 关键元素选择器 */
    keyElementSelectors?: string[];
    /** 加载指示器选择器 */
    loadingIndicatorSelectors?: string[];
  }
  
  export const DEFAULT_CONFIG: Required<ObserverConfig> = {
    domStableThreshold: 500,
    networkQuietThreshold: 500,
    debounceTime: 300,
    timeout: 30000,
    keyElementSelectors: ['main', '[role="main"]', '.main-content', '#main-content'],
    loadingIndicatorSelectors: [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="skeleton"]',
      '[class*="loader"]',
      '[data-loading="true"]',
    ],
  };
  