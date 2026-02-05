# 接口与传输层设计（HTTP + Socket）

本文档定义 **Web / Server / Browser Plugin** 三方在网络层需要实现的接口，以及跨模块的传输约束（ack、超时、幂等、版本化）。
LLM 侧接口以 Server 内部 `LLM Gateway` 抽象为主，详见 `docs/system-design/agent-runtime.md`。

在 Turbo 项目结构中：
- Web = `apps/mimoim`
- Server = `apps/mimoserver`
- Browser Plugin = `apps/mimocrx`

---

## 0. 约定（所有接口通用）

### 0.1 命名与版本

- **协议版本**：`v1`（建议在 Socket 消息根字段带 `v: 1`；HTTP 通过 `X-Mimo-Protocol: 1` 标识）。
- **字段命名**：统一使用 `camelCase`（MVP **不支持** `snake_case` 别名）。
  - 若未来需要兼容旧端，可在协议层 codec 中做字段映射。

### 0.2 时间与 ID

- `timestamp`：毫秒级 Unix epoch（`Date.now()`）。
- `taskId`：会话/任务 ID（推荐 UUID/ULID）。
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

常用 `error.code` 与 HTTP 状态码（MVP）：

| code | HTTP | 说明 |
|---|---|---|
| `BAD_REQUEST` | 400 | 参数缺失/格式错误 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 幂等冲突/状态不一致 |
| `UNAUTHORIZED` | 401 | 预留（若启用鉴权） |
| `FORBIDDEN` | 403 | 预留（若启用鉴权） |
| `RATE_LIMITED` | 429 | 预留（限流/并发过高） |
| `INTERNAL` | 500 | 服务端内部错误 |
| `UNAVAILABLE` | 503 | 依赖不可用/插件离线 |

`details` 约定（可选字段）：
- `retryable?: boolean`：是否建议重试
- `context?: Record<string, unknown>`：上下文信息（如 `taskId`、`actionId`）
- `fieldErrors?: Array<{ field: string; message: string }>`：参数级错误

### 0.4 追踪与日志关联

- HTTP：推荐支持 `X-Trace-Id` 请求头，并在响应回传同值。
- Socket：推荐在所有消息中附加 `traceId`（可选），Server 负责在转发/落库/LLM 调用时贯穿。

### 0.5 环境变量（Server）

- `MIMO_SNAPSHOT_DEBUG`：Snapshot 变更日志开关（`1`/`true` 开启）。
- `MIMO_CORS_ORIGIN`：Socket.IO/HTTP CORS 允许的 Origin（逗号分隔，默认 `http://localhost:3000,http://127.0.0.1:3000`）。

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

- **HTTP**：首屏/查询/落库后的读取（任务列表、任务详情、扩展列表、Snapshot 数据、Artifact 下载等）。
- **Socket（Socket.IO）**：实时/流式/控制面（chatDelta、browser_action、snapshotSync）。

---

## 2. HTTP API（Server 提供）

> 路径沿用旧系统习惯（`/api/task/*`、`/api/extension/*`），但数据结构精简且更严格。

### 2.1 会话/任务

#### `GET /api/task/id`

用途：生成新的 `taskId`（即 `taskId`）。

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

> 备注：Server 侧需要保证 **幂等创建任务**：
> - `taskId` 不存在 → 创建并持久化；
> - `taskId` 已存在 → 直接复用并追加消息；
> - `taskId` 非法（非 UUID/ULID）→ 返回 `BAD_REQUEST`。

### 2.2 Snapshot（快照）

#### `GET /api/snapshot`

用途：首屏拉取 Snapshot（Socket 未连接/降级时也能展示）。
MVP 约定：
- **不做 HTTP 缓存**，直接返回 Server 内存中的最新 Snapshot。
- Web **首屏必拉一次**，并在 Socket **重连后重新拉取**。
- 若插件离线，或 `ageMs > 30_000`，返回最近一次 Snapshot，并标记 `stale=true`（`connected` 反映当前连接状态）。

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
    "lastUpdated": 1730000000000,
    "connected": true,
    "ageMs": 1200,
    "stale": false
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
  "taskId": "01HR...",
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

MVP 建议（本地开发）：
- `uploadUrl` 默认有效期：**15 分钟**；`downloadUrl` 默认保留：**24 小时**。
- 过期访问返回 `410 Gone`（或 `404`），并在 `error.code=NOT_FOUND` 中注明过期原因。
- 存储位置：`./uploads/artifacts/{artifactId}`（可通过环境变量覆盖）。
- 清理策略：启动时清扫过期文件 + 每 6 小时定时清理一次。
- 限制：单文件 `maxUploadBytes=25MB`，上传超时 `60s`。

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
- 兼容旧事件名（legacy，**非 MVP**，仅保留说明）：
  - Web ↔ Server：`message`（历史上同名双向复用）
  - Plugin ↔ Server：`my_browser_extension_message`
  - Snapshot push：`twin_state_sync`（历史独立事件；新实现推荐合并进 `frontend_event`）

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
- `clientType=frontend` 时加入 `frontend` room，并按 task 订阅加入 `task:${taskId}` room（或通过 `frontend_message` 中的 taskId 路由）。

### 3.3 Web → Server：`frontend_message`

说明：本期仅保留 `user_message`。

#### Web → Server（发送）

##### (1) `user_message`

```json
{
  "v": 1,
  "type": "user_message",
  "id": "evt-user-1",
  "timestamp": 1730000001000,
  "taskId": "01HR...",
  "content": "帮我打开 xx 并提取 ..."
}
```

### 3.4 Server → Web：`frontend_event`（event envelope）

Server 统一用 envelope 推送（便于落库/回放/调试）：

