### Stagehand v3 CDP 方法级清单（用于 chrome.debugger 覆盖性验证）

#### 生成方式（可复现）

- 扫描范围：`/Users/sodaabe/codes/coding/mimo/.sources/stagehand/packages/core/lib/v3/**/*.ts`
- 抽取规则：匹配 `send(...)`/`sendCDP(...)` 的第一个字符串参数 `"Domain.method"`
- 目的：把“域级覆盖”落到“方法级覆盖”，避免遗漏导致结论不准确。

#### 结论摘要

- **核心路径实际用到的 CDP 域**：`Accessibility`、`DOM`、`Emulation`、`Input`、`Network`、`Overlay`、`Page`、`Runtime`、`Target`。
- **明确 out-of-scope**：`Browser.setDownloadBehavior`（下载控制不在需求范围）。
- **仅测试出现**：`WebAuthn.*`（不影响核心 handlers）。

---

### 1) 核心路径方法（按域归类，含 used_by）

> `used_by` 为在 Stagehand v3 源码中出现该方法调用的相对路径（相对于 `lib/v3/`）。

#### Accessibility

- `Accessibility.enable`
  - used_by: `understudy/a11y/snapshot/a11yTree.ts`, `understudy/frame.ts`
- `Accessibility.getFullAXTree`
  - used_by: `understudy/a11y/snapshot/a11yTree.ts`, `understudy/frame.ts`

#### DOM

- `DOM.enable`
  - used_by: `understudy/a11y/snapshot/a11yTree.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/domTree.ts`, `understudy/a11y/snapshot/focusSelectors.ts`, `understudy/frame.ts`, `understudy/frameLocator.ts`, `understudy/locator.ts`
- `DOM.describeNode`
  - used_by: `understudy/a11y/snapshot/a11yTree.ts`, `understudy/a11y/snapshot/domTree.ts`, `understudy/a11y/snapshot/focusSelectors.ts`, `understudy/frame.ts`, `understudy/frameLocator.ts`, `understudy/locator.ts`
- `DOM.getBoxModel`
  - used_by: `understudy/frame.ts`, `understudy/locator.ts`
- `DOM.getDocument`
  - used_by: `understudy/a11y/snapshot/domTree.ts`, `understudy/frame.ts`
- `DOM.getFrameOwner`
  - used_by: `understudy/a11y/snapshot/activeElement.ts`, `understudy/a11y/snapshot/capture.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/domTree.ts`, `understudy/a11y/snapshot/focusSelectors.ts`, `understudy/frameLocator.ts`
- `DOM.getNodeForLocation`
  - used_by: `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/frame.ts`
- `DOM.querySelector`
  - used_by: `understudy/frame.ts`
- `DOM.requestNode`
  - used_by: `understudy/selectorResolver.ts`
- `DOM.resolveNode`
  - used_by: `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/xpathUtils.ts`
- `DOM.scrollIntoViewIfNeeded`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/locator.ts`
- `DOM.setFileInputFiles`
  - used_by: `understudy/locator.ts`

#### Emulation

- `Emulation.setDefaultBackgroundColorOverride`
  - used_by: `understudy/screenshotUtils.ts`
- `Emulation.setDeviceMetricsOverride`
  - used_by: `understudy/page.ts`
- `Emulation.setVisibleSize`
  - used_by: `understudy/page.ts`

#### Input

- `Input.dispatchKeyEvent`
  - used_by: `understudy/locator.ts`, `understudy/page.ts`
- `Input.dispatchMouseEvent`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/locator.ts`, `understudy/page.ts`
- `Input.insertText`
  - used_by: `understudy/locator.ts`

#### Network

- `Network.enable`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/networkManager.ts`
- `Network.getResponseBody`
  - used_by: `understudy/response.ts`

#### Overlay

- `Overlay.enable`
  - used_by: `understudy/locator.ts`
- `Overlay.highlightNode`
  - used_by: `understudy/locator.ts`
- `Overlay.hideHighlight`
  - used_by: `understudy/locator.ts`

#### Page

- `Page.enable`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/frame.ts`, `understudy/networkManager.ts`, `understudy/page.ts`, `understudy/piercer.ts`
- `Page.setLifecycleEventsEnabled`
  - used_by: `understudy/context.ts`, `understudy/frameLocator.ts`, `understudy/page.ts`
- `Page.getFrameTree`
  - used_by: `understudy/context.ts`, `understudy/frame.ts`, `understudy/page.ts`, `v3.ts`
- `Page.addScriptToEvaluateOnNewDocument`
  - used_by: `understudy/page.ts`, `understudy/piercer.ts`
