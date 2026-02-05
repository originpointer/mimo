# plasmo-app（Mimo Agent）插件代码分析报告（2026-02-04）

## 范围与结论摘要

- 代码范围：`mimorepo/apps/plasmo-app`（Plasmo / Chrome MV3 扩展）。
- 插件的“监听事件”主要分三层：Background（Service Worker）监听 Chrome Runtime/Tab/Window/TabGroup、Socket.IO 连接状态与 SW 生命周期；Content Script 监听页面状态（Observer + DOM 事件）、来自 background 的 RPC 消息、以及来自 mimoim 的 `window.postMessage` 桥；CDP 侧监听 `Target.attachedToTarget` 用于 OOPIF/iframe 扫描。
- 来自 **server（MimoBus / Socket.IO）** 的控制指令：当前代码只显式接收 `browser_action`（`@bion/client` 的 `onBrowserAction`），在扩展端映射为一组可执行的“浏览器动作”（含 session 生命周期、导航、点击、填充、取内容、xpath 工具等）。
- 来自 **mimoim（Web App）** 的指令：主要通过 `chrome.runtime.sendMessage(extensionId, ...)`（external messaging）进入 background 的统一 MessageRouter，再由 LegacyHandlerRegistry 处理一组“工具类消息”（列表 Tab、CDP XPath 扫描/截图/抽取/标注等）；另外通过 `window.postMessage` 走 content-script 桥来获取扩展/连接信息用于自动发现与选择插件。

---

## 架构速览（按进程/上下文）

### 1) Background Service Worker（MV3）

入口：`mimorepo/apps/plasmo-app/src/background/index.ts`

职责：
- 统一消息路由：`chrome.runtime.onMessage` + `onMessageExternal` → `MessageRouter` → `LegacyHandlerRegistry`（Hub 模式在 bion mode 下禁用）。
- CDP 工具协调：`StagehandXPathManager` 聚合 XPath 扫描、截图、简历块抽取、Readability 等“工具类能力”。
- 与服务端总线连接：`BionSocketManager` 连接 Socket.IO（namespace `/mimo`），处理 server 下发的 `browser_action` 控制指令。
- 浏览器数字孪生状态同步：`TabEventsHandler` 监听 tabs/windows/tabGroups 事件，上报到 server；连接成功后还会全量同步一次（`full_state_sync`）。
- SW 生命周期稳定性：`KeepAliveManager`（10s 轮询调用 Chrome API + 连接保活），`ServiceWorkerLifecycleManager`（`onSuspend` 清理），`StateManager`（心跳 + 重启检测）。

### 2) Content Script（页面上下文）

入口：`mimorepo/apps/plasmo-app/src/content.ts`（实际实现导入 `mimorepo/apps/plasmo-app/cached/content.ts`）

职责：
- 页面状态探测：`PageStateDetector`（Mutation/Performance/Resize/Intersection + SPA 路由变化）→ 向 background 发送 `PAGE_STATE_CHANGE`。
- Browser action 的最小 RPC：接收 background 发来的 `session/*`、`browser/*` 消息，在页面内执行点击/输入/取文本/xpath 标注与 HTML 获取等。
- mimo UI/交互控制：在 session 进行中展示 overlay/bar，并通过捕获用户输入事件判断“用户接管（Takeover）”。
- mimoim 桥（自动发现）：监听 `window.postMessage` 的 `mimoim/get_bion_client_info`，转发到 background 的 `GET_BION_CLIENT_INFO`，再把结果 `postMessage` 回页面。

### 3) Extension UI（Popup + Tab Pages）

入口示例：
- Popup：`mimorepo/apps/plasmo-app/src/popup.tsx`
- Tab Pages：`mimorepo/apps/plasmo-app/src/tabs/*`

职责：
- 给开发/调试提供手工触发工具的界面（XPath 扫描、视口截图、简历块抽取 + LLM 解析/校验等）。
- 这些页面通过 `chrome.runtime.sendMessage` 调用 background 的 legacy 消息协议。

---

## 插件实现的监听事件（Listeners）

