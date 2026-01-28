# Mimo 插件与 Manus Chrome Operator 后端连接优化分析

> 基于对 Manus Chrome Operator (v0.0.47) 逆向工程分析和当前 mimo 项目的代码审查
>
> 分析日期: 2026-01-28

---

## 目录

- [架构对比](#架构对比)
- [关键差异与优化点](#关键差异与优化点)
- [优化优先级](#优化优先级)
- [实现指南](#实现指南)
- [验证方案](#验证方案)

---

## 架构对比

### Manus Chrome Operator 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Manus Chrome Operator 架构                        │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     chrome.runtime      ┌──────────────┐
    │   Sidepanel  │ ◄────────────────────►  │  Background  │
    │   (React)    │      sendMessage        │   Worker     │
    │              │                          │              │
    │ - 任务控制   │                          │ - AuthHelper │
    │ - 状态显示   │                          │ - SessionMgr │
    └──────────────┘                          │ - WebSocket  │
                                              └──────┬───────┘
                                                     │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                              ▼                        ▼                        ▼
                    ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
                    │  AuthHelper   │        │  SessionMgr   │        │   WebSocket   │
                    │ (Cookie同步)  │        │  (会话管理)   │        │  (直接连接)   │
                    └───────────────┘        └───────────────┘        └───────┬───────┘
                      │      │                                                │
                      │      │                                         wss://api.manus.im
                      ▼      ▼
            chrome.cookies    chrome.storage.local
               (session_id)    (manus_extension_token)
```

### 当前 Mimo 项目架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Mimo 项目架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     chrome.runtime      ┌──────────────────────┐
    │   Tabs/Popup │ ◄────────────────────►  │   Background         │
    │   (React)    │      sendMessage        │   (StagehandXPATHMgr)│
    │              │                          │                      │
    └──────────────┘                          │ - MimoEngine         │
                                              │ - HTTP Client        │
                                              └──────────┬───────────┘
                                                         │
                              ┌──────────────────────────┼─────────────────────────┐
                              │                          │                         │
                              ▼                          ▼                         ▼
                    ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
                    │   MimoEngine     │      │   HTTP Client    │      │ MessageHandler   │
                    │ (Socket.IO Client)│     │  (nitroClient)   │      │ (Command Routing) │
                    └────────┬─────────┘      └────────┬─────────┘      └──────────────────┘
                             │                          │
                             │ Socket.IO                 │ HTTP POST
                             ▼                          ▼
                    ┌────────────────────────────────────────────┐
                    │           MimoBus (Nitro Server)           │
                    │           Socket.IO Server (port 6007)     │
                    └─────────────────────┬──────────────────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────────┐
                    │            Backend Services                │
                    └────────────────────────────────────────────┘
```

---

## 关键差异与优化点

### 1. 认证机制 ⚠️ **关键缺失**

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| 认证方式 | Cookie 自动同步 | 无内置认证机制 |
| Cookie 监听 | `chrome.cookies.onChanged` | 无 |
| Token 同步 | 自动同步到 `chrome.storage.local` | 无 |
| 认证来源 | `manus.im` 后端设置 Cookie | 未定义 |

#### Manus 的 AuthHelper 实现

**文件位置**: [analysis/02_后台工作器/认证助手.md](../../.reverse/manus-reverse/analysis/02_后台工作器/认证助手.md)

**核心代码结构**:

```javascript
class AuthHelper {
  constructor() {
    this.cleanupWatcher = null
    this.debounceTimers = new Map()
  }

  async initialize() {
    // 1. 确保 browser settings 存在
    const settings = BrowserSettings.getBrowserSettings()
    if (!settings?.browserName) {
      await BrowserSettings.setBrowserSettings(DEFAULT_SETTINGS)
    }

    // 2. 读取 manus.im 域名的 Cookie
    const cookies = await this.getManusAppCookies()

    // 3. 同步 session_id Cookie 到令牌存储
    if (cookies.token) {
      const normalized = this.normalizeValue(cookies.token)
      await Token.setToken(normalized)
    }
  }

  startWatcher() {
    // 检查 chrome.cookies API 是否可用
    if (!chrome.cookies?.onChanged) {
      logger.warn("chrome.cookies API unavailable")
      return
    }

    // Cookie 变更监听器
    const listener = (changeInfo) => {
      const { cookie, removed } = changeInfo

      // 验证 Cookie 域名
      const cookieDomain = cookie.domain.startsWith(".")
        ? cookie.domain.slice(1)
        : cookie.domain

      if (hostname !== cookieDomain &&
          !hostname.endsWith(`.${cookieDomain}`)) {
        return  // 不是 Manus 域名的 Cookie
      }

      // 500ms 防抖后同步
      this.handleCookieChangeWithDebounce(
        cookie.name,
        removed,
        cookie.value,
        watcher
      )
    }

    chrome.cookies.onChanged.addListener(listener)
  }

  handleCookieChangeWithDebounce(cookieName, removed, value, config) {
    // 清除现有的防抖定时器
    const existingTimer = this.debounceTimers.get(cookieName)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新的防抖定时器（500ms）
    const newTimer = setTimeout(async () => {
      const currentValue = config.getCurrentValue()

      // 仅在值实际变化时才更新
      if (nextValue !== currentValue) {
        await config.setValue(nextValue)
      }

      this.debounceTimers.delete(cookieName)
    }, 500)

    this.debounceTimers.set(cookieName, newTimer)
  }
}
```

**Cookie 映射关系**:

| Cookie 属性 | Chrome Cookie | 扩展存储 |
|------------|--------------|---------|
| 名称 | `session_id` | `manus_extension_token` |
| 域名 | `.manus.im` | - |
| 路径 | `/` | - |
| 安全 | `true` (HTTPS) | - |
| HttpOnly | `true` | - |
| 存储位置 | 浏览器 Cookie 存储 | `chrome.storage.local` |

#### 优化建议

1. **实现 AuthHelper 类**
   - 新建文件: `mimorepo/apps/plasmo-app/src/background/auth-helper.ts`
   - 监听后端域名 Cookie 变化
   - 将认证令牌自动同步到 `chrome.storage.local`
   - 实现 500ms 防抖处理

2. **集成到 MimoEngine**
   - 在连接建立时携带认证令牌
   - 在 Socket.IO auth 参数中传递 token

3. **Token 存储管理**
   - 创建响应式 token storage
   - 支持跨上下文实时同步

---

### 2. 连接架构差异

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| 连接方式 | 直接 WebSocket | Socket.IO + MimoBus 中间层 |
| 协议 | WebSocket (`wss://`) | Socket.IO (`ws://`) |
| 服务器 | `api.manus.im` | `localhost:6007` |
| 复杂度 | 较低（直连） | 较高（多层） |
| 延迟 | 低 | 中等（多一层） |

#### 当前架构问题

- **MimoBus 作为中间层**增加了复杂度和延迟
- **Socket.IO 依赖**可能比原生 WebSocket 重
- **双协议并存**: Socket.IO (命令) + HTTP (结果上报)

#### 优化建议

**方案 A: 保留当前架构** (推荐，如果 MimoBus 有特殊用途)
- 优化 MimoBus 性能
- 减少 Socket.IO 开销
- 合并 HTTP 上报到 Socket.IO

**方案 B: 简化架构** (如果 MimoBus 仅作转发)
- 移除 MimoBus 中间层
- 直接连接后端 WebSocket
- 减少一个网络跳跃

**方案 C: 集成到 Nitro**
- 将 MimoBus 与 Nitro 服务器合并
- 减少独立进程数
- 统一端口和服务

---

### 3. 消息传递机制

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| 内部通信 | `chrome.runtime.sendMessage` | `chrome.runtime.sendMessage` |
| 外部通信 | WebSocket (双向) | Socket.IO + HTTP |
| 消息类型 | 50+ 类型定义 | 通过 `HubCommandRequest` 统一 |
| 慢消息监控 | 内置 1000ms 阈值警告 | 无 |
| 消息 ID | 22 位随机 ID | UUID |

#### Manus 的 sendMessage.js 实现

**文件位置**: [analysis/01_核心插件/消息传递机制.md](../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md)

**核心特性**:

```javascript
async function sendMessage(message, options) {
  const requestId = generateRequestId()  // 22 位随机 ID
  const messageType = getMessageType(message)
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      const duration = Date.now() - startTime

      // 慢消息警告 (阈值: 1000ms)
      if (duration > options.slowThreshold) {
        logger.warn(`[Performance] Slow message: ${messageType} took ${duration}ms`)
      }

      resolve(response)
    })
  })
}

// 随机 ID 生成 (使用 crypto.getRandomValues)
function generateRequestId() {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const ID_LENGTH = 22
  // 使用 crypto.getRandomValues 生成安全的随机 ID
  // 返回如: "aB3xY7zQ9pL2mN4oP6rS8"
}
```

**配置选项**:
```javascript
{
  silent: false,           // 是否静默模式
  slowThreshold: 1000,     // 慢消息阈值（毫秒）
  logLevel: "debug"        // 日志级别
}
```

**Manus 消息类型 (50+ 种)**:

| 类别 | 数量 | 示例 |
|------|------|------|
| 会话管理 | 8 | `session/start`, `session/stop` |
| 自动化操作 | 12 | `automation/click`, `automation/type` |
| 页面交互 | 6 | `page/check-ready`, `page/event-block` |
| 用户干预 | 3 | `extension/stop-task` |
| Manus 应用 | 3 | `my-browser/ping` |

#### 优化建议

1. **添加消息性能监控**
   - 在 `MessageHandler` 中记录消息执行时间
   - 慢消息警告日志
   - 性能指标收集

2. **统一消息类型定义**
   - 创建 `MessageType` 枚举
   - 定义所有消息类型和 payload 结构
   - 类型安全的消息处理

3. **改进消息 ID 生成**
   - 考虑使用更短的 ID (22 位)
   - 使用 `crypto.getRandomValues` 生成安全 ID

---

### 4. 心跳与重连机制

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| 心跳间隔 | 未明确（可能由 WebSocket 处理） | 30000ms |
| 心跳超时 | 未明确 | 90000ms |
| 自动重连 | 有 | 有 |
| 连接质量监控 | 无 | 有 (基于 RTT) |
| 心跳超时重连 | 无 | 有 |

#### 当前 MimoEngine 心跳实现

**文件位置**: [mimorepo/packages/@mimo/engine/src/mimo-engine.ts](../../../mimorepo/packages/@mimo/engine/src/mimo-engine.ts)

```typescript
private startHeartbeat(): void {
  this.stopHeartbeat();

  this.heartbeatTimer = setInterval(() => {
    if (!this.socket.connected) {
      return;
    }

    const ping: HeartbeatPing = {
      socketId: this.socket.id || '',
      timestamp: Date.now(),
      status: 'active',
    };

    this.socket.emit(ProtocolEvent.HeartbeatPing, ping);
    this.heartbeatMissedCount++;

    // 检查心跳超时 (3x interval)
    const maxMissed = Math.floor(90000 / this.config.heartbeatInterval);
    if (this.heartbeatMissedCount > maxMissed) {
      this.log('Heartbeat timeout - reconnecting');
      this.socket.disconnect();
      this.socket.connect();
    }
  }, this.config.heartbeatInterval);
}
```

**连接质量计算**:
```typescript
// 基于 RTT 计算连接质量
const rtt = pong.rtt;
this.connectionStatus.quality = Math.max(0, 1 - (rtt / 1000)); // 1s RTT 后降级
```

#### 对比分析

**当前实现优于 Manus 的地方**:
- ✅ 明确的心跳间隔配置 (30s)
- ✅ 心跳超时检测 (90s)
- ✅ 连接质量监控
- ✅ 心跳超时自动重连

**优化建议**:
1. **保持现有实现** - 当前心跳机制较为完善
2. **添加连接质量事件通知** - 当质量下降时触发事件
3. **考虑动态心跳间隔** - 根据网络状况调整

---

### 5. 会话与状态管理

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| 会话管理 | `SessionManager` 类 | 无专用会话管理 |
| 会话状态 | `pending → running → stopped/takeover` | 无定义 |
| 标签页组 | `TabManager` (Chrome TabGroups) | `TabGroupManager` (已实现) |
| 视觉反馈 | Emoji 动画 + 状态栏 | 无 |
| 用户接管 | 支持 (takeover) | 无 |

#### Manus SessionManager 实现

**文件位置**: [analysis/02_后台工作器/架构分析.md](../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md)

**会话状态机**:
```
pending → running → stopped
              ↓
         takeover (用户接管)
              ↓
         running (恢复)
```

**会话数据结构**:
```javascript
{
  sessionId: string,           // 会话 ID
  tabId: number,               // 主标签页 ID
  groupId?: number,            // 标签页组 ID
  windowId: number,            // 窗口 ID
  status: "stopped" | "running" | "takeover" | "error",
  taskName?: string,           // 任务名称
  animationInterval?: number,  // emoji 动画定时器
  queue: Promise<>,            // 操作队列
  disposed: boolean            // 是否已释放
}
```

**Emoji 动画实现**:
```javascript
const EMOJIS = [
  "👆","🖐️","👋","👍","🖖","🫰","✌","🤚","🤟","👉","🤞","👇","☝","🤙","👈","✊","🤘"
]
const ANIMATION_INTERVAL = 1000  // 1 秒

startTaskOngoingAnimation(session, taskName) {
  let index = 0
  const animate = async () => {
    const emoji = EMOJIS[index]
    await TabManager.updateTitle(session, `${emoji} ${taskName}`)
    index = (index + 1) % EMOJIS.length
  }

  animate()  // 立即执行
  session.animationInterval = setInterval(animate, ANIMATION_INTERVAL)
}
```

**标签页组操作**:
```javascript
async function createTaskGroup(tabId, taskName) {
  // 创建组
  const groupId = await chrome.tabs.group({
    tabIds: [tabId]
  })

  // 设置标题和颜色
  await chrome.tabGroups.update(groupId, {
    title: `👆 ${taskName}`,
    color: "blue"
  })

  return groupId
}

markTaskCompleted(session) {
  const title = `✅ ${session.taskName || 'Task'}`
  if (session.groupId) {
    await chrome.tabGroups.update(session.groupId, { title })
  } else {
    await chrome.tabs.update(session.tabId, { title })
  }
}
```

#### 优化建议

1. **实现 SessionManager 类**
   - 新建文件: `mimorepo/apps/plasmo-app/src/background/session-manager.ts`
   - 管理会话生命周期
   - 支持用户接管和恢复

2. **添加会话状态枚举**
   ```typescript
   enum SessionStatus {
     Pending = 'pending',
     Running = 'running',
     Stopped = 'stopped',
     Takeover = 'takeover',
     Error = 'error'
   }
   ```

3. **视觉反馈增强**
   - Tab 标题 emoji 动画
   - 状态栏显示任务进度
   - 任务完成 ✅ 标记

---

### 6. CDP (Chrome DevTools Protocol) 集成

| 方面 | Manus Chrome Operator | 当前 Mimo 项目 |
|------|----------------------|----------------|
| CDP 使用 | 截图、布局指标、代码执行 | 已有 `StagehandXPathScanner` |
| 会话缓存 | 60 秒 | 无明确缓存策略 |
| 重试机制 | 最多 3 次 | 无 |
| 会话超时 | 60 秒不活跃自动分离 | 无 |

#### Manus CdpClient 实现

**文件位置**: [analysis/02_后台工作器/架构分析.md](../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md)

**会话缓存机制**:
```javascript
// 持久化 CDP 会话缓存
const cdpSessions = new Map()  // tabId -> { target, session, viewport, lastUsed }

// 获取或创建 CDP 会话
async function getOrCreateSession(tabId) {
  let session = cdpSessions.get(tabId)

  if (session) {
    session.lastUsed = Date.now()
    resetDetachTimer(tabId, session)
    return session
  }

  // 创建新会话
  const target = await attachDebugger(tabId)
  const session = createCDPSession(target)
  await session.send("Page.enable")
  const viewport = await initViewport(session)

  session = { target, session, viewport, lastUsed: Date.now() }
  cdpSessions.set(tabId, session)

  return session
}
```

**重试机制**:
```javascript
async function executeWithRetry(tabId, handler, options) {
  let session = await getOrCreateSession(tabId)
  const MAX_RETRIES = 2

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const viewport = options?.refreshViewport
        ? await refreshViewport(session.session, session.viewport)
        : session.viewport

      return await handler(session.session, viewport)
    } catch (error) {
      // 清理并重试
      await detachSession(session.target)
      cdpSessions.delete(tabId)

      if (attempt > MAX_RETRIES) throw error

      // 等待后重试
      await sleep(isDebuggingError(error) ? 1000 : 500)
      session = await getOrCreateSession(tabId)
    }
  }
}
```

**CDP 常量**:
```javascript
const CDP_VERSION = "1.3"
const SESSION_TIMEOUT = 60000  // 60 秒不活跃超时
const DEFAULT_WIDTH = 1920
const DEFAULT_HEIGHT = 1080
```

#### 当前项目 CDP 实现

**相关文件**:
- [StagehandXPathScanner](../../../mimorepo/apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts)
- [StagehandViewportScreenshotter](../../../mimorepo/apps/plasmo-app/src/background/libs/StagehandViewportScreenshotter.ts)

#### 优化建议

1. **统一 CDP 会话管理**
   - 新建文件: `mimorepo/apps/plasmo-app/src/background/cdp-session-manager.ts`
   - 实现会话缓存 (60 秒)
   - 统一 CDP 操作入口

2. **添加重试机制**
   - CDP 操作失败自动重试 (最多 3 次)
   - 调试错误延迟更长 (1000ms vs 500ms)

3. **优化会话超时**
   - 不活跃 60 秒自动分离调试器
   - 避免占用过多资源

---

## 优化优先级

### P0 - 高优先级（核心功能缺失）

#### 1. 认证机制实现

**影响**: 🔴 关键 - 无法安全连接后端

**新建文件**: `mimorepo/apps/plasmo-app/src/background/auth-helper.ts`

**参考来源**: [../../.reverse/manus-reverse/analysis/02_后台工作器/认证助手.md](../../.reverse/manus-reverse/analysis/02_后台工作器/认证助手.md)

**核心功能**:
- Cookie 监听 (`chrome.cookies.onChanged`)
- Token 同步到 `chrome.storage.local`
- 500ms 防抖处理
- 域名验证

**集成点**:
- `background/index.ts` - 初始化 AuthHelper
- `MimoEngine` - 连接时携带 token

---

#### 2. 会话管理系统

**影响**: 🔴 关键 - 无法管理任务生命周期

**新建文件**: `mimorepo/apps/plasmo-app/src/background/session-manager.ts`

**参考来源**: [../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md](../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md)

**核心功能**:
- 会话生命周期管理
- 状态机 (pending → running → stopped/takeover)
- 与 TabManager 集成
- 操作队列管理

**集成点**:
- `background/index.ts` - 初始化 SessionManager
- `MessageHandler` - 命令执行与会话关联

---

### P1 - 中优先级（架构优化）

#### 3. 连接架构简化

**影响**: 🟡 中等 - 影响性能和复杂度

**评估方向**:
- MimoBus 是否必要？
- 能否直接连接后端 WebSocket？
- 减少中间层延迟

**决策建议**:
- 如果 MimoBus 仅作转发 → 考虑移除
- 如果 MimoBus 有特殊逻辑 → 优化性能

---

#### 4. 消息性能监控

**影响**: 🟡 中等 - 影响问题诊断

**修改文件**:
- `mimorepo/packages/@mimo/engine/src/message-handler.ts`

**参考来源**: [../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md](../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md)

**核心功能**:
- 消息执行时间监控
- 慢消息警告 (1000ms 阈值)
- 性能指标收集

---

#### 5. CDP 会话优化

**影响**: 🟡 中等 - 影响性能和稳定性

**新建文件**: `mimorepo/apps/plasmo-app/src/background/cdp-session-manager.ts`

**参考来源**: [../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md](../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md)

**核心功能**:
- CDP 会话缓存 (60 秒)
- 重试机制 (最多 3 次)
- 不活跃自动分离

**修改文件**:
- `StagehandXPathScanner.ts`
- `StagehandViewportScreenshotter.ts`

---

### P2 - 低优先级（用户体验）

#### 6. 视觉反馈增强

**影响**: 🟢 低 - 仅影响用户体验

**功能**:
- Tab 标题 emoji 动画
- 状态栏显示任务进度
- 任务完成 ✅ 标记

**实现位置**:
- `SessionManager` - 动画逻辑
- `TabManager` - 标题更新

---

#### 7. 环境配置管理

**影响**: 🟢 低 - 开发体验

**功能**:
- 支持 local/dev/prod 环境
- 动态配置切换

**参考来源**: [../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md](../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md)

---

## 实现指南

### 1. AuthHelper 实现

**文件**: `mimorepo/apps/plasmo-app/src/background/auth-helper.ts`

```typescript
/**
 * AuthHelper - 认证助手
 *
 * 监听后端域名 Cookie 变化，自动同步认证令牌到 chrome.storage.local
 */

import { Storage } from "@plasmohq/storage"

const STORAGE_KEY = "mimo_auth_token"
const COOKIE_NAME = "session_id" // 根据实际后端配置调整
const DEBOUNCE_MS = 500

interface AuthHelperConfig {
  backendDomain: string  // 如 "http://localhost:3000" 或 "https://api.example.com"
  cookieName: string
}

export class AuthHelper {
  private storage: Storage
  private config: AuthHelperConfig
  private debounceTimer: NodeJS.Timeout | null = null
  private currentToken: string | null = null

  constructor(config: AuthHelperConfig) {
    this.config = config
    this.storage = new Storage()
  }

  /**
   * 初始化 - 读取现有 Cookie 并启动监听
   */
  async initialize(): Promise<{ token: string | null; initialized: boolean }> {
    try {
      // 1. 读取现有 Cookie
      const token = await this.getAuthCookie()

      if (token) {
        await this.setToken(token)
        console.log("[AuthHelper] Token initialized from cookie")
      }

      // 2. 启动 Cookie 监听
      this.startWatcher()

      return { token, initialized: true }
    } catch (error) {
      console.error("[AuthHelper] Initialization failed:", error)
      return { token: null, initialized: false }
    }
  }

  /**
   * 获取认证 Cookie
   */
  private async getAuthCookie(): Promise<string | null> {
    const url = new URL(this.config.backendDomain).origin

    return new Promise((resolve) => {
      chrome.cookies.get({ url, name: this.config.cookieName }, (cookie) => {
        if (chrome.runtime.lastError) {
          console.error("[AuthHelper] Failed to get cookie:", chrome.runtime.lastError)
          resolve(null)
          return
        }
        resolve(cookie?.value || null)
      })
    })
  }

  /**
   * 设置 Token 到存储
   */
  private async setToken(token: string): Promise<void> {
    this.currentToken = token
    await this.storage.set(STORAGE_KEY, token)
  }

  /**
   * 获取当前 Token
   */
  async getToken(): Promise<string | null> {
    if (this.currentToken) {
      return this.currentToken
    }
    return await this.storage.get<string>(STORAGE_KEY)
  }

  /**
   * 启动 Cookie 监听
   */
  private startWatcher(): void {
    if (!chrome.cookies?.onChanged) {
      console.warn("[AuthHelper] chrome.cookies API unavailable")
      return
    }

    const listener = (changeInfo: chrome.cookies.CookieChangeInfo) => {
      const { cookie, removed } = changeInfo

      if (!cookie) return

      // 验证域名
      const backendHostname = new URL(this.config.backendDomain).hostname
      const cookieDomain = cookie.domain.startsWith(".")
        ? cookie.domain.slice(1)
        : cookie.domain

      if (cookie.name !== this.config.cookieName) return
      if (cookieDomain !== backendHostname &&
          !backendHostname.endsWith(`.${cookieDomain}`)) return

      // 防抖处理
      this.handleCookieChange(removed, cookie.value)
    }

    chrome.cookies.onChanged.addListener(listener)
    console.log("[AuthHelper] Cookie watcher started")
  }

  /**
   * 处理 Cookie 变更 (防抖)
   */
  private handleCookieChange(removed: boolean, value: string): void {
    // 清除现有定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // 设置新的防抖定时器
    this.debounceTimer = setTimeout(async () => {
      const newToken = removed ? null : value

      if (newToken !== this.currentToken) {
        console.log("[AuthHelper] Token changed (debounced)")
        await this.setToken(newToken)
      }

      this.debounceTimer = null
    }, DEBOUNCE_MS)
  }

  /**
   * 清理
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }
}
```

**集成到 Background**:

```typescript
// background/index.ts

import { AuthHelper } from "./auth-helper"

const authHelper = new AuthHelper({
  backendDomain: process.env.PLASMO_PUBLIC_BACKEND_URL || "http://localhost:3000",
  cookieName: "session_id"
})

// 初始化
authHelper.initialize().then(({ token, initialized }) => {
  if (initialized) {
    console.log("[Background] AuthHelper initialized, token:", token ? "present" : "absent")
  }
})
```

---

### 2. SessionManager 实现

**文件**: `mimorepo/apps/plasmo-app/src/background/session-manager.ts`

```typescript
/**
 * SessionManager - 会话管理器
 *
 * 管理任务会话生命周期，包括状态管理、标签页关联、视觉反馈
 */

export enum SessionStatus {
  Pending = "pending",
  Running = "running",
  Stopped = "stopped",
  Takeover = "takeover",
  Error = "error"
}

interface Session {
  sessionId: string
  tabId: number
  groupId?: number
  windowId: number
  status: SessionStatus
  taskName?: string
  animationInterval?: number
  queue: Promise<any>
  disposed: boolean
}

export class SessionManager {
  private sessions = new Map<string, Session>()

  /**
   * 创建新会话
   */
  async startSession(tabId: number, options: {
    taskName?: string
  } = {}): Promise<Session> {
    const tab = await chrome.tabs.get(tabId)
    const sessionId = this.generateId()

    // 创建标签页组
    const groupId = await this.createTaskGroup(tabId, options.taskName)

    // 初始化会话
    const session: Session = {
      sessionId,
      tabId,
      groupId,
      windowId: tab.windowId,
      status: SessionStatus.Running,
      taskName: options.taskName,
      queue: Promise.resolve(),
      disposed: false
    }

    this.sessions.set(sessionId, session)

    // 开始 emoji 动画
    this.startAnimation(session)

    console.log("[SessionManager] Session started:", sessionId)
    return session
  }

  /**
   * 停止会话
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // 停止动画
    if (session.animationInterval) {
      clearInterval(session.animationInterval)
    }

    // 标记任务完成
    await this.markTaskCompleted(session)

    // 移除会话
    this.sessions.delete(sessionId)
    session.disposed = true

    console.log("[SessionManager] Session stopped:", sessionId)
  }

  /**
   * 用户接管
   */
  async takeoverSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.status = SessionStatus.Takeover

    // 停止动画
    if (session.animationInterval) {
      clearInterval(session.animationInterval)
    }

    // 更新标题
    const title = `⏸️ ${session.taskName || "Task"}`
    await this.updateTitle(session, title)

    console.log("[SessionManager] Session taken over:", sessionId)
  }

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.status = SessionStatus.Running

    // 重新开始动画
    this.startAnimation(session)

    console.log("[SessionManager] Session resumed:", sessionId)
  }

  /**
   * 创建标签页组
   */
  private async createTaskGroup(tabId: number, taskName?: string): Promise<number | undefined> {
    if (!chrome.tabGroups) return undefined

    const groupId = await chrome.tabs.group({ tabIds: [tabId] })

    await chrome.tabGroups.update(groupId, {
      title: `👆 ${taskName || "Task"}`,
      color: "blue"
    })

    return groupId
  }

  /**
   * 开始动画
   */
  private startAnimation(session: Session): void {
    const emojis = ["👆", "🖐️", "👋", "👍", "🖖", "🫰", "✌", "🤚"]
    let index = 0

    const animate = async () => {
      const emoji = emojis[index]
      await this.updateTitle(session, `${emoji} ${session.taskName || "Task"}`)
      index = (index + 1) % emojis.length
    }

    animate() // 立即执行
    session.animationInterval = setInterval(animate, 1000) as any
  }

  /**
   * 标记任务完成
   */
  private async markTaskCompleted(session: Session): Promise<void> {
    const title = `✅ ${session.taskName || "Task"}`

    if (session.groupId) {
      await chrome.tabGroups.update(session.groupId, { title })
    } else {
      await chrome.tabs.update(session.tabId, { title })
    }
  }

  /**
   * 更新标题
   */
  private async updateTitle(session: Session, title: string): Promise<void> {
    if (session.groupId) {
      await chrome.tabGroups.update(session.groupId, { title })
    } else {
      await chrome.tabs.update(session.tabId, { title })
    }
  }

  /**
   * 生成会话 ID
   */
  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
  }
}
```

**集成到 Background**:

```typescript
// background/index.ts

import { SessionManager } from "./session-manager"

export const sessionManager = new SessionManager()

// 导出供其他模块使用
export { SessionManager }
```

---

### 3. 消息性能监控

**文件**: `mimorepo/packages/@mimo/engine/src/message-handler.ts`

```typescript
/**
 * MessageHandler - 添加性能监控
 */

const SLOW_MESSAGE_THRESHOLD = 1000 // ms

export class MessageHandler {
  // ... 现有代码

  static async createChromeRuntimeHandler() {
    return async (message: any, sender: any, sendResponse: any) => {
      const startTime = Date.now()
      const messageType = message?.type || "unknown"

      try {
        const result = await this.routeCommand(message)

        const duration = Date.now() - startTime
        if (duration > SLOW_MESSAGE_THRESHOLD) {
          console.warn(`[MessageHandler] Slow message: ${messageType} took ${duration}ms`)
        }

        sendResponse({ success: true, data: result })
        return true
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[MessageHandler] Message failed: ${messageType} (${duration}ms)`, error)

        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
        return true
      }
    }
  }
}
```

---

### 4. CDP 会话管理

**文件**: `mimorepo/apps/plasmo-app/src/background/cdp-session-manager.ts`

```typescript
/**
 * CdpSessionManager - Chrome DevTools Protocol 会话管理
 *
 * 管理 CDP 会话缓存、重试逻辑
 */

