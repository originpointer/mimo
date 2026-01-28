/**
 * 状态管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 参考: .reverse/manus-reverse/sources/0.0.47_0/background.ts.js
 *
 * 负责检测 Service Worker 重启和持久化关键状态
 */

import { LifecycleAware } from "./lifecycle-manager";

/**
 * 状态管理器配置
 */
export interface StateManagerConfig {
  /** 心跳间隔（毫秒），默认 10000ms (10秒) */
  heartbeatInterval?: number;
  /** 重启检测阈值（毫秒），默认 30000ms (30秒) */
  restartThreshold?: number;
}

/**
 * 状态管理器
 *
 * 功能：
 * 1. 检测 Service Worker 是否刚重启（通过心跳时间戳）
 * 2. 持久化关键状态到 chrome.storage.local
 * 3. 定期更新心跳时间戳
 *
 * 重启检测原理：
 * - Service Worker 重启后，内存中的所有状态都会丢失
 * - 通过 chrome.storage.local 保存最后心跳时间戳
 * - 如果超过阈值（默认 30 秒）无心跳，认为是重启
 *
 * 使用方式：
 * ```typescript
 * const stateManager = new StateManager({ heartbeatInterval: 10000 });
 *
 * // 启动心跳
 * stateManager.startHeartbeat();
 *
 * // 检测是否重启
 * const isRestart = await stateManager.isServiceWorkerRestart();
 *
 * // 保存/加载状态
 * await stateManager.saveState({ connected: true });
 * const state = await stateManager.loadState();
 * ```
 */
export class StateManager implements LifecycleAware {
  private readonly HEARTBEAT_KEY = 'mimo_sw_heartbeat';
  private readonly STATE_KEY = 'mimo_state';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly HEARTBEAT_INTERVAL: number;
  private readonly RESTART_THRESHOLD: number;

  constructor(config: StateManagerConfig = {}) {
    this.HEARTBEAT_INTERVAL = config.heartbeatInterval ?? 10000;  // 默认 10 秒
    this.RESTART_THRESHOLD = config.restartThreshold ?? 30000;    // 默认 30 秒
  }

  /**
   * 启动心跳
   *
   * 定期更新 chrome.storage.local 中的心跳时间戳
   *
   * @param interval 心跳间隔（毫秒），默认使用构造函数中的配置
   */
  startHeartbeat(interval?: number): void {
    this.stopHeartbeat();

    const heartbeatInterval = interval ?? this.HEARTBEAT_INTERVAL;

    this.heartbeatTimer = setInterval(() => {
      this.updateHeartbeat();
    }, heartbeatInterval);

    // 立即更新一次
    this.updateHeartbeat();

    console.info('[State] Started heartbeat', { interval: heartbeatInterval });
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.info('[State] Stopped heartbeat');
    }
  }

  /**
   * 更新心跳时间戳
   */
  private async updateHeartbeat(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.HEARTBEAT_KEY]: Date.now()
      });
    } catch (error) {
      console.warn('[State] Failed to update heartbeat', { error });
    }
  }

  /**
   * 检测 Service Worker 是否刚重启
   *
   * @returns true 如果刚重启，false 否则
   */
  async isServiceWorkerRestart(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(this.HEARTBEAT_KEY);
      const lastHeartbeat = result[this.HEARTBEAT_KEY] as number | undefined;

      if (!lastHeartbeat) {
        console.info('[State] No previous heartbeat, assuming fresh start');
        return true;
      }

      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeat;

      // 如果超过阈值，认为是重启
      const isRestart = timeSinceLastHeartbeat > this.RESTART_THRESHOLD;

      if (isRestart) {
        console.info('[State] Service Worker restart detected', {
          timeSinceLastHeartbeat,
          threshold: this.RESTART_THRESHOLD
        });
      }

      return isRestart;
    } catch (error) {
      console.warn('[State] Failed to check restart status', { error });
      return true;  // 出错时假设是重启
    }
  }

  /**
   * 保存状态到 chrome.storage.local
   *
   * @param state 要保存的状态
   */
  async saveState(state: unknown): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STATE_KEY]: {
          data: state,
          timestamp: Date.now()
        }
      });
      console.debug('[State] State saved');
    } catch (error) {
      console.warn('[State] Failed to save state', { error });
    }
  }

  /**
   * 从 chrome.storage.local 加载状态
   *
   * @returns 保存的状态，如果不存在或已过期则返回 null
   */
  async loadState(): Promise<unknown | null> {
    try {
      const result = await chrome.storage.local.get(this.STATE_KEY);
      const stored = result[this.STATE_KEY] as { data: unknown; timestamp: number } | undefined;

      if (!stored) {
        return null;
      }

      // 检查状态是否过期（5分钟）
      const AGE_LIMIT = 5 * 60 * 1000;
      const age = Date.now() - stored.timestamp;

      if (age > AGE_LIMIT) {
        console.info('[State] State expired, removing', { age });
        await chrome.storage.local.remove(this.STATE_KEY);
        return null;
      }

      console.debug('[State] State loaded', { age });
      return stored.data;
    } catch (error) {
      console.warn('[State] Failed to load state', { error });
      return null;
    }
  }

  /**
   * 清除所有保存的状态
   */
  async clearState(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.HEARTBEAT_KEY, this.STATE_KEY]);
      console.info('[State] State cleared');
    } catch (error) {
      console.warn('[State] Failed to clear state', { error });
    }
  }

  /**
   * 停止心跳（LifecycleAware 接口实现）
   */
  stop(): void {
    this.stopHeartbeat();
  }
}
