# 协议到代码结构落地（Turbo Monorepo）

本设计把 `docs/system-design/contracts.md` 与 `docs/system-design/agent-runtime.md` 的协议/时序，落到 Turbo monorepo 的 **代码结构与模块边界**上。
目标是：协议有单一事实来源（types+schema），Web/Server/Plugin 都能复用；Socket.IO 通讯具备清晰命名、路由与兼容层。

---

## 1. 命名（v1 canonical）与兼容映射

### 1.1 Socket.IO（namespace + event）

- namespace：`/mimo`
- canonical events：
  - `frontend_message`：Web → Server（命令/输入）
  - `frontend_event`：Server → Web（事件流 envelope，含 chatDelta / twinSync 等）
  - `plugin_message`：Plugin ↔ Server（握手/同步/browser_action/结果）

兼容旧命名（如需对接旧实现）：

| 旧事件名 | 新事件名 |
|---|---|
| `message` | `frontend_message` + `frontend_event`（历史上同名双向复用） |
| `my_browser_extension_message` | `plugin_message` |
| `twin_state_sync` | `frontend_event` 内的 `event.type = "twinSync"`（可选保留独立事件做桥接） |

### 1.2 消息 type（推荐）

> 协议内的 `type` 字段用于路由；TS 侧用更语义化的类型名，但 wire 保持稳定字符串。

Web → Server：
- `user_message`
- `select_browser_client`（alias：`select_my_browser`）
- `confirm_browser_action`（alias：`confirm_browser_task`）

Server → Web（envelope `event.type`）：
- `chatDelta`
- `browserSelection`（alias：`myBrowserSelection`）
- `browserActionConfirmationRequested`（alias：`browserTaskConfirmationRequested`）
- `structuredOutput`
- `twinSync`（alias：`twin_state_sync`）

Plugin ↔ Server：
- `activate_extension`
- `full_state_sync`
- `tab_event`
- `session_status`
- `browser_action`
- `browser_action_result`（并兼容旧“无 type 的 result”）

### 1.3 本地 bridge（可选，仅诊断）

canonical：
- `mimo/get_plugin_client_info`
- `mimo/get_plugin_client_info_result`

alias（旧）：
- `mimoim/get_bion_client_info`
- `mimoim/get_bion_client_info_result`

---

## 2. Monorepo 建议目录结构

```text
apps/
  web/                 # Next.js（Chat UI + Twin UI）
  docs/                # Next.js（文档站点，可直接渲染 docs/）
  mimoserver/          # Nitro(or Node) + Socket.IO（HTTP+Bus 同端口）

packages/
  mimo-protocol/       # 协议单一事实来源（types + zod schema + codec）
  mimo-bus/            # Socket.IO server/client 封装（强类型 + 兼容层）
  # （可选）mimo-agent/ # 若未来需要把 AgentRuntime 抽为可复用库
```

> MVP 建议先把 AgentRuntime 放在 `apps/mimoserver/src/agent/`，等稳定后再抽包。

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
      twin.ts            # TwinState、TabEvent、FullStateSync
    schemas/
      frontend.ts        # zod schemas（parse/validate）
      plugin.ts
      twin.ts
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
      rooms.ts            # session:${id}, client:${id}
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
          twin.get.ts
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
      session-store.ts
      message-store.ts
      extension-registry.ts
      twin-store.ts
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

- `user_message` → `agent/orchestrator.ts`（创建/加载 session，上下文拼装，触发 LLM 流）
- `select_browser_client` → `modules/extension-registry.ts`（绑定 selected client，并 emit `browserSelection`）
- `confirm_browser_action` → `agent/tool-runner.ts`（在确认后才允许下发 browser_action）
- `activate_extension` → `modules/extension-registry.ts`（更新在线状态 + 元数据）
- `full_state_sync`/`tab_event` → `modules/twin-store.ts`（更新 Twin，并向 Web emit `twinSync`）
- `browser_action_result` → `modules/action-scheduler.ts`（完成/失败、唤醒等待者、落库、通知 Web/LLM）

### 5.3 “页面准备”落地（来自 state-base-action-tools）

在 `agent/tool-runner.ts` 里实现一个固定的 `preparePage()`：

1. `session_start`（若需打开 URL / 创建 session tab + group）
2. `browser_debugger_attach`（可选）
3. `browser_wait_for_loaded`（loaded）
4. 并行或串行（取决于插件能力）：
   - `browser_screenshot` → artifact
   - `browser_readability_extract` → inline 或 artifact
5. 将 page context（readability + screenshotUrl + tabId）回灌到 LLM（继续下一轮推理/动作）

---

## 6. `apps/web`（Socket 事件流消费与状态组织）

建议把“数据访问层”拆成两层：

1. `lib/api/*`：HTTP（task/twin/extension/artifacts）
2. `lib/bus/*`：Socket（frontend_message/frontend_event）

事件流消费策略（MVP）：

- `chatDelta`：按 `targetEventId` 追加到对应消息气泡（或作为流式 assistant message 缓冲）。
- `browserSelection`：更新“选择插件”弹窗与 session 的 `selectedClientId`。
- `browserActionConfirmationRequested`：展示确认弹窗；用户操作后 emit `confirm_browser_action`。
- `twinSync`：用 `lastUpdated` 去抖/覆盖 Twin store（优先全量覆盖，后续再做增量合并）。
- `structuredOutput`：用于 UI 错误兜底展示（并驱动 task.status=error 的提示）。

---

## 7. Browser Plugin（不在本 repo 时的集成建议）

如果插件代码不放进 Turbo：

- 仍建议复用 `packages/mimo-protocol`（通过私有 npm package 或 git submodule）。
- 插件侧只需要实现 `plugin_message` 的 handler：
  - 收 `browser_action`（ack + 执行 + 回传 result）
  - 发 `activate_extension`、`full_state_sync`、`tab_event`、`session_status`
- 大 payload 走 `artifacts/presign`：插件请求 presign（或 Server 在 browser_action 中带 uploadUrl），直接上传。

---

## 8. 实施顺序（建议）

1. 落地 `packages/mimo-protocol`（types + zod + codec + constants）。
2. 落地 `apps/mimoserver` 的 Socket bus：能收 `user_message` 并回 `chatDelta`（先不接插件）。
3. 落地 `apps/mimoserver` 的 `extension-registry` + 选择/确认 UI 事件。
4. 接入插件：先跑通 `browser_action(browser_screenshot)` 的 ack + result + artifact。
5. 接入 Twin：`full_state_sync` → Web `twinSync`。