interface CdpSession {
  tabId: number
  target: chrome.debugger.Debuggee
  viewport: { width: number; height: number }
  lastUsed: number
}

export class CdpSessionManager {
  private sessions = new Map<number, CdpSession>()
  private readonly SESSION_TIMEOUT = 60000 // 60 秒
  private readonly MAX_RETRIES = 2

  /**
   * 获取或创建 CDP 会话
   */
  async getOrCreateSession(tabId: number): Promise<CdpSession> {
    let session = this.sessions.get(tabId)

    if (session) {
      session.lastUsed = Date.now()
      return session
    }

    // 创建新会话
    const target = { tabId }
    await chrome.debugger.attach(target, "1.3")

    // 启用 Page
    await chrome.debugger.sendCommand(target, "Page.enable")

    // 获取 viewport
    const { result } = await chrome.debugger.sendCommand(
      target,
      "Page.getLayoutMetrics"
    )

    const viewport = {
      width: Math.floor(result.cssContentSize?.width || 1920),
      height: Math.floor(result.cssContentSize?.height || 1080)
    }

    session = {
      tabId,
      target,
      viewport,
      lastUsed: Date.now()
    }

    this.sessions.set(tabId, session)

    // 设置超时清理
    this.setDetachTimer(tabId)

    return session
  }

