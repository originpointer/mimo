# 现状诊断：mimoim / mimoserver / plasmo-app（2026-02-04）

目标：聚焦“拆分不彻底/关注点混杂”的代码，梳理跨项目耦合点与高风险模块，为后续分阶段重构提供依据。

## 一句话结论

- **mimoserver** 的 `server/plugins/bion-socket.ts` 过度聚合（Socket.IO + LLM + 工具编排 + 存储 + UI 事件），是当前最大结构风险。
- **mimoim** 在“API base / 端口”上存在明显不一致：多处用 `NEXT_PUBLIC_BION_URL`（Socket 端口）去请求 HTTP API，导致任务相关 API 在默认配置下不可用。
- **plasmo-app** 整体模块化已明显优于 mimoserver，但仍存在：连接管理类过大、日志噪音、重复注册、历史遗留（Hub/engine）未清理等“拆分不彻底”问题。

## 运行时/端口约定（当前 repo 默认）

- mimoserver Nitro HTTP：`PORT=6006`（见 `mimorepo/apps/mimoserver/.env`）
- bion Socket.IO：`BION_SOCKET_PORT=6007`（同上）
- plasmo-app：
  - HTTP base：`PLASMO_PUBLIC_BASE_URL=http://localhost:6006`（见 `mimorepo/apps/plasmo-app/.env`）
  - Socket bus：`PLASMO_PUBLIC_MIMO_BUS_URL=ws://localhost:6007`
- mimoim：`NEXT_PUBLIC_BION_URL=http://localhost:6007`（见 `mimorepo/apps/mimoim/.env`）

结论：**6007 是 Socket 端口；6006 是 HTTP API 端口**。

## 跨项目关键耦合点（目前真实依赖）

