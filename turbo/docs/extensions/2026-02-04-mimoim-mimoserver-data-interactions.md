# mimoim（IM Web）↔ mimoserver（Nitro + Bion）数据交互梳理（2026-02-04）

> 范围：只关注 `mimorepo/apps/mimoim` 与 `mimorepo/apps/mimoserver` **两个项目之间**的 HTTP / Socket.IO 数据交互（不展开扩展端实现细节）。

---

## 0) 核心结论（先读这一段）

- **两条主链路**：
  1) **HTTP（Nitro）**：任务列表/任务详情/扩展注册列表/数字孪生初始快照等；
  2) **Socket.IO（Bion）**：聊天消息发送与流式回包、浏览器插件选择/确认、数字孪生实时同步。
- **会话/任务 ID 统一**：mimoim 里 `chatId` 直接作为 Bion `taskId`；mimoserver 侧在多数逻辑里把 `taskId` 当作 `taskId` 来持久化（tasks/messages）。
- **Twin（数字孪生）**：首屏用 `GET /api/twin` 拉一次快照，后续用 `twin_state_sync` 做实时推送。
- **注意点**：mimoim 有几处用 `NEXT_PUBLIC_BION_URL` 去拼 HTTP `.../api/task/*`；但 mimoserver 的 **HTTP** 与 **Bion Socket** 默认是两个端口（常见 `6006` vs `6007`）。这会导致这些请求在默认配置下“打到 Socket 端口”（可能失败），而 `/api/twin` 因为走了 Next rewrite 反而更稳。

---

## 1) 参与者、端口与 rewrite（对齐日志/环境变量）

### 1.1 参与者

- mimoim（Next.js Web）：`mimorepo/apps/mimoim`
- mimoserver（Nitro 服务端）：`mimorepo/apps/mimoserver`
  - HTTP API：Nitro 路由（`server/routes/**`）
  - Socket.IO：Bion 实时总线（`server/plugins/bion-socket.ts`）

### 1.2 默认端口与 rewrite

- mimoim dev：`http://localhost:3000`
- mimoim `/api/*` rewrite → `http://localhost:6006/api/*`
  - 配置：`mimorepo/apps/mimoim/next.config.ts`
- mimoserver HTTP 端口（Nitro dev）：常见 `6006`（由启动参数/环境变量决定）
- Bion（Socket.IO）端口：默认 `nitroPort + 1`，否则 fallback `6007`
  - 计算逻辑：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`
  - 明确覆盖：`BION_SOCKET_PORT`

### 1.3 关键环境变量（两端）

**mimoim（web）**
- `NEXT_PUBLIC_BION_ENABLED`：是否启用 Bion Socket 连接
  - 读取：`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`
- `NEXT_PUBLIC_BION_URL`：Bion Socket 基地址（默认 `http://localhost:6007`）
  - 读取：`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`
- `NEXT_PUBLIC_MIMOSERVER_URL`：mimoserver HTTP 基地址（用于 /api 直连）
  - 使用：`mimorepo/apps/mimoim/lib/extension-discovery.ts`（base candidates）

**mimoserver（server）**
- `BION_SOCKET_PORT`：固定 Bion Socket 端口（固定后将不再尝试 fallback 端口）
- `CORS_ORIGIN`：`OPTIONS /api/**` 的 `Access-Control-Allow-Origin`
  - 路由：`mimorepo/apps/mimoserver/server/routes/api/[...].options.ts`

---

## 2) HTTP 交互清单（mimoim ⇄ mimoserver）

> mimoim 侧有两种调用方式：
> - **相对路径**（走 Next rewrite）：`fetch('/api/...')`
> - **绝对地址**（直连）：`fetch(`${bionUrl}/api/...`)` 或多 base 兜底

### 2.1 `GET /api/twin`（数字孪生快照）