  /**
   * 执行 CDP 命令 (带重试)
   */
  async executeWithRetry<T>(
    tabId: number,
    handler: (session: CdpSession) => Promise<T>
  ): Promise<T> {
    let session = await this.getOrCreateSession(tabId)

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await handler(session)
      } catch (error) {
        // 清理会话
        await this.detachSession(tabId)

        if (attempt >= this.MAX_RETRIES) {
          throw error
        }

        // 等待后重试
        const delay = this.isDebuggingError(error) ? 1000 : 500
        await new Promise(resolve => setTimeout(resolve, delay))

        session = await this.getOrCreateSession(tabId)
      }
    }

    throw new Error("Max retries exceeded")
  }

  /**
   * 分离会话
   */
  async detachSession(tabId: number): Promise<void> {
    const session = this.sessions.get(tabId)
    if (!session) return

    try {
      await chrome.debugger.detach(session.target)
    } catch {
      // 忽略错误
    }

    this.sessions.delete(tabId)
  }

  /**
   * 设置超时定时器
   */
  private setDetachTimer(tabId: number): void {
    setTimeout(async () => {
      const session = this.sessions.get(tabId)
      if (!session) return

      const idle = Date.now() - session.lastUsed
      if (idle > this.SESSION_TIMEOUT) {
        console.log(`[CdpSessionManager] Session timeout for tab ${tabId}`)
        await this.detachSession(tabId)
      } else {
        // 重新检查
        this.setDetachTimer(tabId)
      }
    }, this.SESSION_TIMEOUT)
  }

  /**
   * 判断是否为调试错误
   */
  private isDebuggingError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes("Target closed") ||
           message.includes("Session not attached")
  }
}

