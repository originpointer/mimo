/**
 * 页面状态检测工具函数
 */

import { PageLoadState, type PageStateInfo, type ObserverConfig, DEFAULT_CONFIG } from '../types/page-state';
import { SPADetector } from './spa-detector';

export class PageStateDetector {
  private config: Required<ObserverConfig>;
  private currentState: PageLoadState = PageLoadState.UNKNOWN;
  private stateChangeCallbacks: Array<(state: PageStateInfo) => void> = [];
  private mutationObserver?: MutationObserver;
  private performanceObserver?: PerformanceObserver;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private domStableTimer?: number;
  private networkQuietTimer?: number;
  private debounceTimer?: number;
  private timeoutTimer?: number;
  private lastMutationTime = 0;
  private lastNetworkActivityTime = 0;
  private isSPA = false;
  private url = '';

  constructor(config: ObserverConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.url = window.location.href;
    this.detectSPA();
  }

  /**
   * 检测是否为 SPA
   */
  private detectSPA(): void {
    const detectionResult = SPADetector.detect();
    this.isSPA = detectionResult.isSPA;
    
    // 如果检测到 SPA，设置路由变化监听
    if (this.isSPA && detectionResult.hasHistoryAPI) {
      this.interceptHistoryAPI();
    }
  }

  /**
   * 拦截 History API 以检测路由变化
   */
  private routeChangeCleanup?: () => void;

  private interceptHistoryAPI(): void {
    this.routeChangeCleanup = SPADetector.watchRouteChanges((url) => {
      this.url = url;
      this.handleRouteChange();
    });
  }

  /**
   * 处理路由变化
   */
  private handleRouteChange(): void {
    this.currentState = PageLoadState.NAVIGATING;
    this.checkState();
  }

  /**
   * 初始化所有 Observer
   */
  public initialize(): void {
    this.initializeMutationObserver();
    this.initializePerformanceObserver();
    this.initializeResizeObserver();
    this.initializeIntersectionObserver();
    this.attachWindowEvents();
    this.startTimeoutTimer();
    this.checkState();
  }