```json
{
  "type": "event",
  "id": "env-1",
  "taskId": "01HR...",
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
- `structuredOutput`：结构化错误/结果兜底（例如 action 执行失败时 UI 展示）。
- `snapshotSync`：Snapshot 实时同步（legacy alias：`twin_state_sync`，非 MVP）。

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

##### (2) `full_state_sync`（Snapshot 全量）

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

##### (3) `tab_event`（Snapshot 增量）

```json
{
  "v": 1,
  "type": "tab_event",
  "eventType": "tab_updated",
  "tab": { "tabId": 1, "windowId": 1, "active": true, "pinned": false, "hidden": false, "index": 0 },
  "timestamp": 1730000004000
}
```

> Server 侧需要把 full_state_sync/tab_event 规整为自己的 Snapshot store，然后对 Web 推送 `snapshotSync`（通过 `frontend_event`）。
>
> 新实现推荐：通过 `frontend_event` 推送 `event.type = "snapshotSync"`（桥接 legacy `twin_state_sync` 为非 MVP 选项）。

#### Server → Plugin（控制：browser_action）

##### `browser_action`（需要 ack）

Server 下发动作给指定 `clientId`，并要求插件 **快速 ack 接收**（ack 只代表“收到并开始执行”，不代表执行成功）。

```json
{
  "v": 1,
  "type": "browser_action",
  "id": "act-001",
  "taskId": "01HR...",
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
  "taskId": "01HR...",
  "clientId": "plugin-abc",
  "status": "success",
  "result": { "screenshotUploaded": true, "markdown": "" }
}
```

`status` 约定：`"success" | "error" | "partial"`  
当 `partial` 时，仍可继续执行后续动作，但必须在 `result.warnings` 中说明缺失项。

错误返回（推荐）：

```json
{
  "v": 1,
  "type": "browser_action_result",
  "actionId": "act-001",
  "taskId": "01HR...",
  "clientId": "plugin-abc",
  "status": "error",
  "error": { "code": "PLUGIN_TIMEOUT_EXEC", "message": "execution timeout", "retryable": true }
}
```

常见 `error.code`（插件侧/调度侧）：
- `PLUGIN_OFFLINE` / `PLUGIN_TIMEOUT_ACK` / `PLUGIN_TIMEOUT_EXEC`
- `INVALID_TASK_TAB` / `INVALID_TARGET`
- `CDP_UNAVAILABLE` / `CDP_PERMISSION_DENIED`
- `PAGE_PREP_FAILED` / `READABILITY_TOO_LARGE`
- `ARTIFACT_UPLOAD_FAILED` / `NAVIGATION_TIMEOUT`

兼容旧格式（无 `type`，通过 `actionId + status` 识别）：

```json
{
  "actionId": "act-001",
  "status": "error",
  "error": "timeout"
}
```

### 3.6 Snapshot（Server → Web）

用途：实时同步 Snapshot（Web 直接覆盖/合并）。

推荐方式：作为 `frontend_event` 的一种事件类型（`event.type = "snapshotSync"`）推送：
MVP 约定：Server 始终推送 **全量** Snapshot（`mode = "full"`），Web 直接覆盖。

```json
{
  "type": "event",
  "id": "env-snapshot-1",
  "taskId": "01HR...",
  "timestamp": 1730000006000,
  "event": {
    "id": "evt-snapshot-1",
    "type": "snapshotSync",
    "timestamp": 1730000006000,
    "mode": "full",
    "seq": 42,
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

`seq` 为递增序号（单进程内单调递增），Web 侧应忽略旧序号/旧时间戳。

兼容方式（legacy，非 MVP）：仍单独 emit `twin_state_sync`（payload 与旧实现一致）。

---

## 4. 超时、重试与幂等（传输层关键约束）

### 4.1 `browser_action` 的两阶段超时

- **Ack 超时**（收到即回）：`T_ack`（建议 1–2s）
  - 超时：判定插件不可用，触发重新选择/重连提示，不应继续派发后续动作。
- **执行超时**（完成回传）：`T_exec`（按动作类型配置，建议 30–120s）
  - 超时：Server 将 action 标记为 error，并把错误通过 `structuredOutput` 或 `toolUsed` 通知前端。

MVP 默认 `T_exec`（可在 action 参数中覆盖）：

| action | 默认 `T_exec` |
|---|---|
| `task_start` | 20s |
| `browser_debugger_attach` | 5s |
| `browser_wait_for_loaded` | 20s |
| `browser_screenshot` | 10s |
| `browser_readability_extract` | 10s |
| `browser_dom_index` | 10s |
| `browser_xpath_scan` | 10s |
| `browser_click` | 5s |
| `browser_type` | 10s |
| `browser_get_html` | 10s |
| `task_stop` | 5s |

超时后的清理：
- 取消该 `actionId` 的等待者，标记 `error.code=PLUGIN_TIMEOUT_EXEC`。
- 若连续 2 次超时，标记插件为 `unhealthy`（需要重新连接）并清理其 in-flight 队列。

### 4.2 幂等与去重

- `actionId` 必须全局唯一（至少在 `taskId` 范围内唯一）。
- 插件侧应基于 `actionId` 做去重：收到重复 action 时返回同一结果（或直接返回已完成标记）。
- Server 侧重试只允许在 **无结果** 且 **确认幂等** 的 action 上进行（例如截图/读取类）。

### 4.3 顺序性

- 同一 `taskId` 的 browser_action 推荐 **串行**（避免多 tab 并发导致 Snapshot/DOM 不一致）。
- 若未来需要并发，必须在协议中增加 `tabId` 与 `executionGroup` 来声明隔离域。
