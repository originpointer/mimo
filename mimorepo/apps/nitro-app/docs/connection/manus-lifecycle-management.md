# Manus 生命周期管理模式

> 基于 Manus Chrome Extension v0.0.47 逆向工程

---

## 一、Service Worker 生命周期

### 1.1 生命周期阶段

```
┌──────────────┐     活动事件     ┌──────────────┐
│   启动       │  ────────────>  │   活跃       │
│  (Startup)   │                 │   (Active)   │
└──────────────┘                 └──────────────┘
       ▲                                │
       │                                │ 30秒无活动
       │                                ▼
┌──────────────┐                 ┌──────────────┐
│   重启       │ <─────────────  │   空闲       │
│  (Restart)   │    需要时       │   (Idle)     │
└──────────────┘                 └──────────────┘
                                        │
                                        │ 终止
                                        ▼
                                  ┌──────────────┐
                                  │   挂起       │
                                  │  (Suspend)   │
                                  └──────────────┘
```

### 1.2 关键事件

| 事件 | 触发时机 | 用途 |
|------|----------|------|
| `chrome.runtime.onStartup` | 浏览器启动、扩展安装 | 初始化资源 |
| `chrome.runtime.onSuspend` | Service Worker 即将终止 | 清理资源 |
| 消息事件 | 收到消息 | 唤醒 Service Worker |

---

## 二、Manus 的生命周期管理

### 2.1 onSuspend 监听器

```javascript
class ManusAppHelper {
  constructor() {
    this.suspendListener = null;
    this.pollTimer = null;
  }

  registerManusAppPolling() {
    // 注册 onSuspend 监听器
    this.suspendListener = () => this.unregisterListeners();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  unregisterListeners() {
    // 1. 移除 onSuspend 监听器
    this.suspendListener &&
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
    this.suspendListener = null;

    // 2. 清理轮询定时器
    this.pollTimer &&
      (clearInterval(this.pollTimer), this.pollTimer = null);
  }
}
```

### 2.2 CDP 会话超时管理

```javascript
const CDP_TIMEOUT = 60 * 1000;  // 60秒

function manageCdpSession(tabId, session) {
  // 清理旧的定时器
  session.detachTimer && clearTimeout(session.detachTimer);

  // 设置新的超时定时器
  session.detachTimer = setTimeout(() => {
    logger.info(`CDP session timeout for tab ${tabId}`);

    // 断开 CDP 连接
    detachDebugSession(session.target).catch(error => {
      logger.warn(`Failed to detach CDP`, { error });
    });

    // 从会话映射中删除
    sessions.delete(tabId);
  }, CDP_TIMEOUT);
}
```

### 2.3 资源管理架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Manus 资源管理架构                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Service Worker 启动                                            ││
│  │    ├── 初始化各个 Manager                                       ││
│  │    ├── 注册 onSuspend 监听器                                     ││
│  │    └── 启动轮询定时器                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  活跃状态 (Active)                                              ││
│  │    ├── 轮询定时器运行（每10秒）                                  ││
│  │    ├── CDP 会话活跃                                              ││
│  │    └── 定时器监控（60秒超时）                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  即将挂起 (onSuspend)                                           ││
│  │    ├── 停止轮询定时器                                            ││
│  │    ├── 移除所有监听器                                            ││
│  │    └── 清理资源引用                                              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Service Worker 终止                                            ││
│  │    → 内存清空                                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Service Worker 重启                                            ││
│  │    ├── 重新执行初始化代码                                        ││
│  │    └── 重建所有状态                                              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、资源清理模式

### 3.1 定时器清理

```javascript
// ❌ 错误：没有清理
class BadExample {
  start() {
    setInterval(() => {
      // do something
    }, 1000);
  }
}

// ✅ 正确：清理定时器
class GoodExample {
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    this.stop();  // 先清理旧的
    this.timer = setInterval(() => {
      // do something
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
```

### 3.2 监听器清理

```javascript
// ❌ 错误：没有清理
class BadExample {
  init() {
    chrome.runtime.onSuspend.addListener(() => {
      // cleanup
    });
  }
}

// ✅ 正确：清理监听器
class GoodExample {
  private suspendListener: (() => void) | null = null;

  init() {
    this.cleanup();  // 先清理旧的

    this.suspendListener = () => this.cleanup();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  cleanup() {
    if (this.suspendListener) {
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
    }
  }
}
```

### 3.3 外部资源清理

```javascript
// CDP 会话清理
async function cleanupCdpSession(tabId: number) {
  const session = sessions.get(tabId);

  if (session) {
    // 清理定时器
    if (session.detachTimer) {
      clearTimeout(session.detachTimer);
    }

    // 断开 CDP 连接
    await detachDebugSession(session.target);

    // 从映射中删除
    sessions.delete(tabId);
  }
}
```

---

## 四、状态重建模式

### 4.1 无状态设计

Manus 采用 **无状态设计**：Service Worker 重启后，所有状态重新初始化。

