# 接口与传输层设计（HTTP + Socket）

本文档定义 **Web / Server / Browser Plugin** 三方在网络层需要实现的接口，以及跨模块的传输约束（ack、超时、幂等、版本化）。
LLM 侧接口以 Server 内部 `LLM Gateway` 抽象为主，详见 `docs/system-design/agent-runtime.md`。

---

## 0. 约定（所有接口通用）

### 0.1 命名与版本

- **协议版本**：`v1`（建议在 Socket 消息根字段带 `v: 1`；HTTP 通过 `X-Mimo-Protocol: 1` 标识）。
- **字段命名**：统一使用 `camelCase`。
  - 为兼容旧扩展/旧前端，允许少量 `snake_case` 别名（例如 `screenshot_presigned_url`），但新实现应只依赖 `camelCase`。

### 0.2 时间与 ID

- `timestamp`：毫秒级 Unix epoch（`Date.now()`）。
- `sessionId`：会话/任务 ID（推荐 UUID/ULID）。
- `clientId`：插件实例 ID（插件本地持久化；用于多实例选择）。
- `actionId`：browser_action 的请求 ID（幂等键）。
- `requestId`：用户确认/交互类请求的 ID。

### 0.3 错误返回（HTTP）

统一返回 envelope：

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "human readable message",
    "details": {}
  }
}
```

成功返回：

```json
{
  "ok": true,
  "data": {}
}
```

### 0.4 追踪与日志关联

- HTTP：推荐支持 `X-Trace-Id` 请求头，并在响应回传同值。
- Socket：推荐在所有消息中附加 `traceId`（可选），Server 负责在转发/落库/LLM 调用时贯穿。

---

## 1. 组件间传输层（推荐拓扑）

### 1.1 端口与同源策略（建议）

- Web：`http://localhost:3000`
- Docs：`http://localhost:3001`
- Server（HTTP + Socket）：`http://localhost:6006`
  - Socket.IO namespace：`/mimo`

建议 Web 侧：
- HTTP：`fetch('/api/...')` 走 Next rewrite 到 Server（同旧系统习惯）。
- Socket：直接连接 `NEXT_PUBLIC_MIMO_SERVER_URL`（不再拆分成两个端口变量）。

### 1.2 Transport 选择

- **HTTP**：首屏/查询/落库后的读取（任务列表、任务详情、扩展列表、Twin 快照、Artifact 下载等）。
- **Socket（Socket.IO）**：实时/流式/控制面（chatDelta、browser_action、twinSync、选择/确认交互）。

---

## 2. HTTP API（Server 提供）

> 路径沿用旧系统习惯（`/api/task/*`、`/api/extension/*`），但数据结构精简且更严格。

### 2.1 会话/任务

#### `GET /api/task/id`

用途：生成新的 `taskId`（即 `sessionId`）。

响应：

```json
{ "ok": true, "data": { "taskId": "01HR..." } }
```

#### `GET /api/task/list`

用途：任务列表（侧边栏/最近会话）。

响应：

```json
{
  "ok": true,
  "data": [
    {
      "taskId": "01HR...",
      "title": "Find ...",
      "status": "ongoing",
      "createdAt": 1730000000000,
      "updatedAt": 1730000100000,
      "selectedClientId": "plugin-abc"
    }
  ]
}
```

#### `GET /api/task/:taskId`

用途：任务详情 + 消息历史（页面刷新/SSR 首屏）。

响应：

```json
{
  "ok": true,
  "data": {
    "task": {
      "taskId": "01HR...",
      "title": "Find ...",
      "status": "running",
      "createdAt": 1730000000000,
      "updatedAt": 1730000100000,
      "selectedClientId": "plugin-abc"
    },
    "messages": [
      { "id": "msg-1", "role": "user", "content": "打开 ...", "timestamp": 1730000001000 },
      { "id": "msg-2", "role": "assistant", "content": "好的，我将 ...", "timestamp": 1730000002000 }
    ]
  }
}
```

