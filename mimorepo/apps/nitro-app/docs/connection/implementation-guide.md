# Mimo 连接优化实施指南

> 基于 Manus 方案的 Mimo 项目实施建议

---

## 一、问题分析

### 1.1 当前问题

| 问题 | 现象 | 原因 |
|------|------|------|
| **频繁断联** | 连接 3-17 分钟后断开 | Service Worker 30秒超时 |
| **心跳失效** | `avgHeartbeatInterval: 0` | 心跳定时器被清除 |
| **无自动重连** | 断开后不重连 | 缺少重连逻辑 |

### 1.2 目标

1. **保持连接稳定**: 确保 Service Worker 持续活跃
2. **优雅处理断连**: 实现自动重连机制
3. **资源管理完善**: 正确清理和重建资源

---

## 二、实施方案

### 方案概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Mimo 连接优化架构                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  1. Keep-Alive Manager                                         ││
│  │     ├── 每 10 秒执行 Chrome API 调用                            ││
│  │     └── 保持 Service Worker 活跃                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  2. MimoEngine Manager                                         ││
│  │     ├── 管理 WebSocket 连接                                     ││
│  │     ├── 发送应用层心跳（30秒）                                   ││
│  │     └── 处理连接状态变化                                        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  3. Lifecycle Manager                                          ││
│  │     ├── onSuspend 清理资源                                      ││
│  │     ├── onStartup 重建连接                                      ││
│  │     └── 管理各组件生命周期                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  4. State Manager                                              ││
│  │     ├── 检测 Service Worker 重启                                ││
│  │     ├── 持久化关键状态                                          ││
│  │     └── 重启后恢复连接                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、Keep-Alive Manager

### 3.1 实现

**文件**: `apps/plasmo-app/src/background/managers/keep-alive-manager.ts`

```typescript
import { logger } from "@mimo/bus/logger";

export class KeepAliveManager {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL = 10000;  // 10秒

  constructor(
    private readonly onKeepAlive: () => Promise<void>
  ) {}

  start(): void {
    this.stop();
    logger.info('[KeepAlive] Starting keep-alive polling');

    // 立即执行一次
    this.performKeepAlive().catch(error => {
      logger.warn('[KeepAlive] Initial keep-alive failed', { error });
    });

    // 每 10 秒轮询一次
    this.pollTimer = setInterval(() => {
      this.performKeepAlive().catch(error => {
        logger.warn('[KeepAlive] Polling failed', { error });
      });
    }, this.POLL_INTERVAL);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      logger.info('[KeepAlive] Stopped keep-alive polling');
    }
  }

  private async performKeepAlive(): Promise<void> {
    // 执行 Chrome API 调用重置空闲计时器
    await chrome.tabs.query({});

    // 调用自定义保活函数
    if (this.onKeepAlive) {
      await this.onKeepAlive();
    }
  }
}
```

### 3.2 使用

**文件**: `apps/plasmo-app/src/background/index.ts`

```typescript
import { KeepAliveManager } from "./managers/keep-alive-manager";
import { MimoEngineManager } from "./managers/mimo-engine-manager";

const mimoEngineManager = new MimoEngineManager();

// 创建 Keep-Alive Manager
const keepAliveManager = new KeepAliveManager(async () => {
  // 发送 WebSocket 心跳
  if (mimoEngineManager.isConnected()) {
    await mimoEngineManager.sendHeartbeat();
  }
});

// 启动
keepAliveManager.start();
mimoEngineManager.connect();
```

---

## 四、Lifecycle Manager

### 4.1 实现

**文件**: `apps/plasmo-app/src/background/managers/lifecycle-manager.ts`

```typescript
import { logger } from "@mimo/bus/logger";

export interface LifecycleAware {
  stop(): void | Promise<void>;
}

export class ServiceWorkerLifecycleManager {
  private suspendListener: (() => void) | null = null;
  private managers: Set<LifecycleAware> = new Set();

  register(): void {
    logger.info('[Lifecycle] Registering lifecycle handlers');

    // 注册 onSuspend 监听器
    this.suspendListener = () => this.onSuspend();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  unregister(): void {
    if (this.suspendListener) {
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
    }
  }

  addManager(manager: LifecycleAware): void {
    this.managers.add(manager);
  }

  removeManager(manager: LifecycleAware): void {
    this.managers.delete(manager);
  }

  private async onSuspend(): Promise<void> {
    logger.info('[Lifecycle] Service Worker suspending, cleaning up resources');

    // 1. 停止所有管理器
    for (const manager of this.managers) {
      try {
        await Promise.resolve(manager.stop());
      } catch (error) {
        logger.warn('[Lifecycle] Failed to stop manager', { error });
      }
    }

    // 2. 清理监听器
    this.unregister();

    logger.info('[Lifecycle] Cleanup complete');
  }
}
```