// 导出单例
export const cdpSessionManager = new CdpSessionManager()
```

---

## 验证方案

### 1. 认证机制验证

```bash
# 步骤 1: 登录后端系统，设置 Cookie
# 访问 http://localhost:3000/login 并登录

# 步骤 2: 检查 chrome.storage.local
# 打开 Chrome DevTools → Application → Storage → Local Storage
# 查找 "mimo_auth_token" 键

# 步骤 3: 验证 MimoEngine 连接时携带 token
# 查看 MimoEngine 连接日志，确认 auth 参数包含 token
```

**预期结果**:
- ✅ Cookie 变更时 token 自动更新 (500ms 后)
- ✅ `chrome.storage.local` 中存在 `mimo_auth_token`
- ✅ MimoEngine 连接时携带 token

---

### 2. 会话管理验证

```bash
# 步骤 1: 启动任务，创建会话
# 调用 sessionManager.startSession(tabId, { taskName: "测试任务" })

# 步骤 2: 检查标签页组创建
# 观察浏览器是否创建了新的标签页组

# 步骤 3: 检查标签页标题
# 标签页组标题应显示: "👆 测试任务"
# 标题应每秒更新 emoji

# 步骤 4: 测试 takeover 和 resume
sessionManager.takeoverSession(sessionId)  # 标题变为 "⏸️ 测试任务"
sessionManager.resumeSession(sessionId)   # 恢复 emoji 动画

