/**
 * ResourcePerformanceDetector
 * 基于 PerformanceObserver 的资源加载分析和性能监控工具
 */

import type {
  ResourcePerformanceConfig,
  ResourceInfo,
  SlowResourceInfo,
  NetworkQuietInfo,
  NavigationTimingInfo,
  CoreWebVitalInfo,
  LongTaskInfo,
  PerformanceMetrics,
  CoreWebVitalType,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Pick<ResourcePerformanceConfig, 'slowResourceThreshold' | 'networkQuietThreshold' | 'enableCoreWebVitals' | 'enableLongTask'>> = {
  slowResourceThreshold: 1000,
  networkQuietThreshold: 500,
  enableCoreWebVitals: false,
  enableLongTask: false,
};

/**
 * ResourcePerformanceDetector 类
 */
export class ResourcePerformanceDetector {
  private config: ResourcePerformanceConfig;
  private performanceObserver?: PerformanceObserver;
  private resources: ResourceInfo[] = [];
  private slowResources: SlowResourceInfo[] = [];
  private lastNetworkActivityTime = 0;
  private networkQuietTimer?: number;
  private navigationTiming?: NavigationTimingInfo;
  private coreWebVitals: Map<CoreWebVitalType, CoreWebVitalInfo> = new Map();
  private longTasks: LongTaskInfo[] = [];
  private isObserving = false;

  constructor(config: ResourcePerformanceConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.lastNetworkActivityTime = Date.now();
  }

  /**
   * 初始化 PerformanceObserver
   */
  private initialize(): void {
    if (this.performanceObserver) {
      return;
    }

    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver is not supported in this browser');
      return;
    }

    try {
      const entryTypes = this.getEntryTypes();
      this.performanceObserver = new PerformanceObserver((list) => {
        this.handleEntries(list.getEntries());
      });

      this.performanceObserver.observe({ entryTypes });
    } catch (e) {
      console.warn('Failed to initialize PerformanceObserver:', e);
    }
  }

  /**
   * 获取要观察的 entryTypes
   */
  private getEntryTypes(): string[] {
    if (this.config.entryTypes) {
      return this.config.entryTypes;
    }

    const entryTypes: string[] = ['resource', 'navigation'];

    if (this.config.enableCoreWebVitals) {
      entryTypes.push('largest-contentful-paint', 'first-input', 'layout-shift');
    }

    if (this.config.enableLongTask) {
      entryTypes.push('longtask');
    }

    return entryTypes;
  }

  /**
   * 处理性能条目
   */
  private handleEntries(entries: PerformanceEntryList): void {
    for (const entry of entries) {
      switch (entry.entryType) {
        case 'resource':
          this.handleResourceEntry(entry as PerformanceResourceTiming);
          break;
        case 'navigation':
          this.handleNavigationEntry(entry as PerformanceNavigationTiming);
          break;
        case 'largest-contentful-paint':
          this.handleLCPEntry(entry as LargestContentfulPaint);
          break;
        case 'first-input':
          this.handleFIDEntry(entry as PerformanceEventTiming);
          break;
        case 'layout-shift':
          this.handleCLSEntry(entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources: Array<{
              previousRect: DOMRectReadOnly;
              currentRect: DOMRectReadOnly;
              node?: Node;
            }>;
          });
          break;
        case 'longtask':
          this.handleLongTaskEntry(entry as PerformanceEntry & {
            duration: number;
            attribution: Array<{
              name: string;
              entryType: string;
              startTime: number;
              duration: number;
              containerType?: string;
              containerId?: string;
              containerName?: string;
              containerSrc?: string;
            }>;
          });
          break;
      }
    }
  }

  /**
   * 处理资源条目
   */
  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    this.lastNetworkActivityTime = Date.now();
    this.checkNetworkQuiet();

    const resourceInfo: ResourceInfo = {
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
      fetchStart: entry.fetchStart,
      domainLookupStart: entry.domainLookupStart,
      domainLookupEnd: entry.domainLookupEnd,
      connectStart: entry.connectStart,
      connectEnd: entry.connectEnd,
      requestStart: entry.requestStart,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      requestTime: entry.responseStart - entry.requestStart,
      responseTime: entry.responseEnd - entry.responseStart,
    };

    this.resources.push(resourceInfo);

    // 触发资源加载回调
    if (this.config.onResourceLoad) {
      try {
        this.config.onResourceLoad(resourceInfo);
      } catch (e) {
        console.error('Error in onResourceLoad callback:', e);
      }
    }

    // 检查是否为慢资源
    if (entry.duration >= this.config.slowResourceThreshold!) {
      const slowResource: SlowResourceInfo = {
        ...resourceInfo,
        isSlow: true,
        threshold: this.config.slowResourceThreshold!,
        reasons: this.analyzeSlowResource(resourceInfo),
      };

      this.slowResources.push(slowResource);

      // 触发慢资源回调
      if (this.config.onSlowResource) {
        try {
          this.config.onSlowResource(slowResource);
        } catch (e) {
          console.error('Error in onSlowResource callback:', e);
        }
      }
    }
  }

  /**
   * 分析慢资源原因
   */
  private analyzeSlowResource(resource: ResourceInfo): string[] {
    const reasons: string[] = [];
    const threshold = this.config.slowResourceThreshold!;

    if (resource.dnsTime > threshold * 0.3) {
      reasons.push(`DNS 查询耗时过长 (${resource.dnsTime.toFixed(2)}ms)`);
    }

    if (resource.connectTime > threshold * 0.3) {
      reasons.push(`连接建立耗时过长 (${resource.connectTime.toFixed(2)}ms)`);
    }

    if (resource.requestTime > threshold * 0.3) {
      reasons.push(`请求处理耗时过长 (${resource.requestTime.toFixed(2)}ms)`);
    }

    if (resource.responseTime > threshold * 0.3) {
      reasons.push(`响应传输耗时过长 (${resource.responseTime.toFixed(2)}ms)`);
    }

    if (reasons.length === 0) {
      reasons.push(`总耗时超过阈值 (${resource.duration.toFixed(2)}ms)`);
    }

    return reasons;
  }

  /**
   * 处理导航条目
   */
  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.lastNetworkActivityTime = Date.now();
    this.checkNetworkQuiet();

    const navInfo: NavigationTimingInfo = {
      type: entry.type,
      fetchStart: entry.fetchStart,
      domainLookupStart: entry.domainLookupStart,
      domainLookupEnd: entry.domainLookupEnd,
      connectStart: entry.connectStart,
      connectEnd: entry.connectEnd,
      requestStart: entry.requestStart,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      domContentLoadedEventStart: entry.domContentLoadedEventStart,
      domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
      loadEventStart: entry.loadEventStart,
      loadEventEnd: entry.loadEventEnd,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      requestTime: entry.responseStart - entry.requestStart,
      responseTime: entry.responseEnd - entry.responseStart,
      domParseTime: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadTime: entry.loadEventEnd - entry.fetchStart,
    };

    this.navigationTiming = navInfo;

    // 触发导航性能回调
    if (this.config.onNavigationTiming) {
      try {
        this.config.onNavigationTiming(navInfo);
      } catch (e) {
        console.error('Error in onNavigationTiming callback:', e);
      }
    }
  }

  /**
   * 处理 LCP 条目
   */
  private handleLCPEntry(entry: LargestContentfulPaint): void {
    const lcpInfo: CoreWebVitalInfo = {
      type: 'LCP',
      value: entry.renderTime || entry.loadTime,
      timestamp: entry.startTime,
      details: {
        element: entry.element || undefined,
        url: entry.url,
        size: entry.size,
      },
    };

    this.coreWebVitals.set('LCP', lcpInfo);

    // 触发 Core Web Vitals 回调
    if (this.config.onCoreWebVital) {
      try {
        this.config.onCoreWebVital(lcpInfo);
      } catch (e) {
        console.error('Error in onCoreWebVital callback:', e);
      }
    }
  }

  /**
   * 处理 FID 条目
   */
  private handleFIDEntry(entry: PerformanceEventTiming): void {
    const fidInfo: CoreWebVitalInfo = {
      type: 'FID',
      value: entry.processingStart - entry.startTime,
      timestamp: entry.startTime,
      details: {
        eventType: entry.name,
        target: entry.target || undefined,
      },
    };

    this.coreWebVitals.set('FID', fidInfo);

    // 触发 Core Web Vitals 回调
    if (this.config.onCoreWebVital) {
      try {
        this.config.onCoreWebVital(fidInfo);
      } catch (e) {
        console.error('Error in onCoreWebVital callback:', e);
      }
    }
  }

  /**
   * 处理 CLS 条目
   */
  private handleCLSEntry(entry: PerformanceEntry & {
    value: number;
    hadRecentInput: boolean;
    sources: Array<{
      previousRect: DOMRectReadOnly;
      currentRect: DOMRectReadOnly;
      node?: Node;
    }>;
  }): void {
    if (entry.hadRecentInput) {
      return; // 忽略用户输入导致的布局偏移
    }

    const existingCLS = this.coreWebVitals.get('CLS');
    const newValue = (existingCLS?.value || 0) + entry.value;

    const clsInfo: CoreWebVitalInfo = {
      type: 'CLS',
      value: newValue,
      timestamp: entry.startTime,
      details: {
        sources: entry.sources,
        hadRecentInput: entry.hadRecentInput,
      },
    };

    this.coreWebVitals.set('CLS', clsInfo);

    // 触发 Core Web Vitals 回调
    if (this.config.onCoreWebVital) {
      try {
        this.config.onCoreWebVital(clsInfo);
      } catch (e) {
        console.error('Error in onCoreWebVital callback:', e);
      }
    }
  }

  /**
   * 处理长任务条目
   */
  private handleLongTaskEntry(entry: PerformanceEntry & {
    duration: number;
    attribution: Array<{
      name: string;
      entryType: string;
      startTime: number;
      duration: number;
      containerType?: string;
      containerId?: string;
      containerName?: string;
      containerSrc?: string;
    }>;
  }): void {
    const longTaskInfo: LongTaskInfo = {
      startTime: entry.startTime,
      duration: entry.duration,
      name: entry.name,
      attribution: entry.attribution.map((attr: {
        name: string;
        entryType: string;
        startTime: number;
        duration: number;
        containerType?: string;
        containerId?: string;
        containerName?: string;
        containerSrc?: string;
      }) => ({
        name: attr.name,
        entryType: attr.entryType,
        startTime: attr.startTime,
        duration: attr.duration,
        containerType: attr.containerType,
        containerId: attr.containerId,
        containerName: attr.containerName,
        containerSrc: attr.containerSrc,
      })),
    };

    this.longTasks.push(longTaskInfo);

    // 触发长任务回调
    if (this.config.onLongTask) {
      try {
        this.config.onLongTask(longTaskInfo);
      } catch (e) {
        console.error('Error in onLongTask callback:', e);
      }
    }
  }

  /**
   * 检查网络是否安静
   */
  private checkNetworkQuiet(): void {
    if (this.networkQuietTimer) {
      clearTimeout(this.networkQuietTimer);
    }

    this.networkQuietTimer = window.setTimeout(() => {
      const now = Date.now();
      const quietDuration = now - this.lastNetworkActivityTime;

      if (quietDuration >= this.config.networkQuietThreshold!) {
        const quietInfo: NetworkQuietInfo = {
          timestamp: now,
          quietDuration,
          lastActivityTime: this.lastNetworkActivityTime,
          threshold: this.config.networkQuietThreshold!,
        };

        // 触发网络安静回调
        if (this.config.onNetworkQuiet) {
          try {
            this.config.onNetworkQuiet(quietInfo);
          } catch (e) {
            console.error('Error in onNetworkQuiet callback:', e);
          }
        }
      }
    }, this.config.networkQuietThreshold!);
  }

  /**
   * 开始观察
   */
  public observe(): void {
    if (this.isObserving) {
      return;
    }

    this.initialize();
    this.isObserving = true;
  }

  /**
   * 停止观察并清理
   */
  public disconnect(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }

    if (this.networkQuietTimer) {
      clearTimeout(this.networkQuietTimer);
      this.networkQuietTimer = undefined;
    }

    this.isObserving = false;
  }

  /**
   * 获取所有资源信息
   */
  public getResources(): ResourceInfo[] {
    return [...this.resources];
  }

  /**
   * 获取慢资源列表
   */
  public getSlowResources(): SlowResourceInfo[] {
    return [...this.slowResources];
  }

  /**
   * 判断网络是否安静
   */
  public isNetworkQuiet(): boolean {
    const now = Date.now();
    return now - this.lastNetworkActivityTime >= this.config.networkQuietThreshold!;
  }

  /**
   * 获取导航性能数据
   */
  public getNavigationTiming(): NavigationTimingInfo | undefined {
    return this.navigationTiming;
  }

  /**
   * 获取 Core Web Vitals 数据
   */
  public getCoreWebVitals(): Map<CoreWebVitalType, CoreWebVitalInfo> {
    return new Map(this.coreWebVitals);
  }

  /**
   * 获取长任务列表
   */
  public getLongTasks(): LongTaskInfo[] {
    return [...this.longTasks];
  }

  /**
   * 获取性能指标统计
   */
  public getMetrics(): PerformanceMetrics {
    if (this.resources.length === 0) {
      return {
        totalResources: 0,
        totalSize: 0,
        averageLoadTime: 0,
        slowResourceCount: this.slowResources.length,
        dnsStats: { average: 0, max: 0, min: 0 },
        connectStats: { average: 0, max: 0, min: 0 },
        transferStats: { average: 0, max: 0, min: 0 },
      };
    }

    const totalSize = this.resources.reduce((sum, r) => sum + r.transferSize, 0);
    const averageLoadTime = this.resources.reduce((sum, r) => sum + r.duration, 0) / this.resources.length;

    const dnsTimes = this.resources.map((r) => r.dnsTime).filter((t) => t > 0);
    const connectTimes = this.resources.map((r) => r.connectTime).filter((t) => t > 0);
    const transferTimes = this.resources.map((r) => r.responseTime).filter((t) => t > 0);

    return {
      totalResources: this.resources.length,
      totalSize,
      averageLoadTime,
      slowResourceCount: this.slowResources.length,
      dnsStats: {
        average: dnsTimes.length > 0 ? dnsTimes.reduce((sum, t) => sum + t, 0) / dnsTimes.length : 0,
        max: dnsTimes.length > 0 ? Math.max(...dnsTimes) : 0,
        min: dnsTimes.length > 0 ? Math.min(...dnsTimes) : 0,
      },
      connectStats: {
        average: connectTimes.length > 0 ? connectTimes.reduce((sum, t) => sum + t, 0) / connectTimes.length : 0,
        max: connectTimes.length > 0 ? Math.max(...connectTimes) : 0,
        min: connectTimes.length > 0 ? Math.min(...connectTimes) : 0,
      },
      transferStats: {
        average: transferTimes.length > 0 ? transferTimes.reduce((sum, t) => sum + t, 0) / transferTimes.length : 0,
        max: transferTimes.length > 0 ? Math.max(...transferTimes) : 0,
        min: transferTimes.length > 0 ? Math.min(...transferTimes) : 0,
      },
    };
  }

  /**
   * 重置所有数据
   */
  public reset(): void {
    this.resources = [];
    this.slowResources = [];
    this.lastNetworkActivityTime = Date.now();
    this.navigationTiming = undefined;
    this.coreWebVitals.clear();
    this.longTasks = [];

    if (this.networkQuietTimer) {
      clearTimeout(this.networkQuietTimer);
      this.networkQuietTimer = undefined;
    }
  }
}