> 这里只列出“显式注册 listener/observer”的点；定时器/轮询也一并归类。

### A. Background（Service Worker）监听点

1) Chrome Runtime 消息入口（统一路由）
- `chrome.runtime.onMessage.addListener(...)`：扩展内部（popup/tab page/content-script）消息入口  
  - 文件：`mimorepo/apps/plasmo-app/src/background/index.ts`
- `chrome.runtime.onMessageExternal.addListener(...)`：外部页面（mimoim）消息入口  
  - 文件：`mimorepo/apps/plasmo-app/src/background/index.ts`

2) SW 生命周期
- `chrome.runtime.onSuspend.addListener(...)`：SW 即将终止时清理资源  
  - 文件：`mimorepo/apps/plasmo-app/src/background/managers/lifecycle-manager.ts`

3) 浏览器 Tab / Window / TabGroup 事件（数字孪生）
- tabs：`onCreated` / `onUpdated` / `onActivated` / `onRemoved`  
- windows：`onCreated` / `onRemoved` / `onFocusChanged`  
- tabGroups：`onCreated` / `onUpdated` / `onRemoved` / `onMoved`  
  - 文件：`mimorepo/apps/plasmo-app/src/background/handlers/tab-events-handler.ts`

4) Socket.IO 连接事件（Bion/MimoBus）
- `socket.on('connect' | 'disconnect' | 'connect_error', ...)`  
  - 文件：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`
- `client.onBrowserAction(...)`：接收 server 的 `browser_action`（控制指令）  
  - 文件：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`

5) 轮询/定时器
- `KeepAliveManager`：`setInterval` 每 10 秒触发一次 `chrome.tabs.query({})` + 可选 `sendHeartbeat()`  
  - 文件：`mimorepo/apps/plasmo-app/src/background/managers/keep-alive-manager.ts`
- `StateManager`：`setInterval` 每 10 秒更新 `chrome.storage.local` 心跳（用于重启检测）  
  - 文件：`mimorepo/apps/plasmo-app/src/background/managers/state-manager.ts`

### B. CDP/Debugger 事件监听

- `chrome.debugger.onEvent.addListener(...)`：监听 CDP `Target.attachedToTarget`，在 `autoAttach + flatten` 模式下收集 OOPIF iframe 的 `sessionId`，后续对不同 frame 执行 DOM/Page 命令  
  - 文件：`mimorepo/apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts`

### C. Content Script（页面上下文）监听点

1) 来自 background 的 RPC 消息
- `chrome.runtime.onMessage.addListener(...)`：处理  
  - session 控制：`session/start` / `session/stop` / `session/hide`  
  - browser RPC：`browser/get_content`、`browser/click`、`browser/fill`、`browser/xpath_scan`、`browser/xpath_mark`、`browser/xpath_get_html`  
  - 其它：`GET_PAGE_STATE`、`INITIALIZE_DETECTOR`、（遗留/备用）`STAGEHAND_XPATH_SCAN`  
  - 文件：`mimorepo/apps/plasmo-app/cached/content.ts`

2) mimoim ↔ content-script 桥（auto-discovery）
- `window.addEventListener('message', ...)`：接收 `mimoim/get_bion_client_info` 请求并回应  
  - 文件：`mimorepo/apps/plasmo-app/cached/content.ts`

3) 页面生命周期事件
- `document.addEventListener('DOMContentLoaded', ...)`：初始化 detector  
- `window.addEventListener('beforeunload', ...)`：清理 UI/状态  
- `document.addEventListener('visibilitychange', ...)`：可见性变化时刷新状态  
  - 文件：`mimorepo/apps/plasmo-app/cached/content.ts`

4) 页面状态探测（Observer/SPA）
由 `PageStateDetector.initialize()` 建立：
- `MutationObserver`：DOM 变更  
- `PerformanceObserver`：resource/navigation entry（近似网络活动）  
- `ResizeObserver`：布局变化  
- `IntersectionObserver`：关键元素可见性  
- `window.addEventListener('load'|'beforeunload'|'pageshow', ...)`，`document.addEventListener('DOMContentLoaded', ...)`  
- SPA 路由变化：拦截 `history.pushState/replaceState` + 监听 `popstate`  
  - 文件：`mimorepo/apps/plasmo-app/cached/page-state-detector.ts`、`mimorepo/apps/plasmo-app/cached/spa-detector.ts`

