# Chrome Extension Service Worker WebSocket 断联问题分析

> 基于日志分析 `mimo-bus-2026-01-28.log` 和 Chrome Extension 官方文档

---

## 一、日志分析：断联与重连模式

### 1.1 连接数据统计

| 连接次数 | 连接时间 | 断开时间 | 持续时长 | 断开原因 |
|---------|----------|----------|----------|----------|
| 第1次 | 07:07:26 | 07:10:36 | **约 190 秒 (3分10秒)** | Client timeout |
| 第2次 | 07:23:18 | 07:40:43 | **约 1,045 秒 (17分25秒)** | Client timeout |
| 第2次断开后 | - | - | **无自动重连** | - |

### 1.2 关键日志证据

```json
// 第1次连接
{"time":"2026-01-28T07:07:26.539Z", "event":"client:connect", "msg":"Client connected"}
{"time":"2026-01-28T07:10:36.039Z", "msg":"Client timeout - disconnecting"}
{"time":"2026-01-28T07:10:36.041Z", "event":"client:disconnect", "reason":"server namespace disconnect"}

// 第2次连接
{"time":"2026-01-28T07:23:18.099Z", "event":"client:connect", "msg":"Client connected"}
{"time":"2026-01-28T07:40:43.043Z", "msg":"Client timeout - disconnecting"}
{"time":"2026-01-28T07:40:43.043Z", "event":"client:disconnect", "reason":"server namespace disconnect"}
```

### 1.3 关键发现

1. **`avgHeartbeatInterval: 0`** - 服务器从未收到应用层心跳
2. **断开原因一致** - `"Client timeout - disconnecting"`（服务端超时）
3. **持续时长差异大** - 3分钟 vs 17分钟（取决于Service Worker重启时机）
4. **无自动重连** - 第2次断开后未观察到自动重连

---

## 二、根本原因：Chrome Extension Service Worker 生命周期

### 2.1 Service Worker 行为特征

Chrome Manifest V3 的 Background Service Worker 具有以下特征：

| 特性 | 值 | 说明 |
|------|-----|------|
| **空闲超时** | ~30 秒 | 无活动后 Service Worker 被终止 |
| **重启触发** | 事件驱动 | 收到消息/事件时重新启动 |
| **内存状态** | 每次清空 | 重启后所有内存变量重新初始化 |
| **WebSocket** | 随之中断 | Service Worker 终止时连接被销毁 |

### 2.2 事件流程图

```
时间轴:
─────────────────────────────────────────────────────────────────────────────

07:07:26  ┌─────────────────────────────────────────────────────────────┐
          │ Extension 连接到服务器                                      │
          │ Service Worker 处于活动状态                                  │
          └─────────────────────────────────────────────────────────────┘
                        │
                        ▼
07:07:56  ┌─────────────────────────────────────────────────────────────┐
          │ Service Worker 空闲 ~30 秒                                   │
          │ → Chrome 终止 Service Worker                                 │
          │ → Socket.IO 连接在内存中被销毁                               │
          │ → WebSocket 连接中断（TCP层关闭）                            │
          └─────────────────────────────────────────────────────────────┘
                        │
                        ▼
07:08:xx  ┌─────────────────────────────────────────────────────────────┐
          │ 某个事件触发 Service Worker 重启                             │
          │ → background/index.ts 重新执行                               │
          │ → 创建新的 MimoEngine 实例                                   │
          │ → Socket.IO 自动重连机制触发                                 │
          └─────────────────────────────────────────────────────────────┘
                        │
                        ▼
07:10:36  ┌─────────────────────────────────────────────────────────────┐
          │ 服务器检测到连接无响应                                       │
          │ → 超时断开客户端                                            │
          └─────────────────────────────────────────────────────────────┘
```

---

## 三、代码层面分析

### 3.1 当前心跳机制

