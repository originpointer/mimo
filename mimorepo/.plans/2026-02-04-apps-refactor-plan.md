# 分阶段重构计划：mimoim / mimoserver / plasmo-app（2026-02-04）

本计划面向“拆分不彻底/关注点混杂”的问题，目标是在 **不一次性推倒重来** 的前提下，逐步把三端的边界拆清楚，并把跨项目契约（API/事件/配置）收拢到可维护的位置。  
执行策略：**先修 P0（可用性/验证闭环）→ 再拆骨架（模块化）→ 再收敛契约（共享包/Schema）→ 最后清理历史遗留。**

## Phase 0（P0）：建立可验证闭环（最小修复 + 观测）

### 目标
- 让 mimoim 在默认端口配置下能稳定读到 task 列表/详情/ID（不依赖超时 fallback）。
- 给后续重构提供稳定的“验收点”。

### 主要改动（建议一次 PR 完成）
- mimoim：把所有任务 API 调用切换为**正确的 API base**：
  - 客户端（browser）请求：优先使用相对路径 `fetch('/api/...')`（走 Next rewrites）。
  - 服务端（RSC）请求：引入 `NEXT_PUBLIC_MIMOSERVER_URL` 或推导 base（例如从 `NEXT_PUBLIC_BION_URL` 减 1 端口，逻辑与 `lib/extension-discovery.ts` 复用）。
- mimoim：抽出 `lib/mimoserver-api.ts`（或类似）集中管理 API base、fetchJson、超时策略，避免 scattered `AbortController` 片段。

### 验收标准
- `mimoim` 的 `Sidebar` 能在 `PORT=6006, BION_SOCKET_PORT=6007` 情况下加载任务列表。
- `/chat` 进入后生成 taskId 的路径不再依赖“请求 6007 超时”，并能从 server 成功拿到 taskId。
- `/chat/:id` 能从 server 拉到任务信息（若存在），并不出现长时间 hanging。

### 回滚策略
- 保留旧实现 1 个版本（例如函数级别保留），以 feature flag/快速 revert 方式回退。

---

## Phase 1（P1）：统一 HTTP API 契约与类型（减少“拆分不彻底”的跨端重复）

### 目标
- 把 `/api/task/*`、`/api/extension/*` 的请求/响应结构固化为 schema（避免 `any` 和字段漂移）。
- 让 mimoim / plasmo-app 共享同一套类型（最少先共享 task/extension 两类）。

### 主要改动
- 新增一个共享包（建议在 `mimorepo/packages/` 下）：
  - 例如：`packages/@mimo/mimoserver-api` 或 `packages/@mimo/app-api`
  - 内容包含：Zod schemas + TypeScript types + `createApiClient({ baseUrl })`
- mimoserver：在 routes 层统一响应形状（建议统一为 `{ ok: true, data: ... } | { ok: false, error: ... }`），并用 schema 做输入校验。
- mimoim：替换手写类型（`mimoim/lib/types.ts` 的 task 部分）为共享包类型；API 调用集中走 client。
- plasmo-app：`src/apis/register.ts` / `src/apis/toolCall.ts` 改为使用共享 client（或至少用共享类型）。

### 验收标准
- 三端对 task/extension 相关数据结构“同名同义”，且不再出现 `any` 透传。
- `turbo run check-types` 通过（至少覆盖改动到的包与 app）。

### 回滚策略
- 共享包先以“旁路”方式接入：旧接口保留，逐步迁移调用点。

---

## Phase 2（P1/P2）：mimoserver 的结构拆分（先拆文件边界，再拆逻辑）

### 目标
- 把 `server/plugins/bion-socket.ts` 的“上帝文件”拆成可维护模块，形成明确边界：
  - **基础设施**（Socket server/port/logger）
  - **应用服务**（任务、消息、选择、确认、twin）
  - **协议适配**（page/extension message handler）

### 推荐目录骨架（示例，不要求一次到位）
- `mimorepo/apps/mimoserver/server/bion/config.ts`：端口/env/config 读取与默认值
- `mimorepo/apps/mimoserver/server/bion/runtime.ts`：`BionRuntime` 定义与 `globalThis.__bion` 写入（或后续替代）
- `mimorepo/apps/mimoserver/server/bion/socket-server.ts`：`createServer + SocketIOServer + listenOnAvailablePort`
- `mimorepo/apps/mimoserver/server/bion/handlers/page.ts`：page 侧 `user_message/select/confirm` 处理
- `mimorepo/apps/mimoserver/server/bion/handlers/extension.ts`：extension 侧消息处理（activate/tab_event/action_result 等）
- `mimorepo/apps/mimoserver/server/bion/services/*`：
  - `taskService`（封装 taskStore）
  - `messageService`（封装 messageStore）
  - `browserSelectionService`（selectedClientId / candidates / pending）
  - `twinService`（browserTwin、事件转换）
  - `toolDisclosureService`（ToolDisclosurePolicy 的使用门面）