  /**
   * 初始化 MutationObserver
   */
  private initializeMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.lastMutationTime = Date.now();
      this.scheduleDOMStabilityCheck();
      this.checkState();
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-loading', 'data-state'],
      characterData: true,
    });
  }

  /**
   * 初始化 PerformanceObserver
   */
  private initializePerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' || entry.entryType === 'navigation') {
            this.lastNetworkActivityTime = Date.now();
            this.scheduleNetworkQuietCheck();
            this.checkState();
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] });
    } catch (e) {
      console.warn('PerformanceObserver not supported:', e);
    }
  }

  /**
   * 初始化 ResizeObserver
   */
  private initializeResizeObserver(): void {
    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkState();
      });

      this.resizeObserver.observe(document.body);
    } catch (e) {
      console.warn('ResizeObserver not supported:', e);
    }
  }

  /**
   * 初始化 IntersectionObserver
   */
  private initializeIntersectionObserver(): void {
    try {
      this.intersectionObserver = new IntersectionObserver(() => {
        this.checkState();
      });

      // 观察关键元素
      this.config.keyElementSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          this.intersectionObserver?.observe(el);
        });
      });
    } catch (e) {
      console.warn('IntersectionObserver not supported:', e);
    }
  }

  /**
   * 附加 Window 事件监听
   */
  private attachWindowEvents(): void {
    window.addEventListener('load', () => {
      this.checkState();
    });

    document.addEventListener('DOMContentLoaded', () => {
      this.checkState();
    });

    window.addEventListener('beforeunload', () => {
      this.currentState = PageLoadState.NAVIGATING;
      this.notifyStateChange();
    });

    window.addEventListener('pageshow', (event) => {
      if ((event as PageTransitionEvent).persisted) {
        // 从缓存恢复，重新检查状态
        this.checkState();
      }
    });

    // 监听 readyState 变化
    const checkReadyState = () => {
      this.checkState();
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkReadyState);
    }
    
    if (document.readyState !== 'complete') {
      window.addEventListener('load', checkReadyState);
    }
  }

  /**
   * 检查页面状态
   */
  private checkState(): void {
    const readyState = document.readyState;
    const hasKeyElements = this.checkKeyElements();
    const hasLoadingIndicators = this.checkLoadingIndicators();
    const networkQuiet = this.checkNetworkQuiet();
    const domStable = this.checkDOMStability();
    const resourcesLoaded = this.checkResourcesLoaded();

    let newState: PageLoadState;

    if (readyState === 'loading') {
      newState = PageLoadState.DOM_LOADING;
    } else if (readyState === 'interactive') {
      if (resourcesLoaded && domStable && !hasLoadingIndicators) {
        newState = this.isSPA ? PageLoadState.CONTENT_STABILIZING : PageLoadState.DOM_READY;
      } else {
        newState = PageLoadState.RESOURCE_LOADING;
      }
    } else if (readyState === 'complete') {
      if (hasKeyElements && !hasLoadingIndicators && networkQuiet && domStable) {
        newState = PageLoadState.READY;
      } else if (this.isSPA && !domStable) {
        newState = PageLoadState.CONTENT_STABILIZING;
      } else {
        newState = PageLoadState.RESOURCE_LOADING;
      }
    } else {
      newState = this.currentState;
    }

    if (newState !== this.currentState) {
      this.currentState = newState;
      this.notifyStateChangeDebounced();
    }
  }

  /**
   * 检查关键元素是否存在
   */
  private checkKeyElements(): boolean {
    if (this.config.keyElementSelectors.length === 0) {
      return true; // 如果没有配置关键元素，认为存在
    }

    return this.config.keyElementSelectors.some((selector) => {
      const element = document.querySelector(selector);
      return element !== null && this.isElementVisible(element);
    });
  }

  /**
   * 检查是否有加载指示器
   */
  private checkLoadingIndicators(): boolean {
    return this.config.loadingIndicatorSelectors.some((selector) => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).some((el) => this.isElementVisible(el));
    });
  }

  /**
   * 检查元素是否可见
   */
  private isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.getBoundingClientRect().width > 0 &&
      element.getBoundingClientRect().height > 0
    );
  }

  /**
   * 检查网络是否安静
   */
  private checkNetworkQuiet(): boolean {
    if (!this.performanceObserver) {
      return true; // 如果 PerformanceObserver 不可用，假设网络安静
    }

    const now = Date.now();
    return now - this.lastNetworkActivityTime >= this.config.networkQuietThreshold;
  }

  /**
   * 检查 DOM 是否稳定
   */
  private checkDOMStability(): boolean {
    const now = Date.now();
    return now - this.lastMutationTime >= this.config.domStableThreshold;
  }

  /**
   * 检查资源是否加载完成
   */
  private checkResourcesLoaded(): boolean {
    // 检查图片
    const images = Array.from(document.images);
    const imagesLoaded = images.every((img) => img.complete && img.naturalWidth > 0);

    // 检查字体
    let fontsLoaded = true;
    if (document.fonts && document.fonts.ready) {
      // 使用 Promise，但这里简化处理
      fontsLoaded = document.fonts.status === 'loaded';
    }

    return imagesLoaded && fontsLoaded;
  }

  /**
   * 安排 DOM 稳定性检查
   */
  private scheduleDOMStabilityCheck(): void {
    if (this.domStableTimer) {
      clearTimeout(this.domStableTimer);
    }

    this.domStableTimer = window.setTimeout(() => {
      this.checkState();
    }, this.config.domStableThreshold);
  }

  /**
   * 安排网络安静检查
   */
  private scheduleNetworkQuietCheck(): void {
    if (this.networkQuietTimer) {
      clearTimeout(this.networkQuietTimer);
    }

    this.networkQuietTimer = window.setTimeout(() => {
      this.checkState();
    }, this.config.networkQuietThreshold);
  }

  /**
   * 防抖通知状态变化
   */
  private notifyStateChangeDebounced(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.notifyStateChange();
    }, this.config.debounceTime);
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    const stateInfo: PageStateInfo = {
      state: this.currentState,
      url: this.url,
      timestamp: Date.now(),
      details: {
        readyState: document.readyState,
        hasKeyElements: this.checkKeyElements(),
        hasLoadingIndicators: this.checkLoadingIndicators(),
        networkQuiet: this.checkNetworkQuiet(),
        domStable: this.checkDOMStability(),
        resourcesLoaded: this.checkResourcesLoaded(),
        isSPA: this.isSPA,
      },
    };

    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(stateInfo);
      } catch (e) {
        console.error('Error in state change callback:', e);
      }
    });
  }

  /**
   * 启动超时定时器
   */
  private startTimeoutTimer(): void {
    this.timeoutTimer = window.setTimeout(() => {
      if (this.currentState !== PageLoadState.READY) {
        const stateInfo: PageStateInfo = {
          state: PageLoadState.ERROR,
          url: this.url,
          timestamp: Date.now(),
          details: {
            error: 'Page load timeout',
            readyState: document.readyState,
            isSPA: this.isSPA,
          },
        };

        this.stateChangeCallbacks.forEach((callback) => {
          try {
            callback(stateInfo);
          } catch (e) {
            console.error('Error in state change callback:', e);
          }
        });
      }
    }, this.config.timeout);
  }

  /**
   * 注册状态变化回调
   */
  public onStateChange(callback: (state: PageStateInfo) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * 获取当前状态
   */
  public getCurrentState(): PageStateInfo {
    return {
      state: this.currentState,
      url: this.url,
      timestamp: Date.now(),
      details: {
        readyState: document.readyState,
        hasKeyElements: this.checkKeyElements(),
        hasLoadingIndicators: this.checkLoadingIndicators(),
        networkQuiet: this.checkNetworkQuiet(),
        domStable: this.checkDOMStability(),
        resourcesLoaded: this.checkResourcesLoaded(),
        isSPA: this.isSPA,
      },
    };
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.routeChangeCleanup) {
      this.routeChangeCleanup();
    }
    if (this.domStableTimer) {
      clearTimeout(this.domStableTimer);
    }
    if (this.networkQuietTimer) {
      clearTimeout(this.networkQuietTimer);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    this.stateChangeCallbacks = [];
  }
}
