# Implementation Audit — 2026-02-05

目标：检查并对齐当前实现与 `turbo/docs/system-design/*`（特别是 `contracts.md`、`code-structure.md`）的设计初衷，重点覆盖 Socket 总线与 `browser_action` 闭环。

本文基于 2026-02-05 当天的代码状态（已包含对齐修复）。

---

## 1) Socket 事件名（wire contract）

### 设计期望
- namespace: `/mimo`
- canonical event names:
  - Web → Server: `frontend_message`
  - Server → Web: `frontend_event`
  - Plugin ↔ Server: `plugin_message`

来源：
- `turbo/docs/system-design/contracts.md`（Socket 协议章节）
- `turbo/docs/system-design/code-structure.md`（Socket.IO 命名）
- 协议单一事实来源：`turbo/packages/mimo-protocol/src/socket.ts:3`

### 当前实现（对齐后）
- 协议常量：`turbo/packages/mimo-protocol/src/socket.ts:3`
- Web client 发/收：`turbo/packages/mimo-bus/src/client/frontend.ts:52`
- Plugin client 发/收：`turbo/packages/mimo-bus/src/client/plugin.ts:63`
- Server 监听：`turbo/apps/mimoserver/server/plugins/mimo-bus.ts:95`、`turbo/apps/mimoserver/server/plugins/mimo-bus.ts:112`
- Server emit：
  - Web events: `turbo/packages/mimo-bus/src/server/create-bus.ts:65`
  - Plugin messages: `turbo/packages/mimo-bus/src/server/create-bus.ts:71`

### 风险/影响（若偏离）
- 任何一方用“非 canonical 字符串”会导致消息收不到（静默失败），并让“协议单一事实来源”失效。

### 修正方案（已实施）
- Server/client 全部改为使用 `MimoSocketEvent.*`（来自 `mimo-protocol`），避免硬编码 event name。

---

## 2) `browser_action` ack/result 语义（闭环时序）

### 设计期望
- Server 下发 `browser_action` 后，Plugin **快速 ack `{ ok: true }`**（表示“已收到并开始执行”）
- Plugin 执行完成后，另行发送 `browser_action_result`（同属 `plugin_message` 事件流）

来源：
- `turbo/docs/system-design/contracts.md`（`browser_action` 章节）
- `turbo/docs/system-design/agent-runtime.md`（ActionScheduler + timeout 可观测性）

### 当前实现（对齐后）
- Plugin client 收到 `browser_action`：
  - 立即 ack：`turbo/packages/mimo-bus/src/client/plugin.ts:78`
  - 执行后 emit `browser_action_result`：`turbo/packages/mimo-bus/src/client/plugin.ts:89`
- Plugin 业务侧仅返回“执行结果片段”（status/result/error），不通过 ack 返回最终结果：
  - `turbo/apps/mimocrx/src/background/index.ts:168`

### 风险/影响（若偏离）
- 若把“最终结果”塞进 ack，而 Server 仍等待 `browser_action_result`，会触发 `PLUGIN_TIMEOUT_EXEC` 超时并造成任务卡死/误报失败。

### 修正方案（已实施）
- `onBrowserAction` 改为“先 ack，再 emit result”，并在 Server 侧增加兼容：若旧插件仍把完整 `browser_action_result` 放在 ack 回包里，直接 consume。
  - Server 兼容点：`turbo/apps/mimoserver/server/modules/action-scheduler.ts:54`

---

## 3) Room 策略与重复事件风险（task 隔离 vs 全局广播）

### 设计期望
- Web 侧按 task 订阅（`task:${taskId}`）获取该 task 的事件流（chatDelta/structuredOutput 等）
- 全局类事件（例如 Snapshot）要么明确为全局广播，要么有独立的订阅机制；避免“同一 payload 走多个 room 导致重复”

来源：
- `turbo/docs/system-design/contracts.md`（3.2 room 约定）
- `turbo/docs/system-design/code-structure.md`（frontend_event 统一 envelope）

### 当前实现（对齐后）
- Server 端将“task 事件”和“frontend broadcast”拆成两套 API：
  - task 定向：`turbo/packages/mimo-bus/src/server/create-bus.ts:65`
  - frontend 全局广播：`turbo/packages/mimo-bus/src/server/create-bus.ts:68`
- chatDelta/structuredOutput 只发 task room：
  - `turbo/apps/mimoserver/server/agent/orchestrator.ts:92`
- snapshotSync 只走 frontend broadcast（避免 task+frontend 双发重复）：
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:143`
- frontend socket 连接时加入 `frontend` room；首次发送 `user_message` 时加入对应 `task:${taskId}`：
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:91`
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:104`

### 风险/影响（若偏离）
- 若同一 envelope 同时发到 `frontend` 与 `task:${taskId}`，且同一 socket 同时在两个 room，会产生重复事件（UI 双渲染/双追加）。
- 若所有 task 事件都广播到 `frontend`，会造成会话串台（无关页面收到别的 task 的 chatDelta）。

### 修正方案（已实施）
- 将“task 定向”和“frontend 广播”显式拆分，并在业务侧按事件属性选择调用。

---

## 4) 边界处 runtime parse（zod）是否落实

### 设计期望
- 边界（Socket/HTTP）处对 `unknown` payload 做 runtime 校验/解析；parse 失败应丢弃并可选回 ack 错误

来源：
- `turbo/docs/system-design/code-structure.md`（协议层 parse/codec）

### 当前实现（对齐后）
- Server 端对入站消息做 parse：
  - `frontend_message`: `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:96`
  - `plugin_message`: `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:113`
- parse 失败（若存在 ack）回 `{ ok:false, error:{ code:"BAD_REQUEST" } }`：
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:98`
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:115`

### 风险/影响（若偏离）
- “unknown 直通”会让协议 drift 难以发现，且更易在边界处触发运行时异常或状态污染。

### 修正方案（已实施）
- 统一用 `mimo-protocol` 的 `parseFrontendMessage/parsePluginMessage` 作为边界入口。

---

## 5) Snapshot scope（是否需要 `taskId="global"` 约定）

### 设计期望
- Snapshot push 通过 `frontend_event` 内 `event.type="snapshotSync"` 推送（设计已明确）
- 但对 envelope 的 `taskId` 字段，设计文档未明确“全局 Snapshot”应填什么值（是否允许 `global` 特例）

### 当前实现（现状）
- Snapshot envelope 使用 `taskId="global"` 作为元数据（不用于 room 路由）：
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:143`
  - `turbo/apps/mimoserver/server/plugins/mimo-bus.ts:31`

### 风险/影响
- 如果前端严格用 `envelope.taskId` 做状态分片，可能把 Snapshot 误当成 task 事件存入某个 task（或丢弃）。

### 建议（待你最终确认）
二选一：
1) **文档补充约定**：允许 Snapshot 使用 `taskId="global"`（或固定 `"snapshot"`）作为全局频道标识；
2) **协议层扩展**：为 `snapshotSync` 增加明确的 `scope: "global" | { taskId: string }`，并允许 envelope.taskId 为真实 taskId/或固定值。