```javascript
// 每次启动都是新的状态
let sessions = new Map();  // 内存中的会话映射

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 每次都是新的处理，不依赖之前的状态
  handleMessage(message, sender);
});
```

### 4.2 标签页会话重建

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  // 标签页被移除时清理会话
  handleTabRemoved(tabId) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.tabId === tabId) {
        this.cleanupSession(sessionId);
      }
    }
  }

  // 窗口被移除时清理会话
  handleWindowRemoved(windowId) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.windowId === windowId) {
        this.cleanupSession(sessionId);
      }
    }
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // 停止动画
      if (session.animationInterval) {
        clearInterval(session.animationInterval);
      }
      // 标记为已清理
      session.disposed = true;
      // 删除会话
      this.sessions.delete(sessionId);
    }
  }
}
```

### 4.3 CDP 会话持久化

```javascript
// CDP 会话在 Service Worker 重启后会重新建立
async function getCdpSession(tabId) {
  // 先检查是否有缓存的会话
  let session = cdpSessions.get(tabId);

  if (session) {
    // 更新最后使用时间
    session.lastUsed = Date.now();
    return session;
  }

  // 创建新的 CDP 会话
  logger.info(`Creating new CDP session for tab ${tabId}`);
  const target = await attachDebugger(tabId);
  session = {
    target,
    session: createSession(target),
    viewport: await initViewport(target),
    lastUsed: Date.now(),
    detachTimer: null
  };

  // 设置超时清理
  setupDetachTimer(tabId, session);

  // 缓存会话
  cdpSessions.set(tabId, session);

  return session;
}
```

---

## 五、在 Mimo 中的实现

### 5.1 生命周期管理器

```typescript
class ServiceWorkerLifecycleManager {
  private suspendListener: (() => void) | null = null;
  private managers: Array<{ stop: () => void }> = [];

  register() {
    // 注册 onSuspend 监听器
    this.suspendListener = () => this.onSuspend();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  unregister() {
    // 移除监听器
    if (this.suspendListener) {
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
    }

    // 停止所有管理器
    for (const manager of this.managers) {
      manager.stop();
    }
    this.managers = [];
  }

  addManager(manager: { stop: () => void }) {
    this.managers.push(manager);
  }

  private onSuspend() {
    logger.info('Service Worker suspending, cleaning up resources');

    // 1. 停止轮询
    for (const manager of this.managers) {
      manager.stop();
    }

    // 2. 断开 WebSocket 连接
    if (this.mimoEngine) {
      this.mimoEngine.disconnect();
    }

    // 3. 清理 CDP 会话
    for (const [tabId, session] of this.cdpSessions) {
      this.detachCdpSession(tabId);
    }

    logger.info('Cleanup complete');
  }
}
```

### 5.2 状态持久化

```typescript
class StateManager {
  private readonly STORAGE_KEY = 'mimo_state';

  async saveState(state: any) {
    await chrome.storage.local.set({
      [this.STORAGE_KEY]: {
        data: state,
        timestamp: Date.now()
      }
    });
  }

  async loadState(): Promise<any | null> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    const stored = result[this.STORAGE_KEY];

    if (!stored) return null;

    // 检查状态是否过期（5分钟）
    const AGE_LIMIT = 5 * 60 * 1000;
    if (Date.now() - stored.timestamp > AGE_LIMIT) {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      return null;
    }

    return stored.data;
  }

  async clearState() {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  }
}
```

### 5.3 重连检测

```typescript
class ReconnectionDetector {
  private readonly HEARTBEAT_KEY = 'mimo_heartbeat';
  private readonly HEARTBEAT_INTERVAL = 10000;  // 10秒

  async isRestart(): Promise<boolean> {
    const result = await chrome.storage.local.get(this.HEARTBEAT_KEY);
    const lastHeartbeat = result[this.HEARTBEAT_KEY];

    const now = Date.now();

    // 如果超过 30 秒无心跳，认为是重启
    return !lastHeartbeat || (now - lastHeartbeat) > 30000;
  }

  async updateHeartbeat() {
    await chrome.storage.local.set({
      [this.HEARTBEAT_KEY]: Date.now()
    });
  }

  async startHeartbeat() {
    setInterval(() => {
      this.updateHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }
}
```

---

## 六、最佳实践总结

| 实践 | 说明 |
|------|------|
| **主动清理** | 在 `onSuspend` 中主动清理所有资源 |
| **定时器管理** | 保存定时器引用，清理时清除 |
| **监听器管理** | 保存监听器引用，清理时移除 |
| **无状态设计** | 重启后重建状态，不依赖持久连接 |
| **超时保护** | 为外部资源设置超时，防止泄漏 |
| **优雅降级** | 资源清理失败时不影响终止流程 |

---

*分析时间: 2026-01-28*
*源文件: `.reverse/manus-reverse/sources/0.0.47_0/background.ts.js`*