**文件**: [`packages/@mimo/engine/src/mimo-engine.ts`](packages/@mimo/engine/src/mimo-engine.ts#L308-L337)

```typescript
private startHeartbeat(): void {
  this.heartbeatTimer = setInterval(() => {
    if (!this.socket.connected) return;  // ← 问题：Service Worker 重启后定时器失效

    const ping: HeartbeatPing = {
      socketId: this.socket.id || '',
      timestamp: Date.now(),
      status: 'active',
    };

    this.socket.emit(ProtocolEvent.HeartbeatPing, ping);
    this.heartbeatMissedCount++;
  }, this.config.heartbeatInterval);  // 30000ms
}
```

**问题**:
- `setInterval` 定时器在 Service Worker 终止时被清除
- 重启后需要重新调用 `startHeartbeat()`，但可能未正确触发

### 3.2 服务器端配置

**文件**: [`packages/@mimo/bus/src/server.ts`](packages/@mimo/bus/src/server.ts#L60-L63)

```typescript
const io = new SocketIOServer(httpServer, {
  cors: serverConfig.cors,
  path: serverConfig.path,
  // 未显式配置 pingTimeout/pingInterval，使用默认值
});
```

**Socket.IO 默认配置**:
| 配置项 | 默认值 | 作用 |
|--------|--------|------|
| `pingInterval` | 25,000 ms | 服务器每25秒发送一次 ping |
| `pingTimeout` | 60,000 ms | 60秒内未收到 pong 则断开 |

### 3.3 缺少 Service Worker 生命周期处理

**文件**: [`apps/plasmo-app/src/background/index.ts`](apps/plasmo-app/src/background/index.ts)

当前代码未实现以下生命周期钩子：

| 钩子 | 用途 |
|------|------|
| `chrome.runtime.onSuspend` | Service Worker 终止前清理 |
| `chrome.runtime.onStartup` | 浏览器启动时重连 |
| `chrome.idle.onStateChanged` | 检测空闲状态 |

---

## 四、配置总览

| 组件 | 配置项 | 值 | 影响 |
|------|--------|-----|------|
| **Chrome Service Worker** | 空闲超时 | ~30秒 | **主要断联原因** |
| **Socket.IO (服务器)** | pingInterval | 25秒 (默认) | 服务器发送 ping 频率 |
| **Socket.IO (服务器)** | pingTimeout | 60秒 (默认) | 服务器超时断开 |
| **应用层心跳** | 心跳间隔 | 30秒 | 客户端发送心跳频率 |
| **心跳监控器** | staleThreshold | 90秒 | 服务器标记陈旧客户端 |
| **重连管理器** | 初始延迟 | 1秒 | 指数退避起始值 |
| **重连管理器** | 最大延迟 | 30秒 | 指数退避上限 |

---

## 五、官方文档引用

### 5.1 Chrome 官方文档

1. **[Extension Service Worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)**
   > "Active WebSocket connections now extend extension service worker lifetimes. Sending or receiving messages across a WebSocket in an extension prevents the service worker from being terminated."

   **关键点**: 需要在30秒窗口内有 WebSocket 消息交换才能保持 Service Worker 活跃。

2. **[Use WebSockets in service workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets)**
   > From Chrome 116 onwards, you can keep a service worker with a WebSocket connection active by exchanging messages within the 30-second service worker timeout window.

### 5.2 Chromium Issues

1. **[Issue #40733525 - ServiceWorker 5分钟关闭问题](https://issues.chromium.org/40733525)**
   > "When status is inactive, websocket connection is lost. While lost websocket connection, my extension cannot receive real-time information."

2. **[Issue #40266763 - Offscreen Document 支持](https://issues.chromium.org/40266763)**
   建议使用 Offscreen Document 来维持持久连接。

### 5.3 社区讨论

- [StackOverflow: Maintaining persistent connection in MV3](https://stackoverflow.com/questions/68966727/maintaining-a-persitant-connection-in-a-mv3-chrome-extension)
- [Gist: Keep MV3 service workers alive](https://gist.github.com/sunnyguan/f94058f66fab89e59e75b1ac1bf1a06e)

---

## 六、解决方向建议

### 方案1: 确保30秒内活动

在 WebSocket 上保持定期消息交换（心跳间隔应 < 30秒）。

### 方案2: 使用 Offscreen Document

将 WebSocket 连接移到 Offscreen Document 中，不受 Service Worker 生命周期限制。

### 方案3: Native Messaging Port

使用原生消息端口（可保持 Service Worker 活跃）。

### 方案4: 添加生命周期处理

实现 `onSuspend` / `onStartup` 钩子，主动管理连接生命周期。

---

## 七、相关文件

| 文件 | 作用 |
|------|------|
| [`apps/plasmo-app/src/background/index.ts`](apps/plasmo-app/src/background/index.ts) | 后台 Service Worker 入口 |
| [`apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`](apps/plasmo-app/src/background/managers/mimo-engine-manager.ts) | MimoEngine 连接管理 |
| [`packages/@mimo/engine/src/mimo-engine.ts`](packages/@mimo/engine/src/mimo-engine.ts) | Socket.IO 客户端实现 |
| [`packages/@mimo/engine/src/reconnection-manager.ts`](packages/@mimo/engine/src/reconnection-manager.ts) | 重连管理器 |
| [`packages/@mimo/bus/src/server.ts`](packages/@mimo/bus/src/server.ts) | Socket.IO 服务器 |
| [`packages/@mimo/bus/src/heartbeat-monitor.ts`](packages/@mimo/bus/src/heartbeat-monitor.ts) | 心跳监控器 |

---

## 八、总结

1. **断联频率**: 不固定，取决于 Service Worker 空闲时间（通常30秒后终止）
2. **重连时机**: 取决于事件触发 Service Worker 重启
3. **根本原因**: Chrome Extension Manifest V3 的 Service Worker 30秒空闲超时机制
4. **当前状态**: 心跳机制未正常工作（`avgHeartbeatInterval: 0`）
5. **解决方向**: 确保持续 WebSocket 活动或使用 Offscreen Document

---

*生成时间: 2026-01-28*
*日志文件: `apps/nitro-app/.data/logs/mimo-bus-2026-01-28.log`*

---

## 九、Manus 扩展的解决方案分析

基于对 Manus Chrome Extension (v0.0.47) 逆向工程的分析，以下是 Manus 如何处理 Service Worker 生命周期问题的。

### 9.1 核心策略：轮询保活 + onSuspend 清理

**关键文件**: `.reverse/manus-reverse/sources/0.0.47_0/background.ts.js`

Manus **不使用 WebSocket**，而是采用以下策略：

| 策略 | 实现 | 作用 |
|------|------|------|
| **定期轮询** | 每 10 秒向 Manus app 标签页发送消息 | 保持 Service Worker 活跃 |
| **onSuspend 监听** | 注册 `chrome.runtime.onSuspend` | Service Worker 终止前清理资源 |
| **CDP 会话管理** | 60 秒超时自动清理 CDP 会话 | 防止资源泄漏 |

### 9.2 ManusAppHelper 轮询机制

**代码位置**: `background.ts.js` (大约在第 1-100 行)

```javascript
class ManusAppHelper {
  constructor() {
    this.suspendListener = null;
    this.pollTimer = null;
  }

  registerManusAppPolling() {
    this.unregisterListeners();

    // 通知 Manus app 标签页
    this.notifyManusAppTabs();

    // 每 10 秒轮询一次 - 保持 Service Worker 活跃
    this.pollTimer = setInterval(() => {
      this.notifyManusAppTabs();
    }, On);  // On = 10000ms (10秒)

    // 注册 onSuspend 监听器
    this.suspendListener = () => this.unregisterListeners();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  async notifyManusAppTabs() {
    const tabs = (await chrome.tabs.query({})).filter(tab => {
      if (!tab.url || !tab.id) return true;
      try {
        return isValidOrigin(new URL(tab.url).origin);
      } catch {
        return false;
      }
    });

    if (tabs.length === 0) return;

    const [clientId, browserSettings] = await Promise.all([
      getClientId(),
      Promise.resolve(getBrowserSettings())
    ]);

    for (const tab of tabs) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          window.postMessage({
            source: "my-browser",
            type: "extension/ready",
            data: data
          }, "*");
        },
        args: [{
          clientId,
          browserSettings,
          eventTimestamp: Date.now()
        }]
      });
    }
  }
}
```

**关键点**:
- **轮询间隔**: 10 秒 (< 30 秒 Service Worker 超时)
- **执行脚本**: 使用 `chrome.scripting.executeScript` 向 Manus app 页面注入消息
- **跨窗口通信**: 通过 `window.postMessage` 与 web app 通信

### 9.3 CDP 会话超时管理

**代码位置**: `background.ts.js` (大约在第 100-250 行)

```javascript
const yn = 60 * 1000;  // 60秒 CDP 会话超时

function ht(r, e) {
  // 设置 detachTimer，60秒无活动后自动清理 CDP 会话
  e.detachTimer && clearTimeout(e.detachTimer);
  e.detachTimer = setTimeout(() => {
    logger.info(`Detaching CDP session after inactivity timeout for tab ${r}`);
    detachDebugSession(e.target).catch(error => {
      logger.warn(`Failed to detach CDP session for tab ${r}`, { error });
    });
    sessions.delete(r);
  }, yn);  // 60秒
}
```

**关键点**:
- **超时时间**: 60 秒
- **自动清理**: 定时器到期后自动断开 CDP 连接
- **内存管理**: 防止 CDP 会话泄漏

### 9.4 onSuspend 生命周期处理

```javascript
// ManusAppHelper 中
this.suspendListener = () => this.unregisterListeners();
chrome.runtime.onSuspend.addListener(this.suspendListener);

unregisterListeners() {
  // 清理 onSuspend 监听器
  this.suspendListener && chrome.runtime.onSuspend.removeListener(this.suspendListener);
  this.suspendListener = null;

  // 清理轮询定时器
  this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
}
```

**关键点**:
- **主动清理**: Service Worker 终止前清理定时器和监听器
- **防止泄漏**: 避免定时器在重启后累积
- **优雅关闭**: 确保资源正确释放

### 9.5 架构对比：Manus vs Mimo

| 方面 | Manus 方案 | Mimo 当前方案 |
|------|-----------|--------------|
| **通信方式** | HTTP + `chrome.scripting.executeScript` | WebSocket (Socket.IO) |
| **保活机制** | 10 秒定期轮询 | 30 秒心跳（Service Worker 终止后失效） |
| **生命周期处理** | 实现 `onSuspend` | 无 |
| **超时管理** | CDP 60 秒自动清理 | 心跳 90 秒超时 |
| **状态持久化** | 无（每次重启重建） | 无（每次重启重建） |

### 9.6 Manus 方案的优势

1. **简单可靠**: 使用 Chrome Extension API 的内置机制，不依赖 WebSocket
2. **保活有效**: 10 秒轮询 < 30 秒 Service Worker 超时，确保持续活跃
3. **资源可控**: CDP 会话 60 秒自动清理，防止泄漏
4. **优雅关闭**: `onSuspend` 确保资源正确释放

### 9.7 可借鉴的设计模式

#### 模式 1: 轮询保活

```typescript
class ServiceWorkerKeepAlive {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL = 10000;  // 10秒

  start() {
    this.stop();
    this.pollTimer = setInterval(() => {
      this.performKeepAliveActivity();
    }, this.POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async performKeepAliveActivity() {
    // 执行任何 Chrome Extension API 调用
    // 例如: chrome.tabs.query, chrome.storage.get, etc.
    await chrome.tabs.query({});
  }
}
```

#### 模式 2: 生命周期管理

```typescript
class ServiceWorkerLifecycleManager {
  private suspendListener: (() => void) | null = null;

  register() {
    this.suspendListener = () => this.onSuspend();
    chrome.runtime.onSuspend.addListener(this.suspendListener);
  }

  unregister() {
    if (this.suspendListener) {
      chrome.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
    }
  }

  private onSuspend() {
    // 清理所有资源
    // 1. 停止定时器
    // 2. 断开连接
    // 3. 保存状态（可选）
  }
}
```

#### 模式 3: 状态重建

```typescript
class ReconnectionManager {
  async onServiceWorkerRestart() {
    // 检测 Service Worker 是否刚重启
    const isNewInstance = await this.checkIfNewInstance();

    if (isNewInstance) {
      // 重建连接
      await this.reconnect();
    }
  }

  private async checkIfNewInstance(): Promise<boolean> {
    // 使用 chrome.storage 检测重启
    const { lastHeartbeat } = await chrome.storage.local.get('lastHeartbeat');
    const now = Date.now();

    // 如果超过 60 秒无心跳，认为是新实例
    return !lastHeartbeat || (now - lastHeartbeat) > 60000;
  }
}
```

### 9.8 总结：Manus 的核心设计思想

1. **不与平台对抗**: 不尝试维持持久 WebSocket 连接，而是接受 Service Worker 生命周期限制
2. **定期活动**: 通过 10 秒轮询保持 Service Worker 活跃
3. **无状态设计**: 每次 Service Worker 重启后重建状态，不依赖持久连接
4. **主动清理**: 使用 `onSuspend` 优雅地清理资源

**关键启示**: 在 Chrome Extension Manifest V3 环境中，**接受并适配 Service Worker 生命周期**，比尝试绕过它更可靠。

---

## 十、参考文献

### 10.1 Chrome 官方文档

- [Extension Service Worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Use WebSockets in service workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets)
- [chrome.runtime.onSuspend](https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onSuspend)

### 10.2 Chromium Issues

- [Issue #40733525 - ServiceWorker 5分钟关闭问题](https://issues.chromium.org/40733525)
- [Issue #40266763 - Offscreen Document 支持](https://issues.chromium.org/40266763)

### 10.3 社区资源

- [StackOverflow: Maintaining persistent connection in MV3](https://stackoverflow.com/questions/68966727/maintaining-a-persitant-connection-in-a-mv3-chrome-extension)
- [Gist: Keep MV3 service workers alive](https://gist.github.com/sunnyguan/f94058f66fab89e59e75b1ac1bf1a06e)

### 10.4 Manus Extension 分析

- **版本**: 0.0.47
- **分析时间**: 2026-01-28
- **源文件**: `.reverse/manus-reverse/sources/0.0.47_0/background.ts.js`
