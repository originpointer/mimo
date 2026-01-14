'use client';

import { useEffect, useRef } from 'react';
import { ResourcePerformanceDetector } from '../../../packages/sens/src/detectors';
import type {
  ResourceInfo,
  SlowResourceInfo,
  NetworkQuietInfo,
  NavigationTimingInfo,
  CoreWebVitalInfo,
  LongTaskInfo,
} from '../../../packages/sens/src/detectors';

/**
 * 格式化字节数为友好格式
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化毫秒数为友好格式
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 资源监测组件
 * 在控制台输出所有性能监测数据
 */
export function ResourceMonitor() {
  const detectorRef = useRef<ResourcePerformanceDetector | null>(null);

  useEffect(() => {
    console.log('ResourceMonitor useEffect');
    // 检查是否支持 PerformanceObserver
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('[ResourceMonitor] PerformanceObserver is not supported in this browser');
      return;
    }

    // 初始化 detector
    const detector = new ResourcePerformanceDetector({
      slowResourceThreshold: 1000,
      networkQuietThreshold: 500,
      enableCoreWebVitals: true,
      enableLongTask: true,
      onResourceLoad: (resource: ResourceInfo) => {
        const size = formatBytes(resource.transferSize);
        const duration = formatTime(resource.duration);
        console.log(
          `[Resource] ${resource.name}`,
          `\n  Type: ${resource.initiatorType}`,
          `\n  Duration: ${duration}`,
          `\n  Size: ${size}`,
          `\n  DNS: ${formatTime(resource.dnsTime)}`,
          `\n  Connect: ${formatTime(resource.connectTime)}`,
          `\n  Transfer: ${formatTime(resource.responseTime)}`,
        );
      },
      onSlowResource: (resource: SlowResourceInfo) => {
        const duration = formatTime(resource.duration);
        console.warn(
          `[Slow Resource] ${resource.name}`,
          `\n  Duration: ${duration} (threshold: ${formatTime(resource.threshold)})`,
          `\n  Reasons:`,
          ...resource.reasons.map((reason: string) => `\n    - ${reason}`),
        );
      },
      onNetworkQuiet: (info: NetworkQuietInfo) => {
        const quietDuration = formatTime(info.quietDuration);
        console.log(
          `[Network Quiet]`,
          `\n  Quiet Duration: ${quietDuration}`,
          `\n  Last Activity: ${new Date(info.lastActivityTime).toLocaleTimeString()}`,
        );
      },
      onNavigationTiming: (info: NavigationTimingInfo) => {
        console.log(
          `[Navigation Performance]`,
          `\n  Type: ${info.type}`,
          `\n  DNS: ${formatTime(info.dnsTime)}`,
          `\n  Connect: ${formatTime(info.connectTime)}`,
          `\n  Request: ${formatTime(info.requestTime)}`,
          `\n  Response: ${formatTime(info.responseTime)}`,
          `\n  DOM Parse: ${formatTime(info.domParseTime)}`,
          `\n  Total Load: ${formatTime(info.loadTime)}`,
        );
      },
      onCoreWebVital: (info: CoreWebVitalInfo) => {
        let valueStr = '';

        switch (info.type) {
          case 'LCP':
            valueStr = formatTime(info.value);
            console.log(
              `[CWV] LCP: ${valueStr}`,
              info.details?.element ? `\n  Element: ${info.details.element.tagName}` : '',
              info.details?.url ? `\n  URL: ${info.details.url}` : '',
              info.details?.size ? `\n  Size: ${info.details.size}px` : '',
            );
            break;
          case 'FID':
            valueStr = formatTime(info.value);
            console.log(
              `[CWV] FID: ${valueStr}`,
              info.details?.eventType ? `\n  Event: ${info.details.eventType}` : '',
            );
            break;
          case 'CLS':
            valueStr = info.value.toFixed(4);
            console.log(
              `[CWV] CLS: ${valueStr}`,
              info.details?.sources && info.details.sources.length > 0
                ? `\n  Sources: ${info.details.sources.length} layout shifts`
                : '',
            );
            break;
        }
      },
      onLongTask: (task: LongTaskInfo) => {
        const duration = formatTime(task.duration);
        console.warn(
          `[Long Task]`,
          `\n  Duration: ${duration}`,
          `\n  Name: ${task.name}`,
          task.attribution.length > 0
            ? `\n  Attribution:\n${task.attribution
                .map(
                  (attr: { name: string; entryType: string; duration: number }) =>
                    `    - ${attr.name} (${attr.entryType}): ${formatTime(attr.duration)}`,
                )
                .join('\n')}`
            : '',
        );
      },
    });

    detector.observe();
    detectorRef.current = detector;

    // 在页面加载完成后输出性能指标统计
    const handleLoad = () => {
      setTimeout(() => {
        const metrics = detector.getMetrics();
        console.log(
          `[Performance Metrics]`,
          `\n  Total Resources: ${metrics.totalResources}`,
          `\n  Total Size: ${formatBytes(metrics.totalSize)}`,
          `\n  Average Load Time: ${formatTime(metrics.averageLoadTime)}`,
          `\n  Slow Resources: ${metrics.slowResourceCount}`,
          `\n  DNS Stats:`,
          `\n    Average: ${formatTime(metrics.dnsStats.average)}`,
          `\n    Max: ${formatTime(metrics.dnsStats.max)}`,
          `\n    Min: ${formatTime(metrics.dnsStats.min)}`,
          `\n  Connect Stats:`,
          `\n    Average: ${formatTime(metrics.connectStats.average)}`,
          `\n    Max: ${formatTime(metrics.connectStats.max)}`,
          `\n    Min: ${formatTime(metrics.connectStats.min)}`,
          `\n  Transfer Stats:`,
          `\n    Average: ${formatTime(metrics.transferStats.average)}`,
          `\n    Max: ${formatTime(metrics.transferStats.max)}`,
          `\n    Min: ${formatTime(metrics.transferStats.min)}`,
        );

        // 输出 Core Web Vitals 汇总
        const cwv = detector.getCoreWebVitals();
        if (cwv.size > 0) {
          console.log(`[Core Web Vitals Summary]`);
          cwv.forEach((vital: CoreWebVitalInfo, type: string) => {
            if (type === 'LCP' || type === 'FID') {
              console.log(`  ${type}: ${formatTime(vital.value)}`);
            } else if (type === 'CLS') {
              console.log(`  ${type}: ${vital.value.toFixed(4)}`);
            }
          });
        }

        // 输出长任务汇总
        const longTasks = detector.getLongTasks();
        if (longTasks.length > 0) {
          console.warn(
            `[Long Tasks Summary]`,
            `\n  Total: ${longTasks.length}`,
            `\n  Total Duration: ${formatTime(
              longTasks.reduce((sum: number, task: LongTaskInfo) => sum + task.duration, 0),
            )}`,
          );
        }
      }, 1000);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // 清理函数
    return () => {
      if (detectorRef.current) {
        detectorRef.current.disconnect();
        detectorRef.current = null;
      }
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // 不渲染任何 UI
  return null;
}