> 备注：Server 侧需要保证 **幂等创建任务**：收到第一条 `user_message` 时若任务不存在应自动创建。

### 2.2 Twin（数字孪生）

#### `GET /api/twin`

用途：首屏拉取 Twin 快照（Socket 未连接/降级时也能展示）。

响应（精简版）：

```json
{
  "ok": true,
  "data": {
    "windows": [],
    "tabs": [],
    "tabGroups": [],
    "activeWindowId": null,
    "activeTabId": null,
    "lastUpdated": 1730000000000
  }
}
```

### 2.3 扩展注册与发现

#### `POST /api/extension/extension-id`

用途：插件启动/重连时向 Server 上报绑定信息（`extensionId` ↔ `clientId`）与元数据。

请求：

```json
{
  "extensionId": "abcdefghijklmnop",
  "extensionName": "mimo-agent",
  "clientId": "plugin-abc",
  "ua": "Mozilla/5.0 ...",
  "version": "0.1.0",
  "browserName": "chrome",
  "allowOtherClient": false,
  "timestamp": 1730000000000
}
```

响应：

```json
{ "ok": true, "data": { "registered": true } }
```

#### `GET /api/extension/extension-list`

用途：Web 获取插件候选（用于 UI 选择/诊断）。

响应：

```json
{
  "ok": true,
  "data": [
    {
      "clientId": "plugin-abc",
      "extensionId": "abcdefghijklmnop",
      "extensionName": "mimo-agent",
      "ua": "Mozilla/5.0 ...",
      "version": "0.1.0",
      "socketConnected": true,
      "lastSeenAt": 1730000005000
    }
  ]
}
```

> 关键点：**Web 不应依赖 page-bridge 才能拿到 `clientId`**。`clientId` 必须由插件注册或 Socket 激活消息带上，并被 Server 对外暴露。

#### （可选）Web ↔ Plugin 本地探测桥（仅诊断/自动选择）

> 该桥接来自既有系统实践：Web 通过 `window.postMessage` 让扩展 content-script 代为读取扩展信息，用于“发现/探测在线插件实例”。  
> **约束**：仅用于探测与诊断；任何 browser_action 执行仍必须走 Server 总线。

请求（Web Page World → content-script，canonical）：

```ts
window.postMessage({ type: "mimo/get_plugin_client_info", requestId }, "*")
```

响应（content-script → Web Page World，canonical）：

```ts
window.postMessage(
  { type: "mimo/get_plugin_client_info_result", requestId, payload },
  "*",
)
```

`payload`（精简）：

```json
{
  "ok": true,
  "extensionId": "abcdefghijklmnop",
  "extensionName": "mimo-agent",
  "version": "0.1.0",
  "clientId": "plugin-abc",
  "socketConnected": true
}
```

安全建议：
- content-script 必须做 `event.origin` 白名单校验（例如仅允许 `http://localhost:3000`）。
- 禁止桥接触发“执行类能力”（点击/输入/导航等），避免绕过 Server 的确认与审计链路。
- 兼容旧实现时，可额外接受/返回：
  - `mimoim/get_bion_client_info`
  - `mimoim/get_bion_client_info_result`

### 2.4 Artifact（截图/文件等）

> 目标：避免在 Socket 中传大 payload。推荐 presigned 直传；本地开发可实现成短期有效的 `uploadUrl`（指向 Server 自身）。

#### `POST /api/artifacts/presign`

请求：

```json
{
  "sessionId": "01HR...",
  "kind": "screenshot",
  "contentType": "image/png"
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "artifactId": "art-123",
    "uploadUrl": "http://localhost:6006/api/artifacts/art-123/upload?token=...",
    "downloadUrl": "http://localhost:6006/api/artifacts/art-123",
    "expiresAt": 1730000060000
  }
}
```

#### `GET /api/artifacts/:artifactId`

用途：下载/渲染 artifact（截图、HTML、日志等）。

---