### 同步处理存储策略（必须在此阶段确认）
- 明确“消息真源”：
  - **选项 A（推荐）**：UI 展示消息以 Nitro KV（`messageStore.ts`）为真源；`persist-message.ts` 仅用于审计/调试。
  - **选项 B**：改造 `persist-message.ts` 写入结构与 `load-messages.ts` 读取结构一致，并让 UI 走 FS 日志（成本更高）。
- 对于当前不匹配的 `load-messages.ts`/`task/[taskId]/messages.get.ts`：
  - 要么修正路径并补齐写入
  - 要么标记 deprecated 并下线（避免误用）

### 验收标准
- plugin 入口文件变成“组合根（wiring）”，不再包含大段业务逻辑。
- `api/twin` 仍可用（`globalThis.__bion` 在过渡期可保留）。
- Socket 行为不变（扩展可连接、mimoim 可收流、twin_state_sync 可收到）。

### 回滚策略
- 采用“逐段搬迁 + 保持原导出”的方式：先拆文件并从旧文件 re-export，最终再删旧实现。

---

## Phase 3（P2）：plasmo-app 的“去重 + 降噪 + 清历史”

### 目标
- 降低调试噪音和重复上报；清理不再使用的历史结构，减少认知负担。

### 主要改动
- BionSocketManager 拆分：
  - `connection`（connect/disconnect/reconnect/backoff）
  - `registration`（extensionId/clientId 上报）
  - `stateSync`（full_state_sync 生成与发送）
  - `actions`（BrowserActionExecutor 的编排）
- 统一 extensionId 注册点：仅保留一个上报入口（推荐保留在“连接建立后”）。
- BrowserStateSync 的日志改为受 `debug` 控制（避免默认 console spam）。
- 清理 `HubCommandHandlerRegistry` / message router 的 dead path（或明确标记为 future，不参与主路径）。
- 移除 `tsconfig.json` 中对 `packages/@mimo/engine` 的无效 reference（若确认完全不再使用）。
- bridge 常量与 allowlist 配置收敛（建议跟 Phase 1 的共享包一起做）：
  - 共享 `MIMOIM_BRIDGE_REQUEST/RESPONSE` 常量
  - origin allowlist 可从 env/manifest 推导

### 验收标准
- 扩展在 dev 模式仍能：
  - 连接 Socket（6007）
  - 完成 full_state_sync
  - 持续发送 tab_event
  - 被 mimoim auto-discovery 正确识别并自动 select
- 控制台日志显著减少且可控（debug on/off）。

### 回滚策略
- 保留旧 manager 的适配层一段时间（新旧类并存，逐步切换）。

---

## Phase 4（P3）：统一术语与模型（taskId vs sessionId）

### 目标
- 明确“任务（Task）”与“会话（Session）”到底是不是一回事，避免隐式混用导致的边界污染。

### 两个可选方向（需要你确认）
- **方向 A（推荐）**：Task == Session（一个聊天就是一个任务），统一用 `taskId`，Bion 协议层仍用 `sessionId` 但做显式 mapping（或在 API 层做 alias）。
- **方向 B**：Task 与 Session 区分（一个 task 可包含多个 session/尝试），需要更完整的数据模型与迁移成本。

### 验收标准
- 代码与 API 文档中不再“同一字段多义”；UI、server、extension 对 ID 的含义一致。

---

## 建议执行顺序（默认）

1. Phase 0（修 mimoim 的 task API base）
2. Phase 1（共享 API contract/type + 统一响应）
3. Phase 2（拆 mimoserver bion-socket）
4. Phase 3（plasmo-app 去重/降噪/清历史）
5. Phase 4（术语与模型统一）

## 需要你确认的关键决策（执行前）

1. **消息存储真源选项**：KV（推荐） vs FS 日志（成本更高）
2. **ID 模型**：Task==Session（推荐） vs Task≠Session
3. **是否彻底移除旧 Hub/engine 路径**：现在仅清理引用，还是保留 feature flag
4. **bridge allowlist 策略**：仅 dev host 白名单 vs 可配置域名/正则

---

你确认后我再开始落地改动：建议先从 **Phase 0** 开始（改动面小、收益大、能立刻验证后续重构）。

