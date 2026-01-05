### sessionId / iframe / OOPIF 路由验证结论（chrome.debugger ↔ Stagehand Understudy 对齐）

#### 目标

在“扩展侧以 `chrome.debugger` 作为 CDP 传输主链”的前提下，验证并给出**可落地**的路由策略，使其满足 Stagehand v3 Understudy 的关键假设：

- **flatten session multiplexer**：根连接上自动挂接子 target，并用 `sessionId` 区分子会话。
- **事件路由**：事件必须能路由到“根会话 vs 子会话”，并在 Page/FrameRegistry 处以“事件发出时所在会话”来 stamp frame ownership。

---

## 1) 结论（先给准确结论）

- Stagehand v3 的 `CdpConnection`/`CdpSession` 设计与 `chrome.debugger` 的 **DebuggerSession.sessionId（Chrome 125+）** 语义是高度一致的：
  - Stagehand：`Target.setAutoAttach(flatten: true)` 后，收到 `Target.attachedToTarget` 携带 `sessionId`，后续对子 target 的命令/事件都走该 `sessionId`。
  - `chrome.debugger`：`sendCommand()` 的 `target` 结构允许可选 `sessionId`，`onEvent` 的 `source` 也可能带 `sessionId`，表示事件来自根调试对象会话中的子协议会话。

因此：**“根会话 + 子会话 multiplexer + sessionId 路由”的核心机制可以在扩展侧用 `chrome.debugger` 复现**。

参考：[`chrome.debugger` API 文档（DebuggerSession / onEvent / 受限网域）](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

---

## 2) Stagehand v3 Understudy 的路由假设（来自代码）

### 2.1 flatten auto-attach 是一等公民

- `understudy/cdp.ts`：
  - `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false, filter: ... })`
  - `Target.setDiscoverTargets({ discover: true })`
  - 在 `Target.attachedToTarget` 事件中创建/登记子 `CdpSession(sessionId)`

### 2.2 V3Context 依赖 “事件携带 emitting session” 做 frame ownership

- `understudy/context.ts` 的 `installFrameEventBridges(sessionId, ownerPage)`：
  - 在 **每一个 session（顶层 + OOPIF 子 session）** 上订阅 `Page.frameAttached/frameDetached/frameNavigated/navigatedWithinDocument` 等事件
  - 调用 `ownerPage.onFrameAttached(..., session)` 等，把 emitting session 一起传下去

换句话说：路由策略的关键不是“能不能 attach”，而是：
- **能否稳定地把事件归属到正确的 sessionId**；
- **能否让上层在收到事件时知道 emitting sessionId**。

---

## 3) chrome.debugger 侧可落地的 multiplexer 方案（建议实现形态）

### 3.1 Root attach

- `chrome.debugger.attach({ tabId }, "0.1")`
- 之后所有 CDP 命令通过：
  - `chrome.debugger.sendCommand({ tabId, sessionId? }, method, params)`

> 文档明确：`DebuggerSession` 必须提供 `tabId/targetId/extensionId` 三者之一，并可选 `sessionId`；如果为 `onEvent` 的 `source` 指定了 `sessionId`，表示事件来自根调试对象会话中的子协议会话；传给 `sendCommand` 的 `sessionId` 则以该子会话为目标。

参考：[`chrome.debugger` API 文档（DebuggerSession）](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

### 3.2 启用 auto-attach（复现 Stagehand 的 bootstrap）

在 root 会话（仅 tabId）发送：

- `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false, filter: [...] })`
- `Target.setDiscoverTargets({ discover: true })`

这与 Stagehand `CdpConnection.enableAutoAttach()` 完全同构。

### 3.3 事件路由

在扩展 background 里注册：

- `chrome.debugger.onEvent((source, method, params) => { ... })`

路由规则：

- 若 `source.sessionId` 存在：
  - 该事件属于 **子会话**（OOPIF/worker/iframe target 等）。
  - 用 `(tabId, sessionId)` 作为 session key，分发给对应的 session handler 集合。
- 若 `source.sessionId` 不存在：
  - 该事件属于 **根会话**（tab 级别）。

同时，需要特别处理 `Target.attachedToTarget`：

- 从 `params.sessionId` 与 `params.targetInfo.targetId/type/subtype` 建立映射：
  - `sessionId -> targetId`
  - （可选）`targetId -> sessionId`
- 这等价于 Stagehand `CdpConnection` 中的 `sessions` 与 `sessionToTarget`。

### 3.4 命令发送（CDPSessionLike 适配）

你可以在扩展侧实现一个轻量的 `CDPSessionLike` 适配器：

- `send(method, params)` => `chrome.debugger.sendCommand({tabId, sessionId?}, method, params)`
- `on(event, handler)` / `off(event, handler)` => 在 multiplexer 内维护 `Map<sessionKey,event,handlers>`

这样 Stagehand 上层（或你复刻的上层）仍然能按 “session.send / session.on” 的方式使用。

---

## 4) iframe / OOPIF 重点（文档提示的坑与 Stagehand 的应对）

### 4.1 Frame 与 Target 不一一对应

Chrome 文档明确：Frame 与 Target 不存在一对一映射；同进程 iframe 不会获得唯一 target，而是作为同一 target 下不同执行上下文出现。

参考：[`chrome.debugger` 文档（目标/使用帧）](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

Stagehand 的应对方式：

- 对同进程 frame：依赖 `Page.frameAttached/frameNavigated` 等事件里携带的 `frameId`，并由 `FrameRegistry` 维护拓扑。
- 对跨进程 OOPIF：通过 `Target.attachedToTarget` 获得子 session，后续该 frame 的 Page/Runtime 事件会从子 session 发出，从而能用 emitting session stamp ownership。

因此你的扩展 multiplexer 必须满足：

- `Page.*` 事件能按 `source.sessionId` 正确归属；
- 事件 payload 中的 `frameId` 能原样透传到上层 registry。

---

## 5) onDetach 与故障恢复（必须设计）

- `chrome.debugger.onDetach` 在浏览器终止调试会话时触发（例如 tab 关闭，或 DevTools 接管该 tab）。
- `DetachReason` 包含 `target_closed` / `canceled_by_user`。

参考：[`chrome.debugger` 文档（onDetach/DetachReason）](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

建议策略：

- 收到 `onDetach`：
  - 立即标记该 tab 的所有 inflight 请求失败（返回“driver detached”错误）
  - 清空 `(tabId)->sessionId->targetId` 映射
  - 向上层（NodeCore/WebApp）发送“不可恢复/需重试”事件
- 若业务允许：
  - 尝试重新 `attach(tabId)` 并重做 bootstrap（autoAttach/discoverTargets）。

---

## 6) 对“Stagehand 连接层复用”的含义

- 由于 Stagehand `CdpConnection` 内置 `ws` WebSocket 传输（`wsUrl`），Node 侧无法直接复用其 `connect(wsUrl)`。
- 但 Stagehand 的 **接口形状与路由模型（`CDPSessionLike` + flatten session multiplexer）** 可以在扩展侧按上述方式复现，并作为 DriverRPC 的底层。

这为后续 3A（DriverRPC）与 3B（虚拟 transport）决策提供了事实基础。