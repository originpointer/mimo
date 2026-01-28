# Manus Keep-Alive 策略分析

> 基于 Manus Chrome Extension v0.0.47 逆向工程

---

## 一、核心问题

Chrome Extension Manifest V3 的 Service Worker 具有 **30 秒空闲超时** 限制，导致：

1. WebSocket 连接被终止
2. 内存状态丢失
3. 定时器被清除
4. 需要等待事件触发才能重启

---

## 二、Manus 的解决方案

### 策略概述

Manus **不使用 WebSocket 持久连接**，而是采用 **轮询保活** 策略：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Manus Keep-Alive 架构                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Background Service Worker                                       ││
│  │                                                                   ││
│  │  ┌───────────────────────────────────────────────────────────┐  ││
│  │  │  ManusAppHelper                                           │  ││
│  │  │                                                            │  ││
│  │  │  registerManusAppPolling()                                │  ││
│  │  │    ├── notifyManusAppTabs()  [立即执行]                   │  ││
│  │  │    └── setInterval(notifyManusAppTabs, 10000)  [每10秒]   │  ││
│  │  │                                                            │  ││
│  │  └───────────────────────────────────────────────────────────┘  ││
│  │                              │                                  ││
│  │                              ▼                                  ││
│  │  ┌───────────────────────────────────────────────────────────┐  ││
│  │  │  notifyManusAppTabs()                                      │  ││
│  │  │    1. chrome.tabs.query()  ← Chrome API 调用              │  ││
│  │  │    2. chrome.scripting.executeScript()  ← Chrome API 调用  │  ││
│  │  │    3. window.postMessage()  ← 向 web app 发送消息          │  ││
│  │  └───────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 关键代码

```javascript
class ManusAppHelper {
  constructor() {
    this.suspendListener = null;
    this.pollTimer = null;
  }

  registerManusAppPolling() {
    this.unregisterListeners();

    // 立即执行一次
    this.notifyManusAppTabs();

    // 每 10 秒轮询一次
    this.pollTimer = setInterval(() => {
      this.notifyManusAppTabs();
    }, 10000);  // 10秒 < 30秒 Service Worker 超时

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
        args: [{ clientId, browserSettings, eventTimestamp: Date.now() }]
      });
    }
  }

  unregisterListeners() {
    this.suspendListener && chrome.runtime.onSuspend.removeListener(this.suspendListener);
    this.suspendListener = null;
    this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
  }
}
```

---

## 三、策略详解

### 3.1 轮询间隔选择

| 间隔 | 值 | 原因 |
|------|-----|------|
| **Service Worker 超时** | ~30 秒 | Chrome 平台限制 |
| **轮询间隔** | 10 秒 | < 30 秒，确保持续活跃 |
| **安全系数** | 3x | 30 / 10 = 3，足够容错 |

### 3.2 Chrome API 调用

轮询函数中的 Chrome API 调用会重置 Service Worker 的空闲计时器：

| API 调用 | 作用 |
|----------|------|
| `chrome.tabs.query({})` | 查询所有标签页 |
| `chrome.scripting.executeScript()` | 向标签页注入脚本 |

**关键点**: 任何 Chrome Extension API 调用都会重置空闲计时器。

### 3.3 消息传递机制

```
┌─────────────────┐         chrome.scripting         ┌─────────────────┐
│ Service Worker  │ ───────────────────────────────> │   Web App Tab   │
│                 │    .executeScript()             │                 │
└─────────────────┘                                  └─────────────────┘
       │                                                    │
       │ window.postMessage()                               │
       └────────────────────────────────────────────────────┘
```

---

## 四、为什么 10 秒轮询有效？

### Service Worker 空闲检测

```javascript
// Chrome 内部逻辑（伪代码）
let idleTime = 0;
const IDLE_TIMEOUT = 30000;  // 30秒

setInterval(() => {
  const hasActivity = checkChromeApiCalls();

  if (hasActivity) {
    idleTime = 0;  // 重置空闲计时器
  } else {
    idleTime += 1000;  // 增加 1 秒
  }

  if (idleTime >= IDLE_TIMEOUT) {
    terminateServiceWorker();  // 终止 Service Worker
  }
}, 1000);
```