## 3. Socket 协议（MimoBus）

### 3.1 基本参数

- 技术：Socket.IO（建议 `transports: ['websocket']`，插件侧只启 websocket）。
- namespace：`/mimo`
- 事件名（canonical，v1）：
  - Web → Server：`frontend_message`
  - Server → Web：`frontend_event`
  - Plugin ↔ Server：`plugin_message`
- 兼容旧事件名（legacy，可选支持）：
  - Web ↔ Server：`message`（历史上同名双向复用）
  - Plugin ↔ Server：`my_browser_extension_message`
  - Twin push：`twin_state_sync`（历史独立事件；新实现推荐合并进 `frontend_event`）

### 3.2 连接鉴权（建议）

Socket.IO 连接时携带 `auth`：

```ts
type SocketAuth = {
  token?: string;
  clientType: "frontend" | "plugin";
  clientId?: string; // plugin 必填
};
```

Server 侧：
- `clientType=plugin` 时校验 `clientId`，并将 socket 加入 `client:${clientId}` room。
- `clientType=frontend` 时加入 `frontend` room，并按 session 订阅加入 `session:${sessionId}` room（或通过 `frontend_message` 中的 sessionId 路由）。

### 3.3 Web → Server：`frontend_message`

#### Web → Server（发送）

##### (1) `user_message`

```json
{
  "v": 1,
  "type": "user_message",
  "id": "evt-user-1",
  "timestamp": 1730000001000,
  "sessionId": "01HR...",
  "content": "帮我打开 xx 并提取 ..."
}
```

##### (2) `select_browser_client`（alias：`select_my_browser`）

```json
{
  "v": 1,
  "type": "select_browser_client",
  "id": "evt-sel-1",
  "timestamp": 1730000001500,
  "sessionId": "01HR...",
  "targetClientId": "plugin-abc"
}
```

##### (3) `confirm_browser_action`（alias：`confirm_browser_task`）

```json
{
  "v": 1,
  "type": "confirm_browser_action",
  "id": "evt-confirm-1",
  "timestamp": 1730000002000,
  "sessionId": "01HR...",
  "requestId": "req-123",
  "confirmed": true
}
```

### 3.4 Server → Web：`frontend_event`（event envelope）

Server 统一用 envelope 推送（便于落库/回放/调试）：

```json
{
  "type": "event",
  "id": "env-1",
  "sessionId": "01HR...",
  "timestamp": 1730000002500,
  "event": {
    "id": "evt-aaa",
    "type": "chatDelta",
    "timestamp": 1730000002500,
    "sender": "assistant",
    "targetEventId": "evt-user-1",
    "finished": false,
    "delta": { "content": "好的，我将先打开..." }
  }
}
```

MVP 必需的 event type：

- `chatDelta`：流式 assistant 文本（`finished=true` 表示结束）。
- `browserSelection`：提示“等待选择/已选择”，并带候选列表（alias：`myBrowserSelection`）。
- `browserActionConfirmationRequested`：请求用户确认（展示 summary + requestId，alias：`browserTaskConfirmationRequested`）。
- `structuredOutput`：结构化错误/结果兜底（例如 action 执行失败时 UI 展示）。
- `twinSync`：Twin 实时同步（alias：`twin_state_sync`）。

### 3.5 Plugin ↔ Server：`plugin_message`（alias：`my_browser_extension_message`）

#### Plugin → Server（注册/同步）

##### (1) `activate_extension`（握手）

```json
{
  "v": 1,
  "type": "activate_extension",
  "id": "act-hello",
  "clientId": "plugin-abc",
  "ua": "Mozilla/5.0 ...",
  "version": "0.1.0",
  "browserName": "chrome",
  "allowOtherClient": false,
  "skipAuthorization": true
}
```

##### (2) `full_state_sync`（Twin 全量）

```json
{
  "v": 1,
  "type": "full_state_sync",
  "windows": [],
  "tabs": [],
  "tabGroups": [],
  "activeWindowId": null,
  "activeTabId": null,
  "timestamp": 1730000003000
}
```

