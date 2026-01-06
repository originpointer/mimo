# Phase 4: Frame/OOPIF 穿透验证

## 目标

证明 Stagehand 的 Frame/OOPIF 逻辑可在扩展侧复现。

## 前置条件

- Phase 3 (sessionId multiplexer) 已完成 ✅
- 扩展已安装并正常工作

## 验证场景

### 场景 1: 同源 iframe

**测试页面**: 主页面包含同源 iframe

```html
<!-- http://localhost:3000/test-iframe.html -->
<iframe src="/inner-frame.html"></iframe>
```

**验证步骤**:
1. 执行 `Target.setAutoAttach({ autoAttach: true, flatten: true })`
2. 查询 `GET /control/sessions?tabId=xxx`
3. 获取 iframe 的 `sessionId`
4. 使用该 `sessionId` 执行 `DOM.getDocument`
5. 使用该 `sessionId` 执行 `Runtime.evaluate({ expression: 'location.href' })`

**预期结果**:

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 能获取 iframe sessionId | ✅ | [ ] (Chrome 同源 iframe 不产生独立 session，via `/control/verify/phase4`) |
| DOM.getDocument 成功 | ✅ | [ ] (无 sessionId 可用) |
| Runtime.evaluate 返回 iframe URL | ✅ | [ ] (无 sessionId 可用) |

### 场景 2: 跨域 iframe (OOPIF)

**测试页面**: 主页面包含跨域 iframe

```html
<!-- http://localhost:3000/test-oopif.html -->
<iframe src="https://example.com"></iframe>
```

**验证步骤**:
1. 在 WebApp 中加载 iframe 到 `https://example.com`
2. 执行 `Target.setAutoAttach({ autoAttach: true, flatten: true })`
3. 查询 `GET /control/events?method=Target.attached`
4. 检查是否收到 OOPIF 的 `Target.attachedToTarget` 事件
5. 如果收到，使用该 `sessionId` 执行 `Runtime.evaluate`

**预期结果**:

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 收到 Target.attachedToTarget 事件 | ⚠️ 待验证 | ✅ (sessionId=`D529...`, via `/control/verify/phase4`) |
| 事件包含 type: "iframe" | ⚠️ 待验证 | ✅ (targetInfo.type="iframe") |
| 能在 OOPIF session 中执行命令 | ⚠️ 待验证 | ✅ (`Runtime.evaluate(document.title)` 返回 `"Example Domain"`) |

### 场景 3: 嵌套 iframe

**测试页面**: iframe 内嵌 iframe

```html
<!-- http://localhost:3000/test-nested.html -->
<iframe src="/outer-frame.html"></iframe>

<!-- /outer-frame.html -->
<iframe src="/inner-frame.html"></iframe>
```

**验证步骤**:
1. 执行 `Target.setAutoAttach({ autoAttach: true, flatten: true })`
2. 查询 sessions，应该看到多个子 session
3. 分别在每个 session 中执行命令
4. 验证命令路由正确性

**预期结果**:

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 能看到多个子 session | ⚠️ 取决于 flatten | [ ] (同源嵌套 iframe 均不产生独立 session) |
| 外层 iframe session 工作 | ✅ | [ ] (无 sessionId) |
| 内层 iframe session 工作 | ⚠️ 待验证 | [ ] (无 sessionId) |

## 测试工具

### 创建测试页面

已新增测试路由与自动验证页：
- `GET /test-iframe.html` / `GET /inner-frame.html`
- `GET /test-oopif.html?src=...`
- `GET /test-nested.html` / `GET /outer-frame.html`
- `GET /control/verify/phase4`（一键执行三场景验证）

```javascript
// 测试同源 iframe
await fetch('/control/enqueue', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    extensionId: 'xxx',
    tabId: 123,
    sessionId: '<iframe-session-id>',
    op: {
      kind: 'cdp.send',
      method: 'Runtime.evaluate',
      params: { expression: 'location.href', returnByValue: true }
    },
    replyUrl: 'http://localhost:3000/control/callback'
  })
})
```

## 降级策略

如果 OOPIF 不可调试：

1. **限定范围**: 仅支持同源页面
2. **Content Script 辅助**: 使用 content script 在 OOPIF 中执行代码
3. **用户操作引导**: 对于需要跨域操作的场景，引导用户手动操作

## 验收标准

| 场景 | 预期 | 实际 |
|------|------|------|
| 同源 iframe | ✅ 必须通过 | [ ] (Chrome CDP 限制：同源 iframe 不产生独立 session) |
| 跨域 OOPIF | ⚠️ 尽力支持 | ✅ (完全可用：可获取 sessionId，可执行命令，返回值正确) |
| 嵌套 iframe | ⚠️ 尽力支持 | [ ] (同源嵌套同样无独立 session) |

## 结论

- ✅ **跨域 OOPIF 验证通过**（核心场景）→ 可继续后续 Phase
- [ ] 同源 iframe 不支持独立 session（Chrome CDP 行为限制）→ 已记录，需降级策略

## 备注

### 验证结果总结（via `/control/verify/phase4`）

- **Scenario1 同源 iframe**：`Target.setAutoAttach` 执行成功，但同源 iframe 未产生 `Target.attachedToTarget` 事件，`GET /control/sessions?type=iframe` 返回空数组。这是 **Chrome CDP 的正常行为**：同源 frame 不被视为独立的 OOPIF target，不会分配独立 sessionId。
  
- **Scenario2 跨域 OOPIF** ✅：
  - 收到 `Target.attachedToTarget` 事件，`params.targetInfo.type="iframe"`
  - 成功获取 `sessionId=D529491F409B205281EA88586EFD14CD`
  - 在子 session 中执行 `Runtime.evaluate(document.title)` 返回 `"Example Domain"`（符合 `https://example.com/` iframe）
  - **完全可用**

- **Scenario3 嵌套 iframe**：同源嵌套 iframe 同样未产生独立 session，`sessions` 为空。

### 降级策略（针对同源 iframe）

由于同源 iframe 不产生独立 sessionId，如需操作同源 iframe 内容，可考虑：
1. **直接在主 session 操作**：同源 iframe 的 DOM 可能通过主 frameTree / `DOM.describeNode` 等方式访问
2. **Content Script 注入**：对于复杂交互，可在 iframe 内注入 content script
3. **文档说明限制**：明确告知用户"跨域 iframe 可完全调试，同源 iframe 需其他方式"

_______________________________________________________________

