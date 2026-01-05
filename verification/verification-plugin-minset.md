# 插件端最小能力验证（基于 Stagehand v3 CDP inventory）

> 目标：在“`chrome.debugger` + 扩展执行 + HTTP callback 回传”的架构下，方法级确认插件端是否覆盖 Stagehand v3 核心路径所需 CDP 调用面，并记录失败原因/缺口，作为控制端（Stagehand 真调度）实现的硬约束。

## 0) 输入依据

- Stagehand v3 实际 CDP 调用清单：`verification/inventory/cdp_methods_inventory.md`
- `chrome.debugger` 覆盖性结论：`verification/inventory/chrome_debugger_coverage.md`
- session/frame 路由结论：`verification/routing/session_routing_findings.md`

## 1) 验证分层（Tier0/Tier1/Tier2）

### Tier0（已验证）

- `Runtime.evaluate`
  - 证据：Nitro 终端已出现 `[control.callback] ... value=2`

### Tier1（只依赖 sendCommand，可批量验证）

这些方法无需 `onEvent`/`sessionId` 路由即可直接验证“可调用+返回结构合理”。**适合先跑完**，用于给控制端真调度一个可靠的最小能力面。

#### Page

- `Page.enable`
- `Page.getFrameTree`
- `Page.navigate`
- `Page.reload`
- `Page.getNavigationHistory`
- `Page.navigateToHistoryEntry`
- `Page.captureScreenshot`

#### Runtime

- `Runtime.enable`
- `Runtime.evaluate`
- `Runtime.callFunctionOn`
- `Runtime.releaseObject`
- `Runtime.runIfWaitingForDebugger`

#### DOM

- `DOM.enable`
- `DOM.getDocument`
- `DOM.querySelector`
- `DOM.describeNode`
- `DOM.getBoxModel`
- `DOM.getNodeForLocation`
- `DOM.resolveNode`
- `DOM.scrollIntoViewIfNeeded`
- `DOM.setFileInputFiles`（需要页面存在 `<input type="file">`，否则预期失败）

#### Input

- `Input.dispatchMouseEvent`
- `Input.dispatchKeyEvent`
- `Input.insertText`

#### Overlay/Emulation/Accessibility（可选但建议）

- `Overlay.enable`
- `Overlay.highlightNode`
- `Overlay.hideHighlight`
- `Emulation.setDeviceMetricsOverride`
- `Emulation.setVisibleSize`
- `Emulation.setDefaultBackgroundColorOverride`
- `Accessibility.enable`
- `Accessibility.getFullAXTree`

#### Network（注意：部分需要事件配合）

- `Network.enable`（可验证）
- `Network.getResponseBody`（通常依赖 event 拿到 requestId，建议放 Tier2）

### Tier2（依赖 onEvent + sessionId 路由，必须在真调度前完成）

> 这部分才是 Stagehand Understudy 的难点：多 target/iframe/OOPIF 的 session 归属与事件路由。

#### Target（auto-attach + 子会话）

- `Target.setAutoAttach`（flatten:true）
- `Target.setDiscoverTargets`
- `Target.getTargets`
- `Target.attachToTarget`
- `Target.detachFromTarget`

并验证事件路由：

- `Target.attachedToTarget` / `Target.detachedFromTarget` / `Target.targetCreated` / `Target.targetDestroyed`

#### Page/Runtime/Network 事件（frame ownership / execution context / network）

- `Page.frameAttached` / `Page.frameDetached` / `Page.frameNavigated` / `Page.lifecycleEvent` / `Page.frameStoppedLoading` 等
- `Runtime.executionContextCreated` / `Runtime.executionContextsCleared` 等
- `Network.requestWillBeSent` / `Network.responseReceived` / `Network.loadingFinished` 等

## 2) 执行方式

### 方式 A：WebApp 中转页按钮（推荐）

1. 打开 `/control/webapp` 并 Connect SSE
2. 使用“批量下发接口”触发 Tier1
3. 观察 Nitro 终端 `[control.callback]`，把结果填到记录表

### 方式 B：手动 curl（单条）

```bash
curl -sS -X POST 'http://localhost:3000/control/enqueue' \
  -H 'content-type: application/json' \
  -d '{
    "extensionId":"<EXTENSION_ID>",
    "ttlMs":30000,
    "op":{"kind":"cdp.send","method":"Page.getFrameTree","params":{}},
    "replyUrl":"http://localhost:3000/control/callback"
  }'
```

## 3) 记录表模板（复制使用）

| tier | method | params要点 | ok | error.message | 备注（限制/是否需要Tier2能力） |
|---|---|---:|:--:|---|---|
|  |  |  |  |  |  |

## 4) 通过/阻断判定

- **Tier1 全绿**：允许开始控制端“Stagehand 最小真调度（act 子集）”的编排代码，但仍需尽快补 Tier2。
- **Tier1 大量失败**：优先修扩展 driver 能力/权限/参数适配，控制端只写骨架不要深挖。
- **Tier2 未完成**：不得进入 Stagehand 的 Understudy 级复用（iframe/OOPIF/事件驱动等待会直接返工）。