- mimoim → mimoserver
  - 调用：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`（`fetch('/api/twin')`）
  - 说明：相对路径会被 `next.config.ts` rewrite 到 `6006`，首屏兜底更稳
- mimoserver 实现：
  - `mimorepo/apps/mimoserver/server/routes/api/twin.get.ts`
  - 读取 `globalThis.__bion.getBrowserTwin().toJSON()`（来自 Bion 插件 runtime）
- 返回值结构（简化）：
  - `windows/tabs/groups` 为 `Record<number, State>`（mimoim 会转成 `Map<number, State>`）
  - `activeWindowId/activeTabId/lastUpdated/extensionState/systemState`
  - `toJSON()`：`mimorepo/packages/@twin/chrome/src/store.ts`

### 2.2 `GET /api/task/id`（生成任务/会话 ID）

- mimoim → mimoserver
  - 调用：`mimorepo/apps/mimoim/app/chat/page.tsx`（2s 超时，失败会本地生成 UUID）
  - 返回：`{ ok: true, data: { taskId } }`
- mimoserver 实现：`mimorepo/apps/mimoserver/server/routes/api/task/id.get.ts`

### 2.3 `GET /api/task/list`（任务列表）

- mimoim → mimoserver
  - 调用：`mimorepo/apps/mimoim/components/sidebar/sidebar.tsx`
  - 行为：每 3 秒轮询一次
  - 期望返回：`{ ok: true, data: TaskRecord[] }`
- mimoserver 实现：`mimorepo/apps/mimoserver/server/routes/api/task/list.get.ts`
  - 数据来自：`mimorepo/apps/mimoserver/server/stores/taskStore.ts`

### 2.4 `GET /api/task/:taskId`（任务详情 + 消息）

- mimoim → mimoserver
  - 调用：`mimorepo/apps/mimoim/app/chat/[id]/page.tsx`（SSR 预拉取初始 messages）
  - 期望返回：`{ ok: true, data: { ...task, messages } }`
- mimoserver 实现：`mimorepo/apps/mimoserver/server/routes/api/task/[taskId].get.ts`
  - 任务：`mimorepo/apps/mimoserver/server/stores/taskStore.ts`
  - 消息：`mimorepo/apps/mimoserver/server/stores/messageStore.ts`

### 2.5 `GET /api/extension/extension-list`（扩展注册列表）

- mimoim → mimoserver
  - 调用入口：
    - `mimorepo/apps/mimoim/lib/extension-discovery.ts`（`fetchExtensionList()` 多 base 兜底）
    - `mimorepo/apps/mimoim/app/chat/[id]/_hooks/use-extensions.ts`（扩展下拉）
    - `mimorepo/apps/mimoim/components/chat/browser-selection.tsx`（候选为空时诊断展示）
  - 返回：`{ ok: true, extensions, latest }`
- mimoserver 实现：`mimorepo/apps/mimoserver/server/routes/api/extension/extension-list.get.ts`
  - 存储：`mimorepo/apps/mimoserver/server/stores/extensionConfigStore.ts`

### 2.6 CORS / 预检

- `OPTIONS /api/**`：`mimorepo/apps/mimoserver/server/routes/api/[...].options.ts`
- `nitro.config.ts` 对 `/api/**` 额外设置了 CORS headers：`mimorepo/apps/mimoserver/nitro.config.ts`

---

## 3) Socket.IO（Bion）交互清单（mimoim ↔ mimoserver）

### 3.1 连接方式与事件名

- mimoim 创建连接：
  - `mimorepo/apps/mimoim/lib/hooks/use-bion.ts` → `createBionFrontendClient({ url, namespace:'/mimo', auth:{ clientType:'page' } })`
  - 客户端实现：`mimorepo/packages/@bion/client/src/frontend-client.ts`
- 协议事件名：
  - `message`：聊天消息与 envelope（双向）
  - `twin_state_sync`：数字孪生实时同步（server → page，直发，不走 envelope）
  - 定义：`mimorepo/packages/@bion/protocol/src/socket.ts`

### 3.2 mimoim → mimoserver：`message`（发送的消息类型）

发送位置：`mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`

| type | 语义 | 关键字段 |
| --- | --- | --- |
| `user_message` | 用户输入 | `id`（userMessageId）、`taskId`（chatId）、`content` |
| `select_my_browser` | 选择浏览器插件实例 | `targetClientId` |
| `confirm_browser_task` | 确认/取消浏览器任务 | `requestId`、`confirmed` |

类型定义：`mimorepo/packages/@bion/protocol/src/frontend.ts`

### 3.3 mimoserver → mimoim：`message`（frontend event envelope）

mimoim 消费位置：`mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`（`client.onEnvelope(...)`）

envelope 结构：`{ type:'event', id, taskId, timestamp, event }`
- 定义：`mimorepo/packages/@bion/protocol/src/frontend.ts`

关键 event（mimoim 有显式处理的）：
- `chatDelta`：流式增量文本（以 `targetEventId=userMessageId` 关联）
- `myBrowserSelection`：等待选择/已选择
- `browserTaskConfirmationRequested`：请求用户确认将要执行的浏览器任务
- `structuredOutput`：mimoserver 用于兜底输出错误（mimoim 将 `status=error` 展示为一条 assistant 消息）
- `toolUsed`：mimoserver 会发，但 mimoim 当前选择忽略渲染（`assistant_only`）

mimoserver 发出位置（核心）：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`

### 3.4 mimoserver → mimoim：`twin_state_sync`（实时 Twin）

- mimoim 消费：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`（`client.socket.on('twin_state_sync', ...)`）
- mimoserver 广播：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`
  - 来自扩展的 `full_state_sync` / `tab_event` 更新后，`nsp.emit(BionSocketEvent.TwinStateSync, ...)`
- payload 类型：`mimorepo/packages/@bion/protocol/src/plugin.ts`（`BionTwinStateSyncMessage`）

---

## 4) 典型时序（帮助快速定位“哪一段链路出问题”）

### 4.1 新建会话（/chat）

1) mimoim 尝试 `GET ${NEXT_PUBLIC_BION_URL}/api/task/id` 拿 `taskId`（2s 超时）
2) 失败则本地生成 UUID（仍作为 `chatId/taskId` 使用）
3) 进入 ChatPageClient，建立 Bion Socket 连接（若 `NEXT_PUBLIC_BION_ENABLED=true`）

调用：`mimorepo/apps/mimoim/app/chat/page.tsx`、`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`

### 4.2 发送消息与流式回包（核心聊天）

1) mimoim `message` → `user_message(taskId, id, content)`
2) mimoserver：
   - 持久化 user message：`saveMessage(taskId, { id, role:'user', ... })`
   - 确保 task 存在：不存在则 `createTask(..., taskId)`（并可更新 title）
   - LLM stream：持续发送 envelope `chatDelta(delta.content, targetEventId=id)`
   - 结束：`chatDelta(finished=true)`；持久化 assistant message（`id=assistant:${userMessageId}`）

实现：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`（`msgType === 'user_message'` 分支）

### 4.3 选择浏览器插件与确认执行（从 mimoim 视角仍是“与 mimoserver 交互”）

1) mimoserver 需要执行 browser task 时，发送：
   - `myBrowserSelection(status='waiting_for_selection')` 或自动 `selected`
   - `browserTaskConfirmationRequested(requestId, summary, ...)`
2) mimoim 发送：
   - `select_my_browser(targetClientId)`
   - `confirm_browser_task(requestId, confirmed)`
3) mimoserver 执行后会发送 `toolUsed` / `structuredOutput` 等事件（mimoim 当前主要消费 `structuredOutput` 的 error）

实现：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`（`select_my_browser` / `confirm_browser_task` 分支）

### 4.4 Twin 首屏与实时同步

1) mimoim 首屏 `GET /api/twin`（走 Next rewrite 到 mimoserver HTTP）
2) 同时若 Bion Socket 已连接，订阅 `twin_state_sync`，后续增量覆盖 UI

调用：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`

---

## 5) 服务端持久化与数据模型（理解“为什么刷新后还能看到历史”）

### 5.1 Nitro Storage（文件系统 KV）

- mimoserver 存储配置：`mimorepo/apps/mimoserver/nitro.config.ts`（`storage.data.driver='fs'`，`base='.data/kv'`）
- tasks：
  - key：`tasks:task:${taskId}`
  - 代码：`mimorepo/apps/mimoserver/server/stores/taskStore.ts`
- messages：
  - key：`messages:task:${taskId}`
  - 代码：`mimorepo/apps/mimoserver/server/stores/messageStore.ts`
- extension registrations：
  - key：`extensionId:${extensionId}`（以及按 name 的 `extension:${extensionName}`）
  - 代码：`mimorepo/apps/mimoserver/server/stores/extensionConfigStore.ts`

### 5.2 taskId == taskId 的耦合点

- mimoserver 在 `user_message` 分支里用 `taskId` 去读写 task/messages：
  - `getTask(taskId)` / `createTask(..., taskId)`
  - `saveMessage(taskId, ...)`
- 结果：mimoim 的 `chatId`（taskId）天然可用作 taskId（无额外映射表）

---

## 6) 风险点 / 排查清单（最常见的“连不上/没数据”）

1) **HTTP 端口与 Socket 端口混用**
- mimoim 的 task 相关请求使用：`${NEXT_PUBLIC_BION_URL}/api/task/*`
  - 涉及文件：`mimorepo/apps/mimoim/app/chat/page.tsx`、`mimorepo/apps/mimoim/components/sidebar/sidebar.tsx`、`mimorepo/apps/mimoim/app/chat/[id]/page.tsx`
- 默认端口规划下 `NEXT_PUBLIC_BION_URL` 指向 Socket（`6007`），而 HTTP 在 `6006`。
  - 现象：任务列表/任务详情拉不到或间歇失败；但 Twin（`/api/twin`）因为走 rewrite 反而正常。

2) **Bion Socket 端口被占用导致自动切换**
- mimoserver 日志会打印：`[Bion] Socket.IO port 6007 is in use; using 6009 instead`
- mimoim 自身也在 UI 里提示用日志中的：`[Bion] Socket.IO server listening on :XXXX/mimo` 为准
  - 提示 UI：`mimorepo/apps/mimoim/components/chat/browser-selection.tsx`

3) **Twin API 依赖 Bion runtime**
- `/api/twin` 读取 `globalThis.__bion`；若 Bion 插件未初始化或异常退出，会 503（或直接报错）
  - 实现：`mimorepo/apps/mimoserver/server/routes/api/twin.get.ts`

---

## 附录：相关代码入口索引（按“找代码”路径组织）

- mimoim
  - `/api` rewrite：`mimorepo/apps/mimoim/next.config.ts`
  - Bion client：`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`
  - Chat（socket 收发）：`mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`
  - Twin（HTTP + socket）：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`
  - Extension list（HTTP base candidates）：`mimorepo/apps/mimoim/lib/extension-discovery.ts`
- mimoserver
  - Nitro 配置：`mimorepo/apps/mimoserver/nitro.config.ts`
  - Bion Socket 插件：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`
  - API routes：`mimorepo/apps/mimoserver/server/routes/api/**`
  - Stores：`mimorepo/apps/mimoserver/server/stores/**`
- 协议/客户端包
  - Socket 事件名：`mimorepo/packages/@bion/protocol/src/socket.ts`
  - Frontend 消息与 envelope：`mimorepo/packages/@bion/protocol/src/frontend.ts`
  - Twin sync payload：`mimorepo/packages/@bion/protocol/src/plugin.ts`
  - Frontend client 实现：`mimorepo/packages/@bion/client/src/frontend-client.ts`

