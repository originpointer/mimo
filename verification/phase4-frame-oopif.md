# Phase 4: Frame/OOPIF 穿透验证

## 目标

证明 Stagehand 的 Frame/OOPIF 逻辑可在扩展侧复现。

## 前置条件

- Phase 3 (sessionId multiplexer) 已完成
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
| 能获取 iframe sessionId | ✅ | [ ] |
| DOM.getDocument 成功 | ✅ | [ ] |
| Runtime.evaluate 返回 iframe URL | ✅ | [ ] |

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
| 收到 Target.attachedToTarget 事件 | ⚠️ 待验证 | [ ] |
| 事件包含 type: "iframe" | ⚠️ 待验证 | [ ] |
| 能在 OOPIF session 中执行命令 | ⚠️ 待验证 | [ ] |

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
| 能看到多个子 session | ⚠️ 取决于 flatten | [ ] |
| 外层 iframe session 工作 | ✅ | [ ] |
| 内层 iframe session 工作 | ⚠️ 待验证 | [ ] |

## 测试工具

### 创建测试页面

在 webapp.ts 中添加测试按钮，或手动构造请求：

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
| 同源 iframe | ✅ 必须通过 | [ ] |
| 跨域 OOPIF | ⚠️ 尽力支持 | [ ] |
| 嵌套 iframe | ⚠️ 尽力支持 | [ ] |

## 结论

- [ ] Frame/OOPIF 验证通过 → 继续 Phase 6
- [ ] 部分场景不支持 → 记录限制，考虑降级策略

## 备注

_______________________________________________________________

