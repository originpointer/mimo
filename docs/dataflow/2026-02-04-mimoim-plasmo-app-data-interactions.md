# mimoim（IM Web）↔ plasmo-app（浏览器扩展）数据交互梳理（重读版，2026-02-04）

> 覆盖旧版报告（同文件名）。
>
> 核心结论：mimoim 与 plasmo-app 的**直连**只用于“发现/探测在线插件实例”（`window.postMessage` 桥）；真正的“执行浏览器任务/同步数字孪生”全部通过 **mimoserver（Socket.IO / Bion）**中转：mimoim ↔ mimoserver ↔ plasmo-app。

---

## 0) 交互清单（按链路分组）

### A. 直连（mimoim ⇄ plasmo-app）：仅“插件发现/连通性探测”

- `window.postMessage`（mimoim Page World → 扩展 content-script）
  - 请求：`mimoim/get_bion_client_info`
  - 响应：`mimoim/get_bion_client_info_result`
- `chrome.runtime.sendMessage`（content-script → background，扩展内部消息）
  - 请求：`GET_BION_CLIENT_INFO`
  - 响应：`{ ok, extensionId, extensionName, version, clientId, socketConnected }`

### B. 间接（mimoim ⇄ mimoserver ⇄ plasmo-app）：任务执行与数字孪生

- HTTP（mimoim → mimoserver）
  - `/api/extension/extension-list`：获取扩展注册列表（用于 UI/诊断/选择）
  - `/api/twin`：获取数字孪生初始状态（首屏降级）
- HTTP（plasmo-app → mimoserver）
  - `/api/extension/extension-id`：扩展注册/绑定信息上报
- Socket.IO（mimoim ↔ mimoserver）：event `message`
  - mimoim → server：`user_message`、`select_my_browser`、`confirm_browser_task`
  - server → mimoim：frontend event envelope（如 `chatDelta`、`myBrowserSelection`、`browserTaskConfirmationRequested` 等）
- Socket.IO（plasmo-app ↔ mimoserver）：event `my_browser_extension_message`
  - server → 扩展：`browser_action`（ack 机制）
  - 扩展 → server：`activate_extension`、`full_state_sync`、`tab_event`、`session_status` 等
- Socket.IO（server → mimoim）：event `twin_state_sync`
  - 推送数字孪生实时同步

---

## 1) 参与者、端口与事件名（便于对齐日志）

### 1.1 参与者

- mimoim（Web）：`mimorepo/apps/mimoim`
- plasmo-app（扩展）：`mimorepo/apps/plasmo-app`
- mimoserver（后端）：HTTP + Socket.IO（Bion）

### 1.2 端口与 rewrite

- mimoim 默认：`http://localhost:3000`
- mimoim 的 `/api/*` rewrite 到：`http://localhost:6006/api/*`
  - 配置：`mimorepo/apps/mimoim/next.config.ts`
- Bion（Socket.IO）默认：`http://localhost:6007`，namespace：`/mimo`
  - mimoim：`mimorepo/apps/mimoim/lib/hooks/use-bion.ts`
  - plasmo-app：`mimorepo/apps/plasmo-app/src/background/index.ts`

### 1.3 Socket.IO event 名称（来自协议层）

- Frontend（mimoim）↔ server：`message`
  - `mimorepo/packages/@bion/protocol/src/socket.ts`
  - `mimorepo/packages/@bion/client/src/frontend-client.ts`
- Plugin（扩展）↔ server：`my_browser_extension_message`
  - `mimorepo/packages/@bion/protocol/src/socket.ts`
  - `mimorepo/packages/@bion/client/src/plugin-client.ts`
- Twin（server → mimoim）：`twin_state_sync`
  - mimoim 直接监听：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`

---

## 2) 直连链路：mimoim ↔ plasmo-app（bridge 探测）

> mimoim 在 Page World 不直接依赖 `chrome.runtime.*`（代码内未发现 `chrome.runtime` 调用）；它用 `window.postMessage` 让扩展 content-script 代为调用扩展 API。

### 2.1 mimoim → content-script：`mimoim/get_bion_client_info`

发送位置：`mimorepo/apps/mimoim/lib/extension-discovery.ts`（`probeBionClientInfoViaBridge()`）

- 请求结构（简化）：

```ts
window.postMessage({ type: "mimoim/get_bion_client_info", requestId }, "*")
```

- 响应结构（简化）：

```ts
window.postMessage({ type: "mimoim/get_bion_client_info_result", requestId, payload }, "*")
```

其中 `payload` 类型（mimoim）：
- `ok: true`：`extensionId/extensionName/version/clientId/socketConnected`
- `ok: false`：`error`
  - 类型定义：`mimorepo/apps/mimoim/lib/extension-discovery.ts`

### 2.2 content-script：origin 白名单 + 转发 `GET_BION_CLIENT_INFO`

实现位置：`mimorepo/apps/plasmo-app/cached/content.ts`

关键行为：
- 只接受 origin 为 `http://localhost:3000` 或 `http://127.0.0.1:3000` 的请求；
- 调用扩展内部消息：`chrome.runtime.sendMessage({ type: 'GET_BION_CLIENT_INFO' }, cb)`；
- 再把响应 `postMessage` 回页面。

### 2.3 background：处理 `GET_BION_CLIENT_INFO`

实现位置：`mimorepo/apps/plasmo-app/src/background/handlers/legacy-handler-registry.ts`