# 步骤 5: 停止会话
sessionManager.stopSession(sessionId)     # 标题变为 "✅ 测试任务"
```

**预期结果**:
- ✅ 标签页组正确创建
- ✅ Emoji 动画正常运行
- ✅ Takeover/resume 功能正常
- ✅ 完成后显示 ✅ 标记

---

### 3. 连接稳定性验证

```bash
# 步骤 1: 启动 MimoEngine 连接
# 观察 console 日志

# 步骤 2: 检查心跳日志
[MimoEngine] Heartbeat sent { missedCount: 1 }
[MimoEngine] Heartbeat acknowledged { rtt: 45, quality: 0.955 }

# 步骤 3: 模拟网络断开
# 断开网络连接，观察重连行为

# 步骤 4: 检查连接质量
# 在网络波动情况下观察 quality 值变化
```

**预期结果**:
- ✅ 每 30 秒发送心跳
- ✅ 心跳响应记录 RTT 和 quality
- ✅ 网络断开后自动重连
- ✅ 90 秒无心跳触发超时重连

---

### 4. 消息性能验证

```bash
# 步骤 1: 发送测试消息
# 观察消息执行时间

# 步骤 2: 触发慢消息
# 模拟耗时操作 (>1000ms)

# 步骤 3: 检查警告日志
[MessageHandler] Slow message: test_command took 1234ms
```

**预期结果**:
- ✅ 正常消息无警告
- ✅ 慢消息显示警告
- ✅ 失败消息记录错误和耗时

---

### 5. CDP 会话验证

```bash
# 步骤 1: 执行 CDP 操作
# 如截图、XPath 扫描

