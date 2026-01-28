/**
 * Service Worker 生命周期管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 参考: .reverse/manus-reverse/sources/0.0.47_0/background.ts.js
 */

/**
 * 生命周期感知接口
 * 任何需要清理资源的组件都应该实现此接口
 */
export interface LifecycleAware {
  /** 停止组件并清理资源 */
  stop(): void | Promise<void>;
}

/**
 * Service Worker 生命周期管理器
 *
 * 负责管理 Service Worker 的生命周期，特别是：
 * - 注册 chrome.runtime.onSuspend 监听器
 * - 在 Service Worker 终止前清理所有资源
 * - 确保资源正确释放，防止泄漏
 *
 * 使用方式：
 * ```typescript
 * const lifecycleManager = new ServiceWorkerLifecycleManager();
 * lifecycleManager.addManager(keepAliveManager);
 * lifecycleManager.addManager(mimoEngineManager);
 * lifecycleManager.register();
 * ```
 */
export class ServiceWorkerLifecycleManager {
  private suspendListener: (() => void) | null = null;
  private managers: Set<LifecycleAware> = new Set();

  /**
   * 注册生命周期监听器
   *
   * 必须在添加管理器后调用此方法
   */
  register(): void {
    if (this.suspendListener) {
      console.warn('[Lifecycle] Already registered');
      return;
    }

    console.info('[Lifecycle] Registering lifecycle handlers');

    // 注册 onSuspend 监听器
    // Service Worker 即将终止时会触发此事件
    this.suspendListener = () => this.onSuspend();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  /**
   * 注销生命周期监听器
   */
  unregister(): void {
    if (this.suspendListener) {
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
      console.info('[Lifecycle] Unregistered lifecycle handlers');
    }
  }

  /**
   * 添加生命周期感知组件
   *
   * @param manager 需要管理的组件
   */
  addManager(manager: LifecycleAware): void {
    this.managers.add(manager);
    console.debug(`[Lifecycle] Added manager, total: ${this.managers.size}`);
  }

  /**
   * 移除生命周期感知组件
   *
   * @param manager 需要移除的组件
   */
  removeManager(manager: LifecycleAware): void {
    this.managers.delete(manager);
    console.debug(`[Lifecycle] Removed manager, total: ${this.managers.size}`);
  }

  /**
   * Service Worker 即将终止时的清理逻辑
   *
   * 此方法会：
   * 1. 停止所有注册的管理器
   * 2. 清理所有资源
   * 3. 注销监听器
   *
   * 注意：此方法的执行时间有限（通常几秒），
   * 应该只执行必要的清理操作，不要执行耗时操作
   */
  private async onSuspend(): Promise<void> {
    console.info('[Lifecycle] Service Worker suspending, cleaning up resources');

    const startTime = Date.now();

    // 1. 停止所有管理器
    const stopPromises = Array.from(this.managers).map(async (manager, index) => {
      try {
        await Promise.resolve(manager.stop());
        console.debug(`[Lifecycle] Stopped manager ${index + 1}/${this.managers.size}`);
      } catch (error) {
        console.warn(`[Lifecycle] Failed to stop manager ${index + 1}`, { error });
      }
    });

    await Promise.all(stopPromises);

    // 2. 清理监听器
    this.unregister();

    const duration = Date.now() - startTime;
    console.info(`[Lifecycle] Cleanup complete in ${duration}ms`);
  }

  /**
   * 获取当前管理的组件数量
   */
  get managerCount(): number {
    return this.managers.size;
  }
}