- `Page.createIsolatedWorld`
  - used_by: `understudy/selectorResolver.ts`, `tests/text-selector-innermost.spec.ts`
- `Page.navigate`
  - used_by: `understudy/page.ts`
- `Page.reload`
  - used_by: `understudy/page.ts`
- `Page.getNavigationHistory`
  - used_by: `understudy/page.ts`
- `Page.navigateToHistoryEntry`
  - used_by: `understudy/page.ts`
- `Page.captureScreenshot`
  - used_by: `understudy/frame.ts`

#### Runtime

- `Runtime.enable`
  - used_by: `understudy/a11y/snapshot/a11yTree.ts`, `understudy/a11y/snapshot/activeElement.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/executionContextRegistry.ts`, `understudy/frame.ts`, `understudy/frameLocator.ts`, `understudy/locator.ts`, `understudy/page.ts`, `understudy/piercer.ts`
- `Runtime.evaluate`
  - used_by: `tests/text-selector-innermost.spec.ts`, `understudy/a11y/snapshot/activeElement.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/focusSelectors.ts`, `understudy/frame.ts`, `understudy/page.ts`, `understudy/piercer.ts`, `understudy/selectorResolver.ts`
- `Runtime.callFunctionOn`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/a11y/snapshot/activeElement.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/xpathUtils.ts`, `understudy/locator.ts`, `understudy/screenshotUtils.ts`
- `Runtime.releaseObject`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/a11y/snapshot/activeElement.ts`, `understudy/a11y/snapshot/coordinateResolver.ts`, `understudy/a11y/snapshot/focusSelectors.ts`, `understudy/a11y/snapshot/xpathUtils.ts`, `understudy/frameLocator.ts`, `understudy/locator.ts`, `understudy/screenshotUtils.ts`
- `Runtime.runIfWaitingForDebugger`
  - used_by: `understudy/context.ts`

#### Target

- `Target.setAutoAttach`
  - used_by: `handlers/handlerUtils/actHandlerUtils.ts`, `understudy/cdp.ts`
- `Target.setDiscoverTargets`
  - used_by: `understudy/cdp.ts`
- `Target.getTargets`
  - used_by: `understudy/cdp.ts`
- `Target.attachToTarget`
  - used_by: `understudy/cdp.ts`
- `Target.detachFromTarget`
  - used_by: `understudy/cdp.ts`
- `Target.targetDestroyed`
  - used_by: `understudy/context.ts`
- `Target.createTarget`
  - used_by: `understudy/context.ts`
- `Target.activateTarget`
  - used_by: `understudy/context.ts`
- `Target.closeTarget`
  - used_by: `understudy/page.ts`

---

### 2) out-of-scope（下载控制，不需要实现）

- `Browser.setDownloadBehavior`
  - used_by: `v3.ts`

---

### 3) 仅测试出现（不影响核心 handlers）

- `WebAuthn.enable`
  - used_by: `tests/page-send-cdp.spec.ts`
- `WebAuthn.addVirtualAuthenticator`
  - used_by: `tests/page-send-cdp.spec.ts`

---

### 4) 事件订阅清单（用于 session/frame 路由验证）

> 这些不是 `send` 方法，但它们决定你需要在 `chrome.debugger.onEvent` 中正确路由到“根会话 vs 子会话”。

#### Target

- `Target.attachedToTarget` / `Target.detachedFromTarget` / `Target.targetCreated` / `Target.targetDestroyed`
  - used_by: `understudy/context.ts`

#### Page

- `Page.frameAttached` / `Page.frameDetached` / `Page.frameNavigated` / `Page.navigatedWithinDocument` / `Page.windowOpen`
  - used_by: `understudy/context.ts`（桥接到 Page）

#### Runtime

- `Runtime.executionContextCreated` / `Runtime.executionContextDestroyed` / `Runtime.executionContextsCleared`
  - used_by: `understudy/executionContextRegistry.ts`
- `Runtime.consoleAPICalled`
  - used_by: `understudy/page.ts`, `understudy/piercer.ts`

#### Network

- `Network.requestWillBeSent` / `Network.responseReceived` / `Network.loadingFinished` / `Network.loadingFailed` / `Network.requestServedFromCache`
  - used_by: `understudy/networkManager.ts`, `handlers/handlerUtils/actHandlerUtils.ts`

#### Page（加载相关）

- `Page.frameStoppedLoading`
  - used_by: `understudy/networkManager.ts`, `handlers/handlerUtils/actHandlerUtils.ts`
- `Page.lifecycleEvent` / `Page.domContentEventFired` / `Page.loadEventFired`
  - used_by: `understudy/page.ts`, `understudy/frame.ts`, `understudy/frameLocator.ts`
