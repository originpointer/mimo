### 复用决策：Stagehand “连接层”与整体复用边界（基于验证结果）

#### 输入事实（已验证/已确认）

- `chrome.debugger` 的受限网域覆盖 Stagehand v3 核心路径所需域与方法集合（下载控制 `Browser.*` out-of-scope）。详见：
  - `verification/inventory/cdp_methods_inventory.md`
  - `verification/inventory/chrome_debugger_coverage.md`
- `chrome.debugger` 支持 `DebuggerSession.sessionId` 子会话路由（Chrome 125+），可复现 Stagehand 的 flatten multiplexer。详见：
  - `verification/routing/session_routing_findings.md`
  - 官方文档：[`chrome.debugger` API](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

---

## 1) 关于“是否能复用 Stagehand 现有连接部分功能代码”的准确结论

### 结论：**Node 侧无法原样复用；扩展侧可按同构模型“复刻/改写”并复用接口形状**

- Stagehand v3 `understudy/cdp.ts` 的 `CdpConnection.connect(wsUrl)` 明确依赖 `ws` WebSocket 与 `wsUrl`（Node 直连 CDP）。
- 在本方案中，浏览器控制主链是扩展的 `chrome.debugger`（并不存在直接暴露给 Node 的 `wsUrl`），因此：
  - **Stagehand 的“WebSocket 连接层实现”不可原样复用**。
  - 但其 **抽象接口与路由模型（`CDPSessionLike` + Target autoAttach flatten + sessionId event routing）可以在扩展侧按 chrome.debugger 语义同构实现**，并作为 DriverRPC 底座。

---

## 2) 3A / 3B 决策（必须明确）

### 推荐选择：**3A（DriverRPC）**

- **定义**：NodeCore 保留 Stagehand 分层与缓存（Orchestrator/Handlers/Cache/LLM），但把“浏览器交互能力”通过 DriverRPC 从扩展侧提供。
- **原因**：
  - 不需要在 Node 侧伪造 `wsUrl` 或实现 WebSocket 级 CDP 代理，复杂度低、风险可控。
  - 能最大化复用 Stagehand 的“分层思想与缓存语义”，同时把浏览器交互完全对齐 Nanobrowser/扩展现实约束。

### 不推荐：3B（虚拟 transport 兼容 `CdpConnection`）

- **定义**：为了让 Node 侧 Stagehand `CdpConnection` 不改代码，试图在扩展侧/本地实现一个“虚拟 CDP WebSocket/transport”，把 send/on/event 都桥接到 `chrome.debugger`。
- **不推荐原因**：
  - 需要实现完整的 CDP message id/inflight/sessionId 语义，且要处理 MV3 生命周期、断线、DevTools 接管等问题。
  - 你最终仍需要处理 session/frame 路由与 DOM snapshot 注入等扩展现实问题，收益不成比例。

**因此：选择 3A 作为主路径，3B 仅在后续出现“必须复用 Understudy 大段代码”的强需求时再评估。**

---

## 3) 可复用 / 需改写清单（以你当前目标为准）

### 可直接复用或高概率复用（NodeCore）

- **Cache 语义**：`ActCache` / `AgentCache`（key、record/replay、stream wrap 逻辑）
- **LLM Provider 思路**：模型/提供方工厂与配置解析
- **编排骨架**：V3 风格的生命周期、metrics/logging、handler 组合

> 注：handlers 内部若强依赖 Stagehand Understudy（Page/Frame/Locator）接口，则需要通过 DriverAdapter 重新落接口或做较薄的 facade。

### 不可原样复用（需改写/替代）

- **Stagehand 连接层实现**：`understudy/cdp.ts` 的 `ws` 连接与 `connect(wsUrl)`
- **依赖 Node 环境的实现细节**：例如依赖 `fs` 的截图写盘路径（若你把执行放在扩展端需替代）

### 扩展侧建议“同构实现/复刻”的模块

- `CDPSessionLike` 适配器（基于 `chrome.debugger.sendCommand/onEvent`）
- multiplexer（root tab 会话 + child sessionId 会话）
- 路由策略（attachedToTarget/targetCreated fallback、onDetach 恢复）

---

## 4) 下一步落地建议（紧贴本仓库）

- 把 DriverRPC 设计成**最小原语集合**：
  - `cdp.send(method, params, sessionId?)`
  - `cdp.subscribe(filter)`（按域或按 event 名）
  - `dom.snapshot()`（复用 Nanobrowser 的 buildDomTree/iframe fallback 输出）
  - `input.*`（click/type/scroll）
- NodeCore 在不依赖 wsUrl 的前提下，逐步替换/适配 Stagehand handler 所需的浏览器能力。

（后续契约草案放在 `verification/contracts/`，不在本 TODO 阶段写入。）