### 轮询与超时的关系

```
时间轴:
0s     10s    20s    30s    40s    50s
│      │      │      │      │      │
├──────┤      ├──────┤      ├──────┤
  轮询          轮询          轮询
       ←── 10秒 ──→

每次轮询重置空闲计时器，Service Worker 永远不会达到 30 秒空闲状态
```

---

## 五、适用场景分析

### ✅ 轮询策略适用的场景

| 场景 | 原因 |
|------|------|
| **Web App 通信** | 有标签页可以接收消息 |
| **低频操作** | 10 秒延迟可接受 |
| **状态同步** | 不需要实时响应 |
| **简单可靠** | 不依赖复杂的状态管理 |

### ❌ 轮询策略不适用的场景

| 场景 | 原因 |
|------|------|
| **实时通信** | 10 秒延迟太高 |
| **服务器推送** | 需要服务器主动发送消息 |
| **高频操作** | 轮询开销太大 |
| **无标签页** | 没有标签页可以轮询 |

---

## 六、在 Mimo 中的实现建议

### 方案 A: 保持 WebSocket + 轮询保活

```typescript
class WebSocketKeepAlive {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL = 10000;  // 10秒

  constructor(private mimoEngine: MimoEngine) {}

  start() {
    this.stop();
    this.pollTimer = setInterval(async () => {
      // 执行 Chrome API 调用重置空闲计时器
      await chrome.tabs.query({});

      // 同时发送 WebSocket 心跳
      if (this.mimoEngine.isConnected()) {
        this.mimoEngine.sendHeartbeat();
      }
    }, this.POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
```

### 方案 B: 放弃 WebSocket，使用轮询 + HTTP

```typescript
class HttpPollingManager {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL = 10000;  // 10秒

  async poll() {
    // 1. 执行 Chrome API 调用（保活）
    await chrome.tabs.query({});

    // 2. HTTP 轮询获取消息
    const messages = await fetch('http://localhost:6007/api/messages')
      .then(r => r.json());

    // 3. 处理消息
    for (const message of messages) {
      await this.handleMessage(message);
    }
  }

  start() {
    this.stop();
    this.pollTimer = setInterval(() => this.poll(), this.POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
```

### 方案 C: 混合方案（推荐）

```typescript
class HybridConnectionManager {
  private keepAlive: WebSocketKeepAlive;
  private httpFallback: HttpPollingManager;
  private useWebSocket = true;

  async init() {
    // 尝试建立 WebSocket 连接
    try {
      await this.mimoEngine.connect();
      this.keepAlive = new WebSocketKeepAlive(this.mimoEngine);
      this.keepAlive.start();
      this.useWebSocket = true;
    } catch (error) {
      // WebSocket 失败，回退到 HTTP 轮询
      this.httpFallback = new HttpPollingManager();
      this.httpFallback.start();
      this.useWebSocket = false;
    }
  }

  async sendMessage(message: any) {
    if (this.useWebSocket) {
      await this.mimoEngine.send(message);
    } else {
      await fetch('http://localhost:6007/api/send', {
        method: 'POST',
        body: JSON.stringify(message)
      });
    }
  }
}
```

---

## 七、总结

| 要点 | 说明 |
|------|------|
| **核心思想** | 接受 Service Worker 生命周期限制，不尝试绕过 |
| **保活机制** | 10 秒轮询 < 30 秒超时，确保持续活跃 |
| **关键 API** | `chrome.tabs.query()`, `chrome.scripting.executeScript()` |
| **状态管理** | 无状态设计，重启后重建 |
| **资源清理** | 使用 `onSuspend` 优雅清理 |

**关键启示**: 在 MV3 环境中，**适配平台限制**比对抗它更可靠。

---

*分析时间: 2026-01-28*
*源文件: `.reverse/manus-reverse/sources/0.0.47_0/background.ts.js`*
