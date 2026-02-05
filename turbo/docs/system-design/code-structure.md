# 协议到代码结构落地（Turbo Monorepo）

本设计把 `docs/system-design/contracts.md` 与 `docs/system-design/agent-runtime.md` 的协议/时序，落到 Turbo monorepo 的 **代码结构与模块边界**上。
目标是：协议有单一事实来源（types+schema），Web/Server/Plugin 都能复用；Socket.IO 通讯具备清晰命名、路由与兼容层。

---

## 1. 命名（v1 canonical）与兼容映射

### 1.1 Socket.IO（namespace + event）

- namespace：`/mimo`
- canonical events：
  - `frontend_message`：Web → Server（命令/输入）
  - `frontend_event`：Server → Web（事件流 envelope，含 chatDelta / snapshotSync 等）
  - `plugin_message`：Plugin ↔ Server（握手/同步/browser_action/结果）

兼容旧命名（**非 MVP**，仅保留说明）：

| 旧事件名 | 新事件名 |
|---|---|
| `message` | `frontend_message` + `frontend_event`（历史上同名双向复用） |
| `my_browser_extension_message` | `plugin_message` |
| `twin_state_sync` | `frontend_event` 内的 `event.type = "snapshotSync"`（legacy，非 MVP） |

### 1.2 消息 type（推荐）

> 协议内的 `type` 字段用于路由；TS 侧用更语义化的类型名，但 wire 保持稳定字符串。

Web → Server：
- `user_message`

Server → Web（envelope `event.type`）：
- `chatDelta`
- `structuredOutput`
- `snapshotSync`（legacy alias：`twin_state_sync`，非 MVP）

Plugin ↔ Server：
- `activate_extension`
- `full_state_sync`
- `tab_event`
- `task_status`
- `browser_action`
- `browser_action_result`（并兼容旧“无 type 的 result”）

### 1.3 本地 bridge（可选，仅诊断）

canonical：
- `mimo/get_plugin_client_info`
- `mimo/get_plugin_client_info_result`

alias（旧）：
- `mimoim/get_bion_client_info`
- `mimoim/get_bion_client_info_result`

### 1.4 代码引用约定（重要）

> 对齐 `docs/users/projects.md`：减少 `../..` 引用，保持可读性与可迁移性。

- **当前目录下的子路径**：使用相对路径（例如 `./lib`、`./components/button`）。
- **涉及上级目录的引用**：使用 alias 从项目根目录引用（例如 `@/lib`、`@/components/...`），避免 `../` 链式引用。
  - 约定：各 app/package 的 tsconfig 将 `@/*` 映射到自身的 `src/*`（或约定根目录），保持同一语义。
- **跨 package**：使用 workspace 包名引用（例如 `mimo-protocol`、`mimo-bus`）。
- **强约束（建议 lint 强制）**：业务代码中禁止 `../` import（例如 `src/**/*.{ts,tsx,js,jsx}`）。

---

## 2. Monorepo 建议目录结构

```text
apps/
  mimoim/              # Next.js（Chat UI + Snapshot UI）
  docs/                # Next.js（文档站点，可直接渲染 turbo/docs/）
  mimocrx/             # Plasmo（Chrome MV3 Extension：background + content + CDP）
  mimoserver/          # Nitro(or Node) + Socket.IO（HTTP+Bus 同端口）

packages/
  mimo-protocol/       # 协议单一事实来源（types + zod schema + codec）
  mimo-bus/            # Socket.IO server/client 封装（强类型 + 兼容层）
  mimo-agent/          # （可选）MVP 后期：把 AgentRuntime 抽为可复用库
```

> MVP 建议先把 AgentRuntime 放在 `apps/mimoserver/src/agent/`，等稳定后再抽到 `packages/mimo-agent`。

---

## 3. `packages/mimo-protocol`（单一事实来源）

目标：所有跨进程的 payload 都在这里定义，并提供 **运行时校验（zod）+ 兼容 codec**。

```text
packages/mimo-protocol/
  src/
    index.ts
    version.ts
    socket.ts            # namespace + event names（含 alias）
    http.ts              # HTTP response envelopes + DTO
    messages/
      frontend.ts        # FrontendToServer + FrontendEventEnvelope
      plugin.ts          # PluginMessage + BrowserAction + Result
      snapshot.ts        # SnapshotState、TabEvent、FullStateSync
    schemas/
      frontend.ts        # zod schemas（parse/validate）
      plugin.ts
      snapshot.ts
    codec.ts             # snake_case / legacy-name 兼容映射
```

推荐 exports（面向使用方）：

- `MIMO_NAMESPACE`、`MimoSocketEvent`（canonical + aliases）
- `FrontendToServerMessage`、`FrontendEventEnvelope`、`PluginMessage`
- `parseFrontendToServerMessage()` / `parsePluginMessage()`（zod）
- `encodeLegacy()` / `decodeLegacy()`（若需要与旧 wire 对接）

设计要点：

- **TS 类型 + zod schema 成对出现**：边界处只消费 `parse*()` 的结果，避免“unknown 直通”。
- **codec 放在协议层**：兼容字段（snake_case / old type string）在最外层解码后再进入业务逻辑。

---

## 4. `packages/mimo-bus`（Socket.IO 封装与路由）

目标：把 `socket.io-client`/`socket.io` 的细节藏起来，提供：

