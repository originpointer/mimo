/**
 * Keep-Alive 管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 参考: .reverse/manus-reverse/sources/0.0.47_0/background.ts.js
 *
 * 核心思想：通过定期执行 Chrome API 调用（每 10 秒），
 * 确保 Service Worker 永远不会达到 30 秒空闲超时限制
 */

import { LifecycleAware } from "./lifecycle-manager";

/**
 * Keep-Alive 管理器配置
 */
export interface KeepAliveConfig {
  /** 轮询间隔（毫秒），默认 10000ms (10秒) */
  pollInterval?: number;
  /** 保活回调函数 */
  onKeepAlive: () => Promise<void>;
}

/**
 * Keep-Alive 管理器
 *
 * 通过定期轮询保持 Service Worker 活跃：
 * - 每 10 秒执行一次 Chrome API 调用（chrome.tabs.query）
 * - 重置 Service Worker 的空闲计时器
 * - 可选的额外保活操作（如发送 WebSocket 心跳）
 *
 * 为什么 10 秒？
 * - Chrome Service Worker 空闲超时约为 30 秒
 * - 10 秒 < 30 秒，确保在超时前重置计时器
 * - 留有足够的安全系数（3x）
 *
 * 使用方式：
 * ```typescript
 * const keepAliveManager = new KeepAliveManager({
 *   onKeepAlive: async () => {
 *     // 发送 WebSocket 心跳
 *     await mimoEngine.sendHeartbeat();
 *   }
 * });
 * keepAliveManager.start();
 * ```
 */
export class KeepAliveManager implements LifecycleAware {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL: number;

  /**
   * 保活回调函数
   *
   * 每次轮询时调用，用于执行额外的保活操作
   */
  private readonly onKeepAlive: () => Promise<void>;

  constructor(config: KeepAliveConfig) {
    this.POLL_INTERVAL = config.pollInterval ?? 10000;  // 默认 10 秒
    this.onKeepAlive = config.onKeepAlive;
  }

  /**
   * 启动保活轮询
   *
   * 会先执行一次保活操作，然后开始定时轮询
   */
  start(): void {
    if (this.pollTimer) {
      console.warn('[KeepAlive] Already started');
      return;
    }

    console.info('[KeepAlive] Starting keep-alive polling', {
      interval: this.POLL_INTERVAL
    });

    // 立即执行一次
    this.performKeepAlive().catch((error) => {
      console.warn('[KeepAlive] Initial keep-alive failed', { error });
    });

    // 每 N 秒轮询一次
    this.pollTimer = setInterval(() => {
      this.performKeepAlive().catch((error) => {
        console.warn('[KeepAlive] Polling failed', { error });
      });
    }, this.POLL_INTERVAL);
  }

  /**
   * 停止保活轮询
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.info('[KeepAlive] Stopped keep-alive polling');
    }
  }

  /**
   * 执行保活操作
   *
   * 1. 执行 Chrome API 调用（chrome.tabs.query）重置空闲计时器
   * 2. 调用自定义保活回调
   *
   * 任何 Chrome Extension API 调用都会重置 Service Worker 的空闲计时器
   */
  private async performKeepAlive(): Promise<void> {
    // 1. 执行 Chrome API 调用重置空闲计时器
    // 这是关键：任何 Chrome API 调用都会重置空闲计时器
    await chrome.tabs.query({});

    // 2. 调用自定义保活回调
    // 例如：发送 WebSocket 心跳
    if (this.onKeepAlive) {
      await this.onKeepAlive();
    }
  }

  /**
   * 检查是否正在运行
   */
  get isRunning(): boolean {
    return this.pollTimer !== null;
  }
}