# 步骤 2: 检查会话缓存
# 同一 tab 重复操作应使用缓存会话

# 步骤 3: 测试超时清理
# 等待 60 秒后检查会话是否自动清理

# 步骤 4: 测试重试机制
# 模拟 CDP 失败，观察自动重试
```

**预期结果**:
- ✅ 会话正确缓存 60 秒
- ✅ 超时后自动分离调试器
- ✅ 失败自动重试最多 3 次

---

## 附录

### 关键文件清单

#### 需要新建的文件

| 文件路径 | 用途 | 优先级 |
|---------|------|--------|
| `mimorepo/apps/plasmo-app/src/background/auth-helper.ts` | 认证助手 | P0 |
| `mimorepo/apps/plasmo-app/src/background/session-manager.ts` | 会话管理器 | P0 |
| `mimorepo/apps/plasmo-app/src/background/cdp-session-manager.ts` | CDP 会话管理 | P1 |

#### 需要修改的文件

| 文件路径 | 修改内容 | 优先级 |
|---------|----------|--------|
| `mimorepo/apps/plasmo-app/src/background/index.ts` | 集成 AuthHelper 和 SessionManager | P0 |
| `mimorepo/packages/@mimo/engine/src/mimo-engine.ts` | 添加认证令牌支持 | P0 |
| `mimorepo/packages/@mimo/engine/src/message-handler.ts` | 添加消息性能监控 | P1 |
| `mimorepo/apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts` | 使用 CdpSessionManager | P1 |
| `mimorepo/apps/plasmo-app/src/background/libs/StagehandViewportScreenshotter.ts` | 使用 CdpSessionManager | P1 |

---

### 参考资料

1. [Manus 总结报告](../../.reverse/manus-reverse/analysis/00_概述/总结报告.md)
2. [消息传递机制](../../.reverse/manus-reverse/analysis/01_核心插件/消息传递机制.md)
3. [令牌管理](../../.reverse/manus-reverse/analysis/01_核心插件/令牌管理.md)
4. [Chrome异步封装](../../.reverse/manus-reverse/analysis/01_核心插件/Chrome异步封装.md)
5. [Manus集成](../../.reverse/manus-reverse/analysis/01_核心插件/Manus集成.md)
6. [类型守卫](../../.reverse/manus-reverse/analysis/01_核心插件/类型守卫.md)
7. [AuthHelper 分析](../../.reverse/manus-reverse/analysis/02_后台工作器/认证助手.md)
8. [后台架构分析](../../.reverse/manus-reverse/analysis/02_后台工作器/架构分析.md)

---

*本文档基于 Manus Chrome Operator v0.0.47 逆向工程分析生成*
