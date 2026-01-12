/**
 * ResourcePerformanceDetector 类型定义
 */

/**
 * 资源信息接口
 * 基于 PerformanceResourceTiming，包含资源加载的详细信息
 */
export interface ResourceInfo {
  /** 资源名称/URL */
  name: string;
  /** 资源类型（如 'script', 'link', 'img' 等） */
  initiatorType: string;
  /** 资源加载开始时间 */
  startTime: number;
  /** 资源加载持续时间（毫秒） */
  duration: number;
  /** 开始获取资源的时间 */
  fetchStart: number;
  /** DNS 查询开始时间 */
  domainLookupStart: number;
  /** DNS 查询结束时间 */
  domainLookupEnd: number;
  /** 连接开始时间 */
  connectStart: number;
  /** 连接结束时间 */
  connectEnd: number;
  /** 请求开始时间 */
  requestStart: number;
  /** 响应开始时间 */
  responseStart: number;
  /** 响应结束时间 */
  responseEnd: number;
  /** 传输的字节数 */
  transferSize: number;
  /** 编码后的响应体大小 */
  encodedBodySize: number;
  /** 解码后的响应体大小 */
  decodedBodySize: number;
  /** DNS 查询耗时（毫秒） */
  dnsTime: number;
  /** 连接耗时（毫秒） */
  connectTime: number;
  /** 请求耗时（毫秒） */
  requestTime: number;
  /** 响应耗时（毫秒） */
  responseTime: number;
}

/**
 * 慢资源信息接口
 * 继承 ResourceInfo，包含慢资源分析
 */
export interface SlowResourceInfo extends ResourceInfo {
  /** 是否为慢资源 */
  isSlow: true;
  /** 慢资源阈值（毫秒） */
  threshold: number;
  /** 慢资源原因分析 */
  reasons: string[];
}

/**
 * 网络安静信息接口
 */
export interface NetworkQuietInfo {
  /** 网络安静的时间戳 */
  timestamp: number;
  /** 网络安静持续时间（毫秒） */
  quietDuration: number;
  /** 最后网络活动时间 */
  lastActivityTime: number;
  /** 网络安静阈值（毫秒） */
  threshold: number;
}

/**
 * 导航性能信息接口
 * 基于 PerformanceNavigationTiming
 */
export interface NavigationTimingInfo {
  /** 导航类型（如 'navigate', 'reload', 'back_forward' 等） */
  type: string;
  /** 页面加载开始时间 */
  fetchStart: number;
  /** DNS 查询开始时间 */
  domainLookupStart: number;
  /** DNS 查询结束时间 */
  domainLookupEnd: number;
  /** 连接开始时间 */
  connectStart: number;
  /** 连接结束时间 */
  connectEnd: number;
  /** 请求开始时间 */
  requestStart: number;
  /** 响应开始时间 */
  responseStart: number;
  /** 响应结束时间 */
  responseEnd: number;
  /** DOM 开始解析时间 */
  domContentLoadedEventStart: number;
  /** DOM 解析完成时间 */
  domContentLoadedEventEnd: number;
  /** 页面加载完成时间 */
  loadEventStart: number;
  /** 页面加载结束时间 */
  loadEventEnd: number;
  /** DNS 查询耗时（毫秒） */
  dnsTime: number;
  /** 连接耗时（毫秒） */
  connectTime: number;
  /** 请求耗时（毫秒） */
  requestTime: number;
  /** 响应耗时（毫秒） */
  responseTime: number;
  /** DOM 解析耗时（毫秒） */
  domParseTime: number;
  /** 页面加载总耗时（毫秒） */
  loadTime: number;
}

/**
 * Core Web Vitals 指标类型
 */
export type CoreWebVitalType = 'LCP' | 'FID' | 'CLS';

/**
 * Core Web Vitals 信息接口
 */
export interface CoreWebVitalInfo {
  /** 指标类型 */
  type: CoreWebVitalType;
  /** 指标值 */
  value: number;
  /** 指标时间戳 */
  timestamp: number;
  /** 指标详情（根据类型不同而不同） */
  details?: {
    /** LCP 相关 */
    element?: Element;
    url?: string;
    size?: number;
    /** FID 相关 */
    eventType?: string;
    target?: EventTarget;
    /** CLS 相关 */
    sources?: LayoutShiftAttribution[];
    hadRecentInput?: boolean;
  };
}

/**
 * 长任务信息接口
 * 基于 PerformanceLongTaskTiming
 */
export interface LongTaskInfo {
  /** 长任务开始时间 */
  startTime: number;
  /** 长任务持续时间（毫秒） */
  duration: number;
  /** 长任务名称 */
  name: string;
  /** 长任务来源信息 */
  attribution: TaskAttribution[];
}

/**
 * 任务来源信息
 */
export interface TaskAttribution {
  /** 来源类型 */
  name: string;
  /** 来源条目类型 */
  entryType: string;
  /** 开始时间 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 容器类型 */
  containerType?: string;
  /** 容器 ID */
  containerId?: string;
  /** 容器名称 */
  containerName?: string;
  /** 容器源 */
  containerSrc?: string;
}

/**
 * 布局偏移来源信息
 */
export interface LayoutShiftAttribution {
  /** 之前的矩形 */
  previousRect: DOMRectReadOnly;
  /** 当前的矩形 */
  currentRect: DOMRectReadOnly;
  /** 节点 */
  node?: Node;
}

/**
 * 性能指标统计
 */
export interface PerformanceMetrics {
  /** 总资源数量 */
  totalResources: number;
  /** 总资源大小（字节） */
  totalSize: number;
  /** 平均加载时间（毫秒） */
  averageLoadTime: number;
  /** 慢资源数量 */
  slowResourceCount: number;
  /** DNS 时间统计 */
  dnsStats: {
    /** 平均 DNS 时间（毫秒） */
    average: number;
    /** 最大 DNS 时间（毫秒） */
    max: number;
    /** 最小 DNS 时间（毫秒） */
    min: number;
  };
  /** 连接时间统计 */
  connectStats: {
    /** 平均连接时间（毫秒） */
    average: number;
    /** 最大连接时间（毫秒） */
    max: number;
    /** 最小连接时间（毫秒） */
    min: number;
  };
  /** 传输时间统计 */
  transferStats: {
    /** 平均传输时间（毫秒） */
    average: number;
    /** 最大传输时间（毫秒） */
    max: number;
    /** 最小传输时间（毫秒） */
    min: number;
  };
}

/**
 * ResourcePerformanceDetector 配置接口
 */
export interface ResourcePerformanceConfig {
  /** 要观察的性能条目类型 */
  entryTypes?: string[];
  /** 慢资源阈值（毫秒），默认 1000 */
  slowResourceThreshold?: number;
  /** 网络安静阈值（毫秒），默认 500 */
  networkQuietThreshold?: number;
  /** 是否启用 Core Web Vitals 监控，默认 false */
  enableCoreWebVitals?: boolean;
  /** 是否启用长任务检测，默认 false */
  enableLongTask?: boolean;
  /** 资源加载回调 */
  onResourceLoad?: (resource: ResourceInfo) => void;
  /** 慢资源回调 */
  onSlowResource?: (resource: SlowResourceInfo) => void;
  /** 网络安静回调 */
  onNetworkQuiet?: (info: NetworkQuietInfo) => void;
  /** 导航性能回调 */
  onNavigationTiming?: (info: NavigationTimingInfo) => void;
  /** Core Web Vitals 回调 */
  onCoreWebVital?: (info: CoreWebVitalInfo) => void;
  /** 长任务回调 */
  onLongTask?: (info: LongTaskInfo) => void;
}
