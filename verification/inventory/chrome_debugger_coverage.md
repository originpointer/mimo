### chrome.debugger 对 Stagehand v3（handlers/understudy）CDP 覆盖性结论（方法级）

#### 依据

- Chrome 官方：`chrome.debugger` 只开放“受限网域”，但其中明确包含 `Accessibility`、`DOM`、`Emulation`、`Input`、`Network`、`Overlay`、`Page`、`Runtime`、`Target`、`WebAuthn` 等域；并通过 `sendCommand()` 发送 CDP 命令，通过 `onEvent` 接收事件，事件中使用 `tabId` 路由，Chrome 125+ 还支持 `DebuggerSession.sessionId` 子会话。
- 参考：[`chrome.debugger` API 文档](https://developer.chrome.com/docs/extensions/reference/api/debugger?hl=zh-cn)

---

## 1) Stagehand v3 实际使用的域（来自方法级清单）

> 来源：`verification/inventory/cdp_methods_inventory.md`。

- **核心路径域**：
  - `Accessibility`
  - `DOM`
  - `Emulation`
  - `Input`
  - `Network`
  - `Overlay`
  - `Page`
  - `Runtime`
  - `Target`

- **额外域**：
  - `Browser`：仅 `Browser.setDownloadBehavior`（已确认 out-of-scope，不需要实现）
  - `WebAuthn`：仅测试出现（不影响核心 handlers）

---

## 2) 覆盖性结论

### 域级结论（已确认）

- 在“**不需要下载控制**（`Browser.*` out-of-scope）”前提下，Stagehand v3 核心路径需要的 CDP 域 **全部包含在** `chrome.debugger` 文档列出的受限网域中：`Target/Page/Runtime/DOM/Input/Network` 以及 `Emulation/Overlay/Accessibility`。

### 方法级结论（基于清单逐条核对）

- `verification/inventory/cdp_methods_inventory.md` 中列出的 **核心路径 methods** 全部落在上述允许域之内。
- 因此：**就“Stagehand handlers/understudy 的 CDP 调用面”而言，`chrome.debugger` 在方法级别可覆盖（下载控制除外）**。

---

## 3) 仍需验证的“场景级风险”（不影响域/方法结论，但影响稳定性）

这些风险来自官方文档对 target/frame/session 的说明，因此应在路由策略中显式处理：

- **Frame 与 Target 并非一一对应**：同进程 iframe 不会获得唯一 target，而是同一 target 下多个执行上下文；跨进程/OOPIF 才更可能以独立 target/session 表现。
- **事件路由依赖 sessionId**：Chrome 125+ 的 `DebuggerSession.sessionId` 用来标识根调试会话中的子会话；`onEvent` 事件携带 `sessionId` 时，表示来自子会话。

对应实现含义：你需要像 Stagehand `CdpConnection` 那样做“根会话 + 子会话”的 multiplexer，并在 `Page`/`FrameRegistry` 里以“收到事件时的 emitting session”来 stamp ownership（Stagehand 已这么做）。

---

## 4) 建议的结论写法（用于后续文档/评审）

- **可以下准确结论**：`chrome.debugger` 能覆盖 Stagehand v3 handlers 所需的 CDP 域与核心方法集合（下载控制能力不在范围）。
- **同时保留工程风险**：真正的难点不在“域/方法是否可用”，而在“多 target/iframe/OOPIF 场景下的 sessionId 路由与 frame ownership 归属”。