1. Socket 协议与事件
   - mimoim（页面客户端）通过 `@bion/client` 连接 Socket：`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`
   - plasmo-app（扩展）通过 `@bion/client` 连接 Socket：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`
   - mimoserver 运行 Socket.IO server：`mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`

2. HTTP API（extension registry / tasks / twin）
   - plasmo-app 使用 `PLASMO_PUBLIC_BASE_URL` 访问 `/api/extension/*`：`mimorepo/apps/plasmo-app/src/apis/register.ts`
   - mimoim 能正确访问 `/api/twin`（走 Next rewrite）：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`
   - 但 mimoim 的任务相关 API 走错端口（详见下文）

3. mimoim ↔ 扩展桥接（auto-discovery）
   - mimoim 通过 `window.postMessage` 请求扩展信息：`mimorepo/apps/mimoim/lib/extension-discovery.ts`
   - content-script 监听并转发到 background：`mimorepo/apps/plasmo-app/cached/content.ts`
   - background 返回 `GET_BION_CLIENT_INFO`：`mimorepo/apps/plasmo-app/src/background/handlers/legacy-handler-registry.ts`

## 主要设计问题清单

### A) mimoim（Next.js）

1. **API base 使用不一致（高优先级 bug）**
   - 任务相关请求使用 `NEXT_PUBLIC_BION_URL`（默认 6007）拼接 `/api/task/*`：
     - `mimorepo/apps/mimoim/components/sidebar/sidebar.tsx`（`/api/task/list`）
     - `mimorepo/apps/mimoim/app/chat/page.tsx`（`/api/task/id`）
     - `mimorepo/apps/mimoim/app/chat/[id]/page.tsx`（`/api/task/:id`）
   - 在当前 mimoserver 设计下，6007 是 **Socket** 端口（并非 Nitro HTTP），这些请求会失败/超时并触发各种 fallback，造成“功能看似能用但数据层不可信”的状态。

2. **任务/会话概念混用**
   - UI 以 `chatId == sessionId == taskId` 运行（注释也这样写），但又存在单独的 `/api/task/id` 生成逻辑与本地 UUID fallback，语义不统一。

3. **缺少显式的 API contract（类型/Schema）**
   - 任务接口返回结构未在客户端严格建模，很多地方用 `any` 或隐式字段（例如 `task.messages`）。
   - 同一概念（`TaskRecord`）在 server 与 mimoim 分别定义：`mimoim/lib/types.ts` vs `mimoserver/server/stores/taskStore.ts`。

4. **客户端数据层分散**
   - Chat 初始消息来自 server、增量来自 Socket、持久化在 localStorage，合并逻辑在页面组件中（可维护性一般）。

### B) mimoserver（Nitro）

1. **单文件聚合过多关注点（结构性风险最高）**
   - `mimorepo/apps/mimoserver/server/plugins/bion-socket.ts`（~2600 行）同时承担：
     - Socket.IO server 启动/端口容错
     - page/extension 连接管理
     - LLM 调用与 prompt（标题生成、agent loop）
     - 工具披露策略与缓存
     - Browser twin 状态维护与事件转换
     - 任务创建/标题更新/消息存储
     - UI 事件编排（browser selection / confirmation 等）

2. **存储策略并存且不一致（已出现路径不匹配）**
   - Nitro KV（`useStorage('data')`）用于 task/message store：
     - `mimorepo/apps/mimoserver/server/stores/taskStore.ts`
     - `mimorepo/apps/mimoserver/server/stores/messageStore.ts`
   - 文件系统写入用于 debug/审计：
     - `mimorepo/apps/mimoserver/server/utils/persist-message.ts`
     - `mimorepo/apps/mimoserver/server/utils/persist-llm-run.ts`
   - 但读取逻辑存在旧路径假设：
     - `mimorepo/apps/mimoserver/server/utils/load-messages.ts` 读取 `.data/tasks/{taskId}/messages/`
     - 与 `persist-message.ts` 的 `.data/messages/YYYY-MM-DD/...` 不匹配（容易产生“接口存在但永远空”的情况）

3. **全局可变状态**
   - `globalThis.__bion` 暴露 runtime 给其他路由（例如 `mimorepo/apps/mimoserver/server/routes/api/twin.get.ts`），导致隐式依赖与测试困难。

4. **日志与错误处理风格不统一**
   - plugin 中大量 `console.log` 与少量 `logger` 混用，且 debug 信息极多，生产/开发都可能被淹没。

5. **Import alias 不统一**
   - 同一项目同时出现 `@/...` 与 `~/...`（例如 `title.put.ts`、`task/id.get.ts`），会增加重构摩擦。

### C) plasmo-app（Browser extension）

1. **连接管理类过大 + 日志噪音**
   - `mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`（实际是 Bion socket manager）包含大量连接/同步/调试逻辑与冗长日志。
   - `BrowserStateSync` 也有大量无条件日志：`mimorepo/apps/plasmo-app/src/background/utils/browser-state-sync.ts`。

2. **重复注册/重复职责**
   - `StagehandXPathManager` 初始化时上报 extensionId：`mimorepo/apps/plasmo-app/src/background/managers/stagehand-xpath-manager.ts`
   - `BionSocketManager` connect 时也上报 extensionId：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`

3. **历史遗留未清理**
   - Hub command registry 为 stub，router 也不做 hub detect：
     - `mimorepo/apps/plasmo-app/src/background/message-router.ts`
     - `mimorepo/apps/plasmo-app/src/background/handlers/hub-command-handler-registry.ts`
   - tsconfig 仍 reference `@mimo/engine` 但实际不使用：`mimorepo/apps/plasmo-app/tsconfig.json`

4. **mimoim↔扩展 bridge 配置硬编码**
   - content-script 中允许的 origin 写死：`mimorepo/apps/plasmo-app/cached/content.ts`
   - 容易与 manifest、部署域名不一致，且常量在 mimoim 与 plasmo-app 重复定义。

## 建议的“优先级排序”（用于分阶段）

1. **P0：修复 mimoim 的任务 API base**（否则后续重构很难验证行为）
2. **P1：统一/明确 mimoserver 消息持久化的“唯一真源”**（KV vs FS，清理/下线旧路径）
3. **P1：拆分 mimoserver 的 bion-socket plugin 为可替换模块**（先拆文件/边界，再改逻辑）
4. **P2：plasmo-app 的连接/同步模块降噪与去重**（避免排查成本爆炸）

---

下一步：见 `mimorepo/.plans/2026-02-04-apps-refactor-plan.md` 的分阶段执行方案（每阶段包含交付物/验收/回滚）。