### 4.2 使用

**文件**: `apps/plasmo-app/src/background/index.ts`

```typescript
import { ServiceWorkerLifecycleManager } from "./managers/lifecycle-manager";
import { KeepAliveManager } from "./managers/keep-alive-manager";
import { MimoEngineManager } from "./managers/mimo-engine-manager";

// 创建管理器
const lifecycleManager = new ServiceWorkerLifecycleManager();
const keepAliveManager = new KeepAliveManager(/* ... */);
const mimoEngineManager = new MimoEngineManager(/* ... */);

// 注册到生命周期管理器
lifecycleManager.addManager(keepAliveManager);
lifecycleManager.addManager(mimoEngineManager);

// 注册生命周期监听器
lifecycleManager.register();

// 启动
keepAliveManager.start();
mimoEngineManager.connect();
```

---

## 五、MimoEngine Manager 增强

### 5.1 添加重连逻辑

**文件**: `apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`

```typescript
import { MimoEngine, BusEvent } from "@mimo/engine";
import { logger } from "@mimo/bus/logger";

export class MimoEngineManager implements LifecycleAware {
  private engine: MimoEngine | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY = 30000;  // 30秒

  async connect(): Promise<void> {
    if (this.engine?.isConnected()) {
      logger.warn('[MimoEngine] Already connected');
      return;
    }

    try {
      logger.info('[MimoEngine] Connecting to MimoBus');

      this.engine = new MimoEngine({
        busUrl: 'http://localhost:6007',
        namespace: '/mimo',
        clientType: 'extension',
        heartbeatInterval: 30000,  // 30秒
        autoReconnect: true,
      });

      // 监听连接事件
      this.engine.on(BusEvent.Connected, () => {
        logger.info('[MimoEngine] Connected');
        this.reconnectAttempts = 0;
      });

      this.engine.on(BusEvent.Disconnected, (data) => {
        logger.warn('[MimoEngine] Disconnected', { reason: data.reason });
        this.scheduleReconnect();
      });

      this.engine.on(BusEvent.Error, (data) => {
        logger.error('[MimoEngine] Error', { error: data.error });
        this.scheduleReconnect();
      });

      await this.engine.connect();

    } catch (error) {
      logger.error('[MimoEngine] Connection failed', { error });
      this.scheduleReconnect();
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;  // 已有重连任务
    }

    // 指数退避
    const delay = Math.min(
      1000 * Math.pow(1.5, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    logger.info('[MimoEngine] Scheduling reconnect', {
      attempt: this.reconnectAttempts + 1,
      delay
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      await this.connect();
    }, delay);
  }

  stop(): void {
    // 清理重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 断开连接
    if (this.engine) {
      this.engine.disconnect();
      this.engine = null;
    }
  }

  isConnected(): boolean {
    return this.engine?.isConnected() ?? false;
  }

  async sendHeartbeat(): Promise<void> {
    if (this.engine?.isConnected()) {
      // MimoEngine 内部会自动发送心跳
      // 这里只是确保连接活跃
      await this.engine.emit({ type: 'ping' });
    }
  }
}
```

---

## 六、State Manager（可选）

### 6.1 实现

**文件**: `apps/plasmo-app/src/background/managers/state-manager.ts`

```typescript
import { logger } from "@mimo/bus/logger";

export class StateManager {
  private readonly HEARTBEAT_KEY = 'mimo_sw_heartbeat';
  private readonly STATE_KEY = 'mimo_state';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  startHeartbeat(interval: number = 10000): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.updateHeartbeat();
    }, interval);

    // 立即更新一次
    this.updateHeartbeat();
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async updateHeartbeat(): Promise<void> {
    await chrome.storage.local.set({
      [this.HEARTBEAT_KEY]: Date.now()
    });
  }

  async isServiceWorkerRestart(): Promise<boolean> {
    const result = await chrome.storage.local.get(this.HEARTBEAT_KEY);
    const lastHeartbeat = result[this.HEARTBEAT_KEY];

    // 如果超过 30 秒无心跳，认为是重启
    const RESTART_THRESHOLD = 30000;
    return !lastHeartbeat || (Date.now() - lastHeartbeat) > RESTART_THRESHOLD;
  }

  async saveState(state: any): Promise<void> {
    await chrome.storage.local.set({
      [this.STATE_KEY]: {
        data: state,
        timestamp: Date.now()
      }
    });
  }

  async loadState(): Promise<any | null> {
    const result = await chrome.storage.local.get(this.STATE_KEY);
    const stored = result[this.STATE_KEY];

    if (!stored) return null;

    // 检查状态是否过期（5分钟）
    const AGE_LIMIT = 5 * 60 * 1000;
    if (Date.now() - stored.timestamp > AGE_LIMIT) {
      await chrome.storage.local.remove(this.STATE_KEY);
      return null;
    }

    return stored.data;
  }
}
```