5) “用户接管”输入事件捕获（Takeover）
在 session `Ongoing` 状态下，content-script 捕获以下事件并在首次交互时切换到 `Takeover`：
- `pointerdown`、`mousedown`、`click`、`keydown`、`wheel`、`touchstart`、`touchmove`、`mousemove`  
  - 文件：`mimorepo/apps/plasmo-app/cached/content.ts`

---

## 接收来自 server 的控制指令（Bion / Socket.IO）

连接入口：`mimorepo/apps/plasmo-app/src/background/managers/mimo-engine-manager.ts`

### 1) 连接与握手（扩展 → server）

- 连接地址：
  - `PLASMO_PUBLIC_MIMO_BUS_URL`（兼容旧变量 `PLASMO_PUBLIC_SOCKET_URL`）
  - 支持把 `ws://`/`wss://` 归一化为 socket.io 期望的 `http(s)://`（`normalizeSocketIoUrl`）。
  - 默认：`http://localhost:6007`，namespace：`/mimo`  
  - 文件：`mimorepo/apps/plasmo-app/src/background/index.ts`、`mimorepo/apps/plasmo-app/.env`
- 建立连接后发送 `activate_extension`（包含 `clientId`、UA、版本号、允许多客户端等字段）。
- 连接成功后立即上报一次 `full_state_sync`（全量 windows/tabs/tabGroups/active 信息），用于 server 侧“数字孪生”初始化。

### 2) server → 扩展：`browser_action` 控制指令

接收方式：`client.onBrowserAction(async (msg) => ...)`  
执行入口：`mimorepo/apps/plasmo-app/src/background/managers/browser-action-executor.ts`

#### 2.1 支持的 action 名称（按代码显式实现）

`browser_action.action` 是一个对象（允许一次带多个动作，扩展端按顺序执行）：

- **Session 生命周期**
  - `session/start`：为 `sessionId` 分配/创建一个专用 tab（后台窗口 + tabGroup），向 content-script 发送 `session/start`，并 attach `chrome.debugger`（`DebuggerSessionManager`）以支持后续 CDP/静默操作；同时向 server emit `session_status: running`。
  - `session/stop`：向 content-script 发送 `session/stop`，detach debugger，并 emit `session_status: stopped`。

- **导航与交互**
  - `browser_navigate`：在 session tab 上导航到指定 URL；若已 attach debugger 则优先用 CDP `Page.navigate`。
  - `browser_click`：转发给 content-script：`{ type: 'browser/click', payload: { selector?, xpath? } }`
  - `browser_fill`：转发给 content-script：`{ type: 'browser/fill', payload: { selector?, xpath?, text } }`

- **读取内容**
  - `browser_getContent` / `browser_get_content`：转发给 content-script：`browser/get_content`，返回页面 `innerText`（可截断）+ viewport 尺寸，并包装成 `BionBrowserActionResult.result`（字段里 `markdown/fullMarkdown` 由 text 填充）。

- **截图**
  - `browser_screenshot`：优先尝试 CDP `Page.captureScreenshot`（不聚焦窗口），否则 fallback `chrome.tabs.captureVisibleTab`；当前实现为“best-effort capture”，但不会把截图数据回传（返回对象里 `screenshotUploaded` 等仍为 false，偏占位）。

- **XPath 工具（通过 content-script 侧 DOM 扫描/标注实现）**
  - `browser_xpathScan` / `browser_xpath_scan`：content-script `browser/xpath_scan`
  - `browser_xpathMarkElements` / `browser_xpath_mark`：content-script `browser/xpath_mark`（支持 clear/mark）
  - `browser_xpathGetHtml` / `browser_get_html`：content-script `browser/xpath_get_html`

