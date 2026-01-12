# ResourcePerformanceDetector 使用指南

## 概述

`ResourcePerformanceDetector` 是一个基于 `PerformanceObserver` API 的资源加载分析和性能监控工具类。它提供了完整的资源加载监控、慢资源检测、网络安静判断、导航性能分析、Core Web Vitals 监控、长任务检测和性能指标统计功能。

## 适用场景

- **资源加载监控**: 监控页面中所有资源的加载情况
- **性能分析**: 分析页面加载性能，识别性能瓶颈
- **慢资源检测**: 自动检测加载时间超过阈值的资源
- **网络活动监控**: 判断网络是否进入安静期
- **Core Web Vitals 监控**: 监控 LCP、FID、CLS 等关键性能指标
- **长任务检测**: 检测阻塞主线程的长任务
- **性能回归测试**: 收集性能指标用于回归测试

## 安装

```bash
pnpm add @repo/sens
```

## 基础使用

### 最简单的使用

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector();
detector.observe();
```

### 使用回调函数

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  onResourceLoad: (resource) => {
    console.log('Resource loaded:', resource.name);
    console.log('Duration:', resource.duration, 'ms');
  },
  onSlowResource: (resource) => {
    console.warn('Slow resource detected:', resource.name);
    console.warn('Reasons:', resource.reasons);
  },
});

detector.observe();
```

## 配置选项

### ResourcePerformanceConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `entryTypes` | `string[]` | `['resource', 'navigation']` | 要观察的性能条目类型 |
| `slowResourceThreshold` | `number` | `1000` | 慢资源阈值（毫秒） |
| `networkQuietThreshold` | `number` | `500` | 网络安静阈值（毫秒） |
| `enableCoreWebVitals` | `boolean` | `false` | 是否启用 Core Web Vitals 监控 |
| `enableLongTask` | `boolean` | `false` | 是否启用长任务检测 |
| `onResourceLoad` | `(resource: ResourceInfo) => void` | - | 资源加载回调 |
| `onSlowResource` | `(resource: SlowResourceInfo) => void` | - | 慢资源回调 |
| `onNetworkQuiet` | `(info: NetworkQuietInfo) => void` |  | 网络安静回调 |
| `onNavigationTiming` | `(info: NavigationTimingInfo) => void` | - | 导航性能回调 |
| `onCoreWebVital` | `(info: CoreWebVitalInfo) => void` | - | Core Web Vitals 回调 |
| `onLongTask` | `(info: LongTaskInfo) => void` | - | 长任务回调 |

## API 文档

### 方法

#### `observe()`

开始观察性能条目。

```typescript
detector.observe();
```

#### `disconnect()`

停止观察并清理资源。

```typescript
detector.disconnect();
```

#### `getResources(): ResourceInfo[]`

获取所有已加载的资源信息。

```typescript
const resources = detector.getResources();
resources.forEach((resource) => {
  console.log(resource.name, resource.duration);
});
```

#### `getSlowResources(): SlowResourceInfo[]`

获取慢资源列表。

```typescript
const slowResources = detector.getSlowResources();
slowResources.forEach((resource) => {
  console.warn('Slow resource:', resource.name);
  console.warn('Reasons:', resource.reasons);
});
```

#### `isNetworkQuiet(): boolean`

判断网络是否安静。

```typescript
if (detector.isNetworkQuiet()) {
  console.log('Network is quiet');
}
```

#### `getNavigationTiming(): NavigationTimingInfo | undefined`

获取导航性能数据。

```typescript
const navTiming = detector.getNavigationTiming();
if (navTiming) {
  console.log('Load time:', navTiming.loadTime, 'ms');
  console.log('DOM parse time:', navTiming.domParseTime, 'ms');
}
```

#### `getCoreWebVitals(): Map<CoreWebVitalType, CoreWebVitalInfo>`

获取 Core Web Vitals 数据。

```typescript
const cwv = detector.getCoreWebVitals();
const lcp = cwv.get('LCP');
if (lcp) {
  console.log('LCP:', lcp.value, 'ms');
}
```