---

## 七、集成到 background/index.ts

**文件**: `apps/plasmo-app/src/background/index.ts`

```typescript
import { ServiceWorkerLifecycleManager } from "./managers/lifecycle-manager";
import { KeepAliveManager } from "./managers/keep-alive-manager";
import { MimoEngineManager } from "./managers/mimo-engine-manager";
import { StateManager } from "./managers/state-manager";

// ==================== 初始化管理器 ====================

const lifecycleManager = new ServiceWorkerLifecycleManager();
const stateManager = new StateManager();
const mimoEngineManager = new MimoEngineManager();

// 创建 Keep-Alive Manager
const keepAliveManager = new KeepAliveManager(async () => {
  // 发送 WebSocket 心跳
  if (mimoEngineManager.isConnected()) {
    await mimoEngineManager.sendHeartbeat();
  }
});

// 注册到生命周期管理器
lifecycleManager.addManager(keepAliveManager);
lifecycleManager.addManager(mimoEngineManager);

// ==================== 启动 ====================

async function initialize() {
  // 1. 检查是否是 Service Worker 重启
  const isRestart = await stateManager.isServiceWorkerRestart();

  if (isRestart) {
    logger.info('[Background] Service Worker restarted, reconnecting...');
  }

  // 2. 注册生命周期监听器
  lifecycleManager.register();

  // 3. 启动心跳
  stateManager.startHeartbeat(10000);  // 10秒

  // 4. 启动保活轮询
  keepAliveManager.start();

  // 5. 连接到 MimoBus
  try {
    await mimoEngineManager.connect();
  } catch (error) {
    logger.error('[Background] Failed to connect to MimoBus', { error });
    // MimoEngineManager 会自动重连
  }

  logger.info('[Background] Initialization complete');
}

// 执行初始化
initialize().catch(error => {
  logger.error('[Background] Initialization failed', { error });
});

// ==================== 消息处理 ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('[Background] Received message', { type: message.type });

  // 处理消息...
  sendResponse({ ok: true });

  return true;  // 异步响应
});
```

---

## 八、测试验证

### 8.1 验证清单

| 测试项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| **连接稳定性** | 观察 30 分钟无活动 | 连接保持活跃 |
| **Service Worker 重启** | 关闭所有标签页后重新打开 | 自动重连 |
| **资源清理** | 观察 DevTools Memory | 无内存泄漏 |
| **心跳日志** | 检查服务器日志 | `avgHeartbeatInterval` > 0 |

### 8.2 日志检查

```bash
# 检查心跳是否正常
tail -f apps/nitro-app/.data/logs/mimo-bus-*.log | grep "heartbeat"

# 预期输出类似：
# {"level":"debug","time":"...","msg":"Heartbeat received","rtt":25}
```

---

## 九、配置建议

### 9.1 心跳配置

| 参数 | Manus | Mimo 建议 |
|------|-------|-----------|
| **保活轮询间隔** | 10秒 | 10秒 |
| **WebSocket 心跳间隔** | N/A | 30秒 |
| **心跳超时** | N/A | 90秒 |

### 9.2 超时配置

| 组件 | 超时时间 | 说明 |
|------|----------|------|
| **Service Worker** | 30秒 | Chrome 平台限制 |
| **CDP 会话** | 60秒 | Manus 的经验值 |
| **心跳超时** | 90秒 | 3x 心跳间隔 |
| **重连延迟** | 1-30秒 | 指数退避 |

---

## 十、总结

| 改进点 | 实现 |
|--------|------|
| **保持活跃** | Keep-Alive Manager 每 10 秒轮询 |
| **生命周期** | Lifecycle Manager 管理 onSuspend |
| **自动重连** | MimoEngineManager 指数退避重连 |
| **状态检测** | StateManager 检测重启 |

---

*实施时间: 2026-01-28*
*参考: Manus Chrome Extension v0.0.47*
