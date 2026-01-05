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
| `Target.getTargets` | `{}` | ✅ 返回 targets 列表 | ❌ Not allowed |
| `Target.setDiscoverTargets` | `{ discover: true }` | ✅ ok | ❌ Not allowed |

---

## 额外验证项（依赖前置结果）

这些 methods 需要先获取某些 ID（如 nodeId、objectId、frameId），需要通过 orchestrator 串行执行：

### DOM 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `DOM.querySelector` | 需要 `nodeId` from `DOM.getDocument` | ✅ 通过 |
| `DOM.getBoxModel` | 需要 `nodeId` | ✅ 通过 |
| `DOM.describeNode` | 需要 `nodeId` or `backendNodeId` | ✅ 通过 |
| `DOM.scrollIntoViewIfNeeded` | 需要 `nodeId` | ✅ 通过 |
| `DOM.setFileInputFiles` | 需要 file input `nodeId` | [ ] 未测试 |
| `DOM.getFrameOwner` | 需要 `frameId` | [ ] 未测试 |
| `DOM.getNodeForLocation` | 需要坐标，直接测试 | ✅ 通过 |
| `DOM.requestNode` | 需要 `objectId` | [ ] 未测试 |
| `DOM.resolveNode` | 需要 `nodeId` | [ ] 未测试 |

### Runtime 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Runtime.callFunctionOn` | 需要 `objectId` | ✅ 通过 |
| `Runtime.releaseObject` | 需要 `objectId` | ✅ 通过 |
| `Runtime.runIfWaitingForDebugger` | 特殊场景 | [ ] 未测试 |

### Page 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Page.navigate` | 直接测试（会导航离开） | [ ] 未测试 |
| `Page.reload` | 直接测试（会刷新页面） | [ ] 未测试 |
| `Page.navigateToHistoryEntry` | 需要 `entryId` | [ ] 未测试 |
| `Page.addScriptToEvaluateOnNewDocument` | 直接测试 | ✅ 通过 |
| `Page.createIsolatedWorld` | 需要 `frameId` | ✅ 通过 |

### Target 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Target.setAutoAttach` | 直接测试 | ✅ 已在 Phase 0 验证 |
| `Target.attachToTarget` | 需要 `targetId` | [ ] 未测试 |
| `Target.detachFromTarget` | 需要 `sessionId` | [ ] 未测试 |
| `Target.createTarget` | 直接测试 | [ ] 未测试 |
| `Target.activateTarget` | 需要 `targetId` | [ ] 未测试 |
| `Target.closeTarget` | 需要 `targetId` | [ ] 未测试 |

### Overlay 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Overlay.highlightNode` | 需要 `nodeId` or `backendNodeId` | ✅ 通过 |
| `Overlay.hideHighlight` | 直接测试 | ✅ 通过 |

### Network 依赖项

| Method | 依赖 | 状态 |
|--------|------|------|
| `Network.getResponseBody` | 需要 `requestId` (from event) | [ ] 未测试 |

### 额外验证项统计

| 测试组 | 总数 | 通过 | 未测试 |
|--------|------|------|--------|
| DOM 依赖链 | 9 | 5 | 4 |
| Runtime 依赖链 | 3 | 2 | 1 |
| Page 依赖项 | 5 | 2 | 3 |
| Target 依赖项 | 6 | 1 | 5 |
| Overlay 依赖项 | 2 | 2 | 0 |
| Network 依赖项 | 1 | 0 | 1 |
| **总计** | **26** | **12** | **14** |

---

## 验证统计

| 轮次 | 总数 | 成功 | 失败 | 覆盖率 |
|------|------|------|------|--------|
| Round 1 | 5 | 5 | 0 | 100% |
| Round 2 | 2 | 2 | 0 | 100% |
| Round 3 | 3 | 3 | 0 | 100% |
| Round 4 | 5 | 5 | 0 | 100% |
| Round 5 | 3 | 3 | 0 | 100% |
| Round 6 | 2 | 2 | 0 | 100% |
| Round 7 | 2 | 0 | 2 | 0% |
| **总计** | **22** | **20** | **2** | **91%** |

## 结论

- [x] Tier1 基础 methods 大部分通过 → 继续 Phase 2
- [x] 部分 methods 失败 → 记录如下

### 失败项分析

| Method | 错误 | 影响评估 |
|--------|------|----------|
| `Target.getTargets` | Not allowed | 低影响：可用 `Page.getFrameTree` 替代获取 frame 信息 |
| `Target.setDiscoverTargets` | Not allowed | 低影响：`Target.setAutoAttach` 已验证可用，足以支持 OOPIF 场景 |

**结论**：91% 覆盖率，核心功能路径不受影响。

## 备注

- `Target.setAutoAttach` 已在 Phase 0 验证通过，是 OOPIF 穿透的关键方法
- Round 7 失败的两个方法属于 Target 域的"发现"类方法，非核心执行路径

