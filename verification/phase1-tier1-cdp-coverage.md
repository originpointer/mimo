# Phase 1: Tier1 CDP Methods 批量验证

## 目标

证明 Stagehand 核心路径的 40+ CDP methods 都能通过 `chrome.debugger.sendCommand` 成功调用。

## 测试方法

使用 WebApp 中转页 (`/control/webapp`) 的批量验证按钮，按轮次下发 CDP commands，观察服务端 callback 返回。

## 验证轮次

### Round 1: Enable + getDocument

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Page.enable` | `{}` | ✅ ok | ✅ ok |
| `Runtime.enable` | `{}` | ✅ ok | ✅ ok |
| `DOM.enable` | `{}` | ✅ ok | ✅ ok |
| `Network.enable` | `{}` | ✅ ok | ✅ ok |
| `DOM.getDocument` | `{}` | ✅ 返回 root nodeId | ✅ nodeId=1, backendNodeId=1837 |

### Round 2: DOM operations

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `DOM.getDocument` | `{ depth: 0 }` | ✅ 返回 root | ✅ nodeId=1, backendNodeId=1964 |
| `Page.getFrameTree` | `{}` | ✅ 返回 frameTree | ✅ 含主frame + childFrames (oopifFrame) |

### Round 3: Input operations

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Input.dispatchMouseEvent` | `{ type: 'mouseMoved', x: 100, y: 100 }` | ✅ ok | ✅ ok |
| `Input.dispatchKeyEvent` | `{ type: 'keyDown', key: 'Shift' }` | ✅ ok | ✅ ok |
| `Input.dispatchKeyEvent` | `{ type: 'keyUp', key: 'Shift' }` | ✅ ok | ✅ ok |

### Round 4: Accessibility/Overlay/Emulation

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Accessibility.enable` | `{}` | ✅ ok | ✅ ok |
| `Accessibility.getFullAXTree` | `{}` | ✅ 返回 AX tree | ✅ 返回 AX tree |
| `Overlay.enable` | `{}` | ✅ ok | ✅ ok |
| `Emulation.setDeviceMetricsOverride` | viewport params | ✅ ok | ✅ ok |
| `Emulation.clearDeviceMetricsOverride` | `{}` | ✅ ok | ✅ ok |

### Round 5: Page operations

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Page.setLifecycleEventsEnabled` | `{ enabled: true }` | ✅ ok | ✅ ok |
| `Page.getNavigationHistory` | `{}` | ✅ 返回 history | ✅ 返回 history |
| `Page.captureScreenshot` | `{ format: 'png' }` | ✅ 返回 base64 data | ✅ 返回 base64 data |

### Round 6: Runtime operations

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Runtime.evaluate` | `{ expression: 'document.title', returnByValue: true }` | ✅ 返回页面标题 | ✅ "Control WebApp Bridge" |
| `Runtime.evaluate` | `{ expression: '1+1', returnByValue: true }` | ✅ 返回 2 | ✅ 返回 2 |

### Round 7: Target operations

| Method | 参数 | 预期 | 实际 |
|--------|------|------|------|
| `Target.getTargets` | `{}` | ✅ 返回 targets 列表 | [ ] |
| `Target.setDiscoverTargets` | `{ discover: true }` | ✅ ok | [ ] |

---

## 额外验证项（依赖前置结果）

这些 methods 需要先获取某些 ID（如 nodeId、objectId、frameId），需要通过 orchestrator 串行执行：

### DOM 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `DOM.querySelector` | 需要 `nodeId` from `DOM.getDocument` | [ ] |
| `DOM.getBoxModel` | 需要 `nodeId` | [ ] |
| `DOM.describeNode` | 需要 `nodeId` or `backendNodeId` | [ ] |
| `DOM.scrollIntoViewIfNeeded` | 需要 `nodeId` | [ ] |
| `DOM.setFileInputFiles` | 需要 file input `nodeId` | [ ] |
| `DOM.getFrameOwner` | 需要 `frameId` | [ ] |
| `DOM.getNodeForLocation` | 需要坐标，直接测试 | [ ] |
| `DOM.requestNode` | 需要 `objectId` | [ ] |
| `DOM.resolveNode` | 需要 `nodeId` | [ ] |

### Runtime 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Runtime.callFunctionOn` | 需要 `objectId` | [ ] |
| `Runtime.releaseObject` | 需要 `objectId` | [ ] |
| `Runtime.runIfWaitingForDebugger` | 特殊场景 | [ ] |

### Page 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Page.navigate` | 直接测试（会导航离开） | [ ] |
| `Page.reload` | 直接测试（会刷新页面） | [ ] |
| `Page.navigateToHistoryEntry` | 需要 `entryId` | [ ] |
| `Page.addScriptToEvaluateOnNewDocument` | 直接测试 | [ ] |
| `Page.createIsolatedWorld` | 需要 `frameId` | [ ] |

### Target 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Target.setAutoAttach` | 直接测试 | [已在 Phase 0 验证] |
| `Target.attachToTarget` | 需要 `targetId` | [ ] |
| `Target.detachFromTarget` | 需要 `sessionId` | [ ] |
| `Target.createTarget` | 直接测试 | [ ] |
| `Target.activateTarget` | 需要 `targetId` | [ ] |
| `Target.closeTarget` | 需要 `targetId` | [ ] |

### Overlay 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Overlay.highlightNode` | 需要 `nodeId` or `backendNodeId` | [ ] |
| `Overlay.hideHighlight` | 直接测试 | [ ] |

### Network 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Network.getResponseBody` | 需要 `requestId` (from event) | [ ] |

---

## 验证统计

| 轮次 | 总数 | 成功 | 失败 | 覆盖率 |
|------|------|------|------|--------|
| Round 1 | 5 | | | |
| Round 2 | 2 | | | |
| Round 3 | 3 | | | |
| Round 4 | 5 | | | |
| Round 5 | 3 | | | |
| Round 6 | 2 | | | |
| Round 7 | 2 | | | |
| **总计** | **22** | | | |

## 结论

- [ ] Tier1 基础 methods 全部通过 → 继续 Phase 2
- [ ] 部分 methods 失败 → 记录失败原因，评估影响

## 备注

_______________________________________________________________