#### `getLongTasks(): LongTaskInfo[]`

获取长任务列表。

```typescript
const longTasks = detector.getLongTasks();
longTasks.forEach((task) => {
  console.warn('Long task:', task.duration, 'ms');
});
```

#### `getMetrics(): PerformanceMetrics`

获取性能指标统计。

```typescript
const metrics = detector.getMetrics();
console.log('Total resources:', metrics.totalResources);
console.log('Total size:', metrics.totalSize, 'bytes');
console.log('Average load time:', metrics.averageLoadTime, 'ms');
console.log('Slow resources:', metrics.slowResourceCount);
```

#### `reset()`

重置所有数据。

```typescript
detector.reset();
```

## 使用示例

### 示例 1: 资源加载监控

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  onResourceLoad: (resource) => {
    console.log(`[Resource] ${resource.name}`);
    console.log(`  Type: ${resource.initiatorType}`);
    console.log(`  Duration: ${resource.duration.toFixed(2)}ms`);
    console.log(`  Size: ${(resource.transferSize / 1024).toFixed(2)}KB`);
  },
});

detector.observe();

// 在页面加载完成后获取所有资源
window.addEventListener('load', () => {
  const resources = detector.getResources();
  console.log(`Total resources: ${resources.length}`);
});
```

### 示例 2: 慢资源检测

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  slowResourceThreshold: 2000, // 2秒
  onSlowResource: (resource) => {
    console.warn(`[Slow Resource] ${resource.name}`);
    console.warn(`  Duration: ${resource.duration.toFixed(2)}ms`);
    console.warn(`  Reasons:`, resource.reasons);
    
    // 上报到监控系统
    // reportSlowResource(resource);
  },
});

detector.observe();
```

### 示例 3: 网络安静判断

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  networkQuietThreshold: 1000, // 1秒
  onNetworkQuiet: (info) => {
    console.log('Network is quiet');
    console.log(`Quiet duration: ${info.quietDuration}ms`);
    
    // 可以在这里执行一些操作，比如开始自动化测试
    // startAutomation();
  },
});

detector.observe();
```

### 示例 4: 导航性能分析

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  onNavigationTiming: (info) => {
    console.log('Navigation Performance:');
    console.log(`  DNS: ${info.dnsTime.toFixed(2)}ms`);
    console.log(`  Connect: ${info.connectTime.toFixed(2)}ms`);
    console.log(`  Request: ${info.requestTime.toFixed(2)}ms`);
    console.log(`  Response: ${info.responseTime.toFixed(2)}ms`);
    console.log(`  DOM Parse: ${info.domParseTime.toFixed(2)}ms`);
    console.log(`  Total Load: ${info.loadTime.toFixed(2)}ms`);
  },
});

detector.observe();
```

### 示例 5: Core Web Vitals 监控

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  enableCoreWebVitals: true,
  onCoreWebVital: (info) => {
    switch (info.type) {
      case 'LCP':
        console.log(`LCP: ${info.value.toFixed(2)}ms`);
        if (info.details?.element) {
          console.log('LCP Element:', info.details.element);
        }
        break;
      case 'FID':
        console.log(`FID: ${info.value.toFixed(2)}ms`);
        break;
      case 'CLS':
        console.log(`CLS: ${info.value.toFixed(4)}`);
        break;
    }
    
    // 上报到监控系统
    // reportCoreWebVital(info);
  },
});

detector.observe();
```

### 示例 6: 长任务检测

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector({
  enableLongTask: true,
  onLongTask: (task) => {
    console.warn(`[Long Task] ${task.duration.toFixed(2)}ms`);
    console.warn('Attribution:', task.attribution);
    
    // 上报到监控系统
    // reportLongTask(task);
  },
});

detector.observe();
```

### 示例 7: 性能指标统计

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

const detector = new ResourcePerformanceDetector();
detector.observe();