- **Readability**
  - `browser_readabilityExtract` / `browser_readability_extract`：当前实现尝试发送 `READABILITY_EXTRACT` 到 content-script，但 content-script 未实现该消息处理（见“注意事项”）。

#### 2.2 执行策略/安全约束（对 server 指令的本地约束）

- **“Command UI tab” 禁止自动化**：任何 session 动作都强制运行在 session 专用 tab 上，并检查该 tab URL 不匹配 `externally_connectable.matches`（通常就是 mimoim 页面），防止在“指令 UI 页面”上执行自动化。  
  - 文件：`mimorepo/apps/plasmo-app/src/background/utils/command-ui-tab.ts`、`mimorepo/apps/plasmo-app/src/background/managers/browser-action-executor.ts`
- **TabGroup 强制归组**：session tab 必须在某个 group 中；如果用户手动移出，会自动重新归组。
- **尽量不抢焦点**：导航/截图/CDP click 优先用 `chrome.debugger`（减少 UI 干扰）；另外 legacy `WINDOW_FOCUS` 被策略禁用。

---

## 响应来自 mimoim 的指令（Web App）

mimoim 在代码语义里对应“可 external messaging 的 Web 页面”，默认允许：
- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`  
  - manifest：`mimorepo/apps/plasmo-app/.plasmo/chrome-mv3.plasmo.manifest.json`

### 通道 A：external messaging → background（`onMessageExternal`）

入口：`mimorepo/apps/plasmo-app/src/background/index.ts` → `MessageRouter` → `LegacyHandlerRegistry`

> mimoim 侧典型调用：`chrome.runtime.sendMessage(extensionId, { type, payload }, cb)`。

支持的 `type`（以 background 实现为准）：

- **连接/插件信息**
  - `GET_BION_CLIENT_INFO`：返回 `extensionId/extensionName/version/clientId/socketConnected`  
    - 用途：mimoim 自动发现并自动选择一个已连接的插件实例。

- **浏览器/页面工具类能力（多为 CDP 注入/抓取）**
  - `LIST_TABS`：列出标签页
  - `STAGEHAND_XPATH_SCAN`：CDP 扫描可交互元素并生成 stagehand 风格 XPath（含 OOPIF iframe）
  - `STAGEHAND_VIEWPORT_SCREENSHOT`：CDP 视口截图（可选 `taskId` 时会 `POST /api/tool-call/result` 上报结果）
  - `RESUME_BLOCKS_EXTRACT`：抽取页面文本块（面向“简历/候选人页”）
  - `RESUME_XPATH_VALIDATE`：校验一组 XPath 匹配数与首段文本片段
  - `JSON_COMMON_XPATH_FIND`：给定 key/value（JSON）在页面中找“公共祖先”XPath（用于结构对齐/定位）
  - `XPATH_MARK_ELEMENTS`：在页面中标注/清理一组 XPath 对应元素（注入 CSS/属性）
  - `XPATH_GET_HTML`：获取 XPath 对应元素的 `innerHTML`
  - `CDP_CLICK_BY_XPATH`：通过 CDP 计算坐标并派发鼠标事件点击（尽量不抢焦点）
  - `WINDOW_FOCUS`：**已禁用**（策略禁止 focus stealing）

- **TabGroup 管理**
  - `CREATE_TAB_GROUP` / `UPDATE_TAB_GROUP` / `DELETE_TAB_GROUP` / `QUERY_TAB_GROUPS` / `ADD_TABS_TO_GROUP`

备注：`PAGE_STATE_CHANGE` 是 content-script → background 的内部上报消息（不属于 mimoim 主动指令）。

### 通道 B：页面内 `window.postMessage` → content-script 桥（auto-discovery）

入口：`mimorepo/apps/plasmo-app/cached/content.ts`

- 请求：页面执行 `window.postMessage({ type: 'mimoim/get_bion_client_info', requestId? }, '*')`
- content-script 校验 `event.origin` 是否允许（localhost:3000 / 127.0.0.1:3000）
- 转发到 background：`chrome.runtime.sendMessage({ type: 'GET_BION_CLIENT_INFO' }, cb)`
- 响应：`window.postMessage({ type: 'mimoim/get_bion_client_info_result', requestId, payload }, '*')`

---

## 除此之外：插件还做了哪些工作（能力/副作用清单）

1) **数字孪生同步（扩展 → server）**
- 连接后全量：`full_state_sync`（windows/tabs/tabGroups/active ids）  
  - 文件：`mimorepo/apps/plasmo-app/src/background/utils/browser-state-sync.ts`
- 增量事件：`tab_event`（tab/window/group 的创建/更新/激活/移除/聚焦/移动）  
  - 文件：`mimorepo/apps/plasmo-app/src/background/handlers/tab-events-handler.ts`

2) **扩展注册/结果上报（HTTP）**
- `POST /api/extension/extension-id`：上报 `extensionId + extensionName`，并在 socket connect 时附带 `clientId/ua/version/...` 做绑定  
  - 文件：`mimorepo/apps/plasmo-app/src/apis/register.ts`
- `POST /api/tool-call/result`：`STAGEHAND_VIEWPORT_SCREENSHOT` 在带 `taskId` 时会把截图结果回传给 server  
  - 文件：`mimorepo/apps/plasmo-app/src/apis/toolCall.ts`、`mimorepo/apps/plasmo-app/src/background/handlers/legacy-handler-registry.ts`

3) **SW 稳定性/保活**
- KeepAlive：10s 调用 `chrome.tabs.query`，避免 SW 30s idle 被回收；同时可触发 socket 心跳检查  
- onSuspend 清理：停止 keepalive、断开 socket、移除 tab/window/group listeners

4) **content-script UI 与“用户接管”机制**
- 会在 session 期间覆盖 UI（overlay + 底部 bar），并通过捕获用户事件触发 takeover；并提供“恢复任务/停止”按钮（当前按钮发送的消息在 background 未落地处理，见注意事项）。

5) **开发/调试 UI（Popup + Tab Pages）**
- Popup 用于打开各 Tab Page
- Tab Pages 提供：XPath 扫描、截图下载、简历块抽取（含调用后端 LLM 解析/校验的逻辑）  
  - 文件：`mimorepo/apps/plasmo-app/src/tabs/*`

6) **本地持久化**
- `chrome.storage.local`：
  - `bionClientId`：作为插件实例稳定标识（socket 连接时用于 `activate_extension`）
  - `mimo_sw_heartbeat` / `mimo_state`：SW 心跳与状态缓存

---

## 注意事项 / 潜在问题（基于现有代码的可见行为）

1) **`READABILITY_EXTRACT` 路由不可达（疑似遗漏）**
- `LegacyHandlerRegistry` 实现了 `READABILITY_EXTRACT`，但 `MessageRouter.detectMessageType()` 只认 `LegacyMessageType` 枚举值；该枚举里没有 `READABILITY_EXTRACT`，因此 external messaging 发送 `READABILITY_EXTRACT` 会被判定为 unknown 而不路由。
- 同时 server 的 `browser_readabilityExtract` 当前走 content-script 消息 `READABILITY_EXTRACT`，但 content-script 并未实现该 type 的 handler → 该 action 预计会失败。

2) **content-script 发出的 `extension/resume-task` / `extension/stop-task` 当前无人处理**
- 这两个消息会进入 background 的 MessageRouter，但 type 不在 legacy 枚举中，会被直接忽略（无副作用）。

3) **生产包 manifest 权限疑似缺失 `windows`**
- `build/chrome-mv3-prod/manifest.json` 当前不包含 `"windows"` permission，但代码依赖 `chrome.windows.*`（`TabEventsHandler`、`BrowserStateSync`）。若按该 manifest 发布，window 级同步/全量 sync 可能受限或失败。

4) **content-script 内存在与 background 重复的 XPath scan 实现**
- content-script 处理 `STAGEHAND_XPATH_SCAN`（基于 DOM 扫描）与 background 的 CDP 扫描逻辑并存；目前未见 background → tab 的 `sendMessage(STAGEHAND_XPATH_SCAN)` 调用，可能是历史遗留/备用实现。