- Web 侧：`createFrontendBusClient()`（收 `frontend_event`，发 `frontend_message`）
- Plugin 侧：`createPluginBusClient()`（收发 `plugin_message`）
- Server 侧：`createBusServer()`（统一挂载、鉴权、room 管理、兼容旧 event 名）

```text
packages/mimo-bus/
  src/
    index.ts
    client/
      frontend.ts
      plugin.ts
    server/
      create-bus.ts
      auth.ts
      rooms.ts            # task:${id}, client:${id}
      legacy-bridge.ts    # 旧 event 名与旧 type 的桥接
      ack-tracker.ts      # action ack/timeout 工具
```

Server 路由模式（建议）：

- `frontend_message`：按 `msg.type` switch/registry → `FrontendHandlers`
- `plugin_message`：按 `msg.type` switch/registry → `PluginHandlers`
- 所有 emit 到 Web 的数据，都统一走 `frontend_event` 的 envelope（方便落库回放）

---

## 5. `apps/mimoserver`（HTTP + Bus + AgentRuntime）

### 5.1 目录结构（建议）

```text
apps/mimoserver/
  src/
    main.ts
    config/
      env.ts
    http/
      routes/
        api/
          task/
            id.get.ts
            list.get.ts
            [taskId].get.ts
          extension/
            extension-id.post.ts
            extension-list.get.ts
          snapshot.get.ts
          artifacts/
            presign.post.ts
            [artifactId].get.ts
            [artifactId]/upload.post.ts
    bus/
      index.ts            # createBusServer + handlers 绑定
      handlers/
        frontend.ts
        plugin.ts
    modules/
      task-store.ts
      message-store.ts
      extension-registry.ts
      snapshot-store.ts
      artifact-service.ts
      action-scheduler.ts
    agent/
      orchestrator.ts
      llm-gateway.ts
      tool-runner.ts      # browser_action 下发 + result 回收
      prompts/
        system.md
```

### 5.2 协议 → 模块映射（核心）

- `user_message` → `agent/orchestrator.ts`（创建/加载 task，上下文拼装，触发 LLM 流）
- `activate_extension` → `modules/extension-registry.ts`（更新在线状态 + 元数据）
- `full_state_sync`/`tab_event` → `modules/snapshot-store.ts`（更新 Snapshot，并向 Web emit `snapshotSync`）
- `browser_action_result` → `modules/action-scheduler.ts`（完成/失败、唤醒等待者、落库、通知 Web/LLM）

### 5.3 “页面准备”落地（来自 state-base-action-tools）

在 `agent/tool-runner.ts` 里实现一个固定的 `preparePage()`：

1. `task_start`（若需打开 URL / 创建 task tab + group）
2. `browser_debugger_attach`（可选）
3. `browser_wait_for_loaded`（loaded）
4. 并行或串行（取决于插件能力）：
   - `browser_screenshot` → artifact
   - `browser_readability_extract` → inline 或 artifact
5. 将 page context（readability + screenshotUrl + tabId）回灌到 LLM（继续下一轮推理/动作）

---

## 6. `apps/mimoim`（Socket 事件流消费与状态组织）

建议把“数据访问层”拆成两层：

1. `lib/api/*`：HTTP（task/snapshot/extension/artifacts）
2. `lib/bus/*`：Socket（frontend_message/frontend_event）

事件流消费策略（MVP）：

- `chatDelta`：按 `targetEventId` 追加到对应消息气泡（或作为流式 assistant message 缓冲）。
- `snapshotSync`：
  - **全量覆盖**（MVP 仅推送 `mode=full`）。
  - 200ms 去抖合并；若 `seq` 或 `lastUpdated` 不递增则忽略。
  - Socket 重连后先 `GET /api/snapshot` 进行重置，再消费后续事件。
- `structuredOutput`：用于 UI 错误兜底展示（并驱动 task.status=error 的提示）。

---

## 7. `apps/mimocrx`（Browser Plugin：Plasmo MV3）

职责对齐 Manus：**Executor + Observer + KeepAlive**。

建议模块切分（MVP）：

- `background/managers/session-manager.ts`：会话/任务状态（running/stopped/takeover）。
- `background/managers/keep-alive-manager.ts`：MV3 保活（定期调用 Extension API，保住 WebSocket/CDP 会话）。
- `background/clients/cdp-client.ts`：封装 `chrome.debugger`（screenshot + Input.dispatch*）。
- `background/bus/plugin-client.ts`：Socket client（收 `browser_action`，发 `browser_action_result`）。
- `content/state-machine.ts`：UI 四态（idle/hidden/ongoing/takeover）+ 遮罩/状态栏。
- `content/dom-indexer.ts`：注入 `data-mimo_click_id` 并产出可点击元素列表（对齐 Manus 的 index 定位）。

---

## 8. 实施顺序（建议）

1. 落地 `packages/mimo-protocol`（types + zod + codec + constants）。
2. 落地 `apps/mimoserver` 的 Socket bus：能收 `user_message` 并回 `chatDelta`（先不接插件）。
3. 落地 `apps/mimoserver` 的 `extension-registry` + 自动选择逻辑。
4. 接入 `apps/mimocrx`：先跑通 `browser_action(browser_screenshot)` 的 ack + result + artifact。
5. 接入 Snapshot：`full_state_sync` → Web `snapshotSync`。