数据来源与语义：
- `extensionId`：`chrome.runtime.id`
- `extensionName/version`：`chrome.runtime.getManifest()`
- `clientId`：`chrome.storage.local` 的 `bionClientId`
- `socketConnected`：扩展到 mimoserver 的 Bion Socket.IO 是否已连接

### 2.4 直连链路在 mimoim 的用途

1) **自动选择在线插件实例（chat 核心）**
- `mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`：
  - 轮询 `waitForConnectedBionClient()`（内部反复调用 bridge 探测）
  - 一旦 `socketConnected=true`，拿到 `clientId`，立刻向 server 发送 `select_my_browser`

2) **无候选时的诊断信息**
- `mimorepo/apps/mimoim/components/chat/browser-selection.tsx`：候选列表为空时展示 bridge 探测结果与 extension-list 返回

3) **独立 Hook（目前仅被 import，未实际使用）**
- `mimorepo/apps/mimoim/app/chat/[id]/_hooks/use-plugin-info.ts`

---

## 3) 间接链路：mimoim ⇄ mimoserver ⇄ plasmo-app（Bion/HTTP）

### 3.1 HTTP：扩展注册与扩展列表

#### (1) plasmo-app → mimoserver：`POST /api/extension/extension-id`

扩展上报位置：
- `mimorepo/apps/plasmo-app/src/background/managers/stagehand-xpath-manager.ts`（启动时上报）
- `mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`（socket connect 后携带 meta 再上报）

请求实现：`mimorepo/apps/plasmo-app/src/apis/register.ts`

#### (2) mimoim ← mimoserver：`GET /api/extension/extension-list`

mimoim 拉取位置：
- `mimorepo/apps/mimoim/lib/extension-discovery.ts`（`fetchExtensionList()`）
- `mimorepo/apps/mimoim/app/chat/[id]/_hooks/use-extensions.ts`（轮询/刷新扩展列表）
- `mimorepo/apps/mimoim/components/chat/browser-selection.tsx`（诊断 UI）

补充：`fetchExtensionList()` 会尝试多个 base（`NEXT_PUBLIC_MIMOSERVER_URL`、由 `NEXT_PUBLIC_BION_URL` 推导的 `port-1`、`http://localhost:6006`、以及同源空串 `''`）。

> 注意：extension-list 是“扩展 runtime id（extensionId）维度”的注册信息；而任务路由关键字段是 Bion 的 `clientId`（插件实例 id）。mimoim 通过 bridge 才能拿到 `clientId`。

### 3.2 Socket.IO：mimoim ↔ mimoserver（聊天/选择/确认）

连接创建：
- `mimorepo/apps/mimoim/lib/hooks/use-bion.ts`：`createBionFrontendClient({ url, namespace:'/mimo' })`
- event：`message`（见 `mimorepo/packages/@bion/client/src/frontend-client.ts`）

#### mimoim → server（发送，event=message）

发送位置：`mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`

关键消息类型（协议定义：`mimorepo/packages/@bion/protocol/src/frontend.ts`）：
- `user_message`：用户输入
- `select_my_browser`：选择目标插件实例（`targetClientId`）
- `confirm_browser_task`：确认/取消任务（`requestId` + `confirmed`）

#### server → mimoim（接收，event=message：envelope）

消费位置：`mimorepo/apps/mimoim/lib/hooks/use-bion-chat.ts`

UI 关键事件：
- `chatDelta`：流式 assistant 文本
- `myBrowserSelection`：等待选择 / 已选择
- `browserTaskConfirmationRequested`：请求确认
- `structuredOutput`：错误信息兜底展示

### 3.3 Socket.IO：mimoserver ↔ plasmo-app（browser_action 执行）

扩展连接：
- `mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`：`createBionPluginClient({ namespace:'/mimo', transports:['websocket'] })`
- event：`my_browser_extension_message`（见 `mimorepo/packages/@bion/client/src/plugin-client.ts`）

#### server → 扩展：`browser_action`（需要 ack）

- 扩展接收并执行：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`（`client.onBrowserAction(...)`）
- 执行器：`mimorepo/apps/plasmo-app/src/background/managers/browser-action-executor.ts`

#### 扩展 → server：状态/同步上报

典型类型（协议：`mimorepo/packages/@bion/protocol/src/plugin.ts`）：
- `activate_extension`：连接握手
- `full_state_sync`：连接后全量同步
- `tab_event`：tabs/windows/tabGroups 增量事件
- `session_status`：session start/stop 状态

### 3.4 Twin：数字孪生（server → mimoim）

mimoim 消费位置：`mimorepo/apps/mimoim/lib/hooks/use-twin-state.ts`

- 首屏：`fetch('/api/twin')`（走 rewrite 到 `http://localhost:6006`）
- 实时：`client.socket.on('twin_state_sync', ...)`

---

## 4) 对照项：扩展支持但 mimoim 当前未用的 external messaging

plasmo-app background 同时监听：
- `chrome.runtime.onMessage`（扩展内部）
- `chrome.runtime.onMessageExternal`（外部页面）
  - 入口：`mimorepo/apps/plasmo-app/src/background/index.ts`

并且扩展 manifest 配置了：
- `externally_connectable.matches = [ "http://localhost:3000/*", "http://127.0.0.1:3000/*" ]`
  - 位置：`mimorepo/apps/plasmo-app/package.json`

扩展的 legacy 工具协议（如 `STAGEHAND_XPATH_SCAN/LIST_TABS/...`）在：
- `mimorepo/apps/plasmo-app/src/background/handlers/legacy-handler-registry.ts`