// 在页面加载完成后获取统计信息
window.addEventListener('load', () => {
  const metrics = detector.getMetrics();
  
  console.log('Performance Metrics:');
  console.log(`  Total Resources: ${metrics.totalResources}`);
  console.log(`  Total Size: ${(metrics.totalSize / 1024).toFixed(2)}KB`);
  console.log(`  Average Load Time: ${metrics.averageLoadTime.toFixed(2)}ms`);
  console.log(`  Slow Resources: ${metrics.slowResourceCount}`);
  console.log(`  DNS Stats:`, metrics.dnsStats);
  console.log(`  Connect Stats:`, metrics.connectStats);
  console.log(`  Transfer Stats:`, metrics.transferStats);
});
```

### 示例 8: 完整监控方案

```typescript
import { ResourcePerformanceDetector } from '@repo/sens/detectors';

class PerformanceMonitor {
  private detector: ResourcePerformanceDetector;

  constructor() {
    this.detector = new ResourcePerformanceDetector({
      slowResourceThreshold: 2000,
      networkQuietThreshold: 1000,
      enableCoreWebVitals: true,
      enableLongTask: true,
      onResourceLoad: this.handleResourceLoad.bind(this),
      onSlowResource: this.handleSlowResource.bind(this),
      onNetworkQuiet: this.handleNetworkQuiet.bind(this),
      onNavigationTiming: this.handleNavigationTiming.bind(this),
      onCoreWebVital: this.handleCoreWebVital.bind(this),
      onLongTask: this.handleLongTask.bind(this),
    });
  }

  start() {
    this.detector.observe();
  }

  stop() {
    this.detector.disconnect();
  }

  getReport() {
    return {
      resources: this.detector.getResources(),
      slowResources: this.detector.getSlowResources(),
      navigationTiming: this.detector.getNavigationTiming(),
      coreWebVitals: Object.fromEntries(this.detector.getCoreWebVitals()),
      longTasks: this.detector.getLongTasks(),
      metrics: this.detector.getMetrics(),
    };
  }

  private handleResourceLoad(resource: ResourceInfo) {
    // 记录资源加载
    console.log('Resource loaded:', resource.name);
  }

  private handleSlowResource(resource: SlowResourceInfo) {
    // 上报慢资源
    console.warn('Slow resource:', resource.name);
  }

  private handleNetworkQuiet(info: NetworkQuietInfo) {
    // 网络安静，可以开始执行某些操作
    console.log('Network is quiet');
  }

  private handleNavigationTiming(info: NavigationTimingInfo) {
    // 记录导航性能
    console.log('Navigation timing:', info.loadTime);
  }

  private handleCoreWebVital(info: CoreWebVitalInfo) {
    // 记录 Core Web Vitals
    console.log('Core Web Vital:', info.type, info.value);
  }

  private handleLongTask(task: LongTaskInfo) {
    // 记录长任务
    console.warn('Long task:', task.duration);
  }
}

// 使用
const monitor = new PerformanceMonitor();
monitor.start();