##### (3) `tab_event`（Twin 增量）

```json
{
  "v": 1,
  "type": "tab_event",
  "eventType": "tab_updated",
  "tab": { "tabId": 1, "windowId": 1, "active": true, "pinned": false, "hidden": false, "index": 0 },
  "timestamp": 1730000004000
}
```

> Server 侧需要把 full_state_sync/tab_event 规整为自己的 Twin store，然后对 Web 推送 `twinSync`（通过 `frontend_event`）。
>
> 新实现推荐：通过 `frontend_event` 推送 `event.type = "twinSync"`（并可选桥接为 legacy 的 `twin_state_sync` 独立事件）。

#### Server → Plugin（控制：browser_action）

##### `browser_action`（需要 ack）

Server 下发动作给指定 `clientId`，并要求插件 **快速 ack 接收**（ack 只代表“收到并开始执行”，不代表执行成功）。

```json
{
  "v": 1,
  "type": "browser_action",
  "id": "act-001",
  "sessionId": "01HR...",
  "clientId": "plugin-abc",
  "timestamp": 1730000005000,
  "action": {
    "browser_screenshot": { "tabId": 123 }
  },
  "screenshotPresignedUrl": "http://localhost:6006/api/artifacts/art-123/upload?token=..."
}
```

插件 ack（Socket.IO callback）建议格式：

```json
{ "ok": true }
```

##### 执行结果回传（兼容两种格式）

推荐新格式（显式 type）：

```json
{
  "v": 1,
  "type": "browser_action_result",
  "actionId": "act-001",
  "sessionId": "01HR...",
  "clientId": "plugin-abc",
  "status": "success",
  "result": { "screenshotUploaded": true, "markdown": "" }
}
```

兼容旧格式（无 `type`，通过 `actionId + status` 识别）：

```json
{
  "actionId": "act-001",
  "status": "error",
  "error": "timeout"
}
```

### 3.6 Twin（Server → Web）

用途：实时同步 Twin（Web 直接覆盖/合并）。

推荐方式：作为 `frontend_event` 的一种事件类型（`event.type = "twinSync"`）推送：

```json
{
  "type": "event",
  "id": "env-twin-1",
  "sessionId": "01HR...",
  "timestamp": 1730000006000,
  "event": {
    "id": "evt-twin-1",
    "type": "twinSync",
    "timestamp": 1730000006000,
    "state": {
      "windows": [],
      "tabs": [],
      "tabGroups": [],
      "activeWindowId": null,
      "activeTabId": null,
      "lastUpdated": 1730000006000
    }
  }
}
```

兼容方式（legacy，可选）：仍单独 emit `twin_state_sync`（payload 与旧实现一致）。

---

## 4. 超时、重试与幂等（传输层关键约束）

### 4.1 `browser_action` 的两阶段超时

- **Ack 超时**（收到即回）：`T_ack`（建议 1–2s）
  - 超时：判定插件不可用，触发重新选择/重连提示，不应继续派发后续动作。
- **执行超时**（完成回传）：`T_exec`（按动作类型配置，建议 30–120s）
  - 超时：Server 将 action 标记为 error，并把错误通过 `structuredOutput` 或 `toolUsed` 通知前端。

### 4.2 幂等与去重

- `actionId` 必须全局唯一（至少在 `sessionId` 范围内唯一）。
- 插件侧应基于 `actionId` 做去重：收到重复 action 时返回同一结果（或直接返回已完成标记）。
- Server 侧重试只允许在 **无结果** 且 **确认幂等** 的 action 上进行（例如截图/读取类）。

### 4.3 顺序性

- 同一 `sessionId` 的 browser_action 推荐 **串行**（避免多 tab 并发导致 Twin/DOM 不一致）。
- 若未来需要并发，必须在协议中增加 `tabId` 与 `executionGroup` 来声明隔离域。