// 在页面卸载前获取报告
window.addEventListener('beforeunload', () => {
  const report = monitor.getReport();
  // 发送报告到服务器
  // sendReport(report);
});
```

## 类型定义

### ResourceInfo

资源信息接口，包含资源加载的详细信息。

```typescript
interface ResourceInfo {
  name: string;
  initiatorType: string;
  startTime: number;
  duration: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  dnsTime: number;
  connectTime: number;
  requestTime: number;
  responseTime: number;
}
```

### SlowResourceInfo

慢资源信息接口，继承自 `ResourceInfo`。

```typescript
interface SlowResourceInfo extends ResourceInfo {
  isSlow: true;
  threshold: number;
  reasons: string[];
}
```

### NetworkQuietInfo

网络安静信息接口。

```typescript
interface NetworkQuietInfo {
  timestamp: number;
  quietDuration: number;
  lastActivityTime: number;
  threshold: number;
}
```

### NavigationTimingInfo

导航性能信息接口。

```typescript
interface NavigationTimingInfo {
  type: string;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  loadEventStart: number;
  loadEventEnd: number;
  dnsTime: number;
  connectTime: number;
  requestTime: number;
  responseTime: number;
  domParseTime: number;
  loadTime: number;
}
```

### CoreWebVitalInfo

Core Web Vitals 信息接口。

```typescript
interface CoreWebVitalInfo {
  type: 'LCP' | 'FID' | 'CLS';
  value: number;
  timestamp: number;
  details?: {
    element?: Element;
    url?: string;
    size?: number;
    eventType?: string;
    target?: EventTarget;
    sources?: LayoutShiftAttribution[];
    hadRecentInput?: boolean;
  };
}
```

### LongTaskInfo

长任务信息接口。

```typescript
interface LongTaskInfo {
  startTime: number;
  duration: number;
  name: string;
  attribution: TaskAttribution[];
}
```

### PerformanceMetrics

性能指标统计接口。

```typescript
interface PerformanceMetrics {
  totalResources: number;
  totalSize: number;
  averageLoadTime: number;
  slowResourceCount: number;
  dnsStats: {
    average: number;
    max: number;
    min: number;
  };
  connectStats: {
    average: number;
    max: number;
    min: number;
  };
  transferStats: {
    average: number;
    max: number;
    min: number;
  };
}
```

## 最佳实践

### 1. 及时清理资源

在使用完毕后，记得调用 `disconnect()` 清理资源：

```typescript
const detector = new ResourcePerformanceDetector();
detector.observe();

// 使用完毕后清理
window.addEventListener('beforeunload', () => {
  detector.disconnect();
});
```

### 2. 避免在回调中执行重操作

回调函数应该尽量轻量，避免执行耗时操作：

```typescript
// 好的做法
detector = new ResourcePerformanceDetector({
  onResourceLoad: (resource) => {
    // 只记录数据，不执行重操作
    resources.push(resource);
  },
});

// 不好的做法
detector = new ResourcePerformanceDetector({
  onResourceLoad: (resource) => {
    // 避免在回调中执行重操作
    heavyOperation(resource); // 不推荐
  },
});
```

### 3. 合理设置阈值

根据实际需求设置合理的阈值：

```typescript
// 对于性能要求高的应用
const detector = new ResourcePerformanceDetector({
  slowResourceThreshold: 1000, // 1秒
  networkQuietThreshold: 500,  // 0.5秒
});

// 对于一般应用
const detector = new ResourcePerformanceDetector({
  slowResourceThreshold: 2000, // 2秒
  networkQuietThreshold: 1000, // 1秒
});
```

### 4. 处理浏览器兼容性

在使用前检查浏览器是否支持：

```typescript
if (typeof PerformanceObserver === 'undefined') {
  console.warn('PerformanceObserver is not supported');
  // 提供降级方案
} else {
  const detector = new ResourcePerformanceDetector();
  detector.observe();
}
```

### 5. 批量处理数据

如果需要处理大量数据，考虑批量处理：

```typescript
const resources: ResourceInfo[] = [];

detector = new ResourcePerformanceDetector({
  onResourceLoad: (resource) => {
    resources.push(resource);
  },
});

// 定期批量处理
setInterval(() => {
  if (resources.length > 0) {
    processResources(resources.splice(0));
  }
}, 5000);
```

## 注意事项

1. **PerformanceObserver 支持**: 需要浏览器支持 `PerformanceObserver` API
2. **entryTypes 限制**: 某些 entryTypes 可能不被所有浏览器支持
3. **回调时机**: 回调函数可能在资源加载完成后才被调用
4. **性能影响**: 虽然 PerformanceObserver 本身性能开销较小，但过多的回调处理可能影响性能
5. **数据准确性**: 某些性能数据可能因为浏览器实现差异而不完全准确

## 参考资源

- [MDN - PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [MDN - PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
- [MDN - PerformanceNavigationTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)
- [Web Vitals](https://web.dev/vitals/)
