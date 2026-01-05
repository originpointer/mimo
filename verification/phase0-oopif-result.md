# Phase 0: OOPIF 调试能力验证

## 目标

确认 `chrome.debugger` 能否调试 cross-origin iframe (OOPIF)。

## 测试环境

- Chrome 版本: 143.0.7499.170
- 扩展 ID: dgeaceidfgpnkggjnhhcgcgoonpgaoha
- 服务器: `http://localhost:3000`

## 验证步骤

### Step 1: 加载扩展

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/` 目录
5. 记录扩展 ID: dgeaceidfgpnkggjnhhcgcgoonpgaoha

### Step 2: 打开 WebApp 中转页

1. 访问 `http://localhost:3000/control/webapp`
2. 填写 extensionId（Step 1 中获取）
3. 确认 replyUrl 为 `http://localhost:3000/control/callback`

### Step 3: 加载跨域 iframe

1. 在 OOPIF 测试区输入框填写: `https://example.com`
2. 点击 "Load iframe"
3. 确认 iframe 加载成功

### Step 4: 连接 SSE

1. 点击 "Connect SSE"
2. 确认状态显示 "SSE connected"

### Step 5: 测试 Target.setAutoAttach

1. 点击 "Test Target.setAutoAttach (flatten)"
2. 观察服务端控制台输出

## 预期结果

### 场景 A: OOPIF 可调试 ✅

服务端控制台应收到类似以下事件：

```
[events] tabId=xxx sessionId=(root) method=Target.attachedToTarget ts=...
{
  "sessionId": "...",
  "targetInfo": {
    "targetId": "...",
    "type": "iframe",
    "url": "https://example.com/",
    ...
  }
}
```

### 场景 B: OOPIF 不可调试 ❌

只收到主页面相关事件，无 iframe 的 `Target.attachedToTarget` 事件。

## 实际结果

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 收到 `Target.attachedToTarget` 事件 | ✅ | ✅ 已收到 |
| 事件中包含 iframe targetInfo | ✅ | ✅ type=iframe |
| targetInfo.url 为跨域 URL | ⚠️ | ✅ (https://example.com) |
| 能用子 sessionId 执行命令 | ⚠️ | ✅ **已验证成功** |

### 实际日志

```
[sessionRegistry] Child registered: tabId=829137749 sessionId=67D242E3A8C7BBA0B44EAE9EB8F7942E type=iframe
[events] tabId=829137749 sessionId=(root) method=Target.attachedToTarget {
  "sessionId": "67D242E3A8C7BBA0B44EAE9EB8F7942E",
  "targetInfo": {
    "attached": true,
    "browserContextId": "864F1E7788444E6B12F8F4C35212F3C7",
    "canAccessOpener": false,
    "parentFrameId": "B9DD6D1A97170AF86EEFD204C366C94D",
    "targetId": "A57BEC595B893EC19303DD587B4ACC49",
    ...
  }
}
[sessionRegistry] Child unregistered: tabId=829137749 sessionId=67D242E3A8C7BBA0B44EAE9EB8F7942E
[events] tabId=829137749 sessionId=(root) method=Target.detachedFromTarget {
  "sessionId": "67D242E3A8C7BBA0B44EAE9EB8F7942E",
  "targetId": "A57BEC595B893EC19303DD587B4ACC49"
}
```

### 发现的问题

**子 session 被自动 detach**：当前 `cdpSendWithAutoDetach` 在命令执行后会 detach debugger，导致子 session 也被清理。需要使用 `keepAttached: true` 选项保持 debugger 连接。

## 补充测试: 子 session 命令执行

### 测试步骤

1. 先发送 `Target.setAutoAttach` 时使用 `keepAttached: true`
2. 等待收到 `Target.attachedToTarget` 事件，记录 `sessionId`
3. 使用该 `sessionId` 发送 `Runtime.evaluate` 命令

### 测试命令

```json
{
  "extensionId": "dgeaceidfgpnkggjnhhcgcgoonpgaoha",
  "ttlMs": 30000,
  "op": {
    "kind": "cdp.send",
    "method": "Runtime.evaluate",
    "params": { "expression": "document.title", "returnByValue": true },
    "keepAttached": true
  },
  "sessionId": "67D242E3A8C7BBA0B44EAE9EB8F7942E",
  "replyUrl": "http://localhost:3000/control/callback"
}
```

### 预期结果

- 返回 iframe 内页面的 `document.title`（应为 "Example Domain"）

## 结论

- [x] **OOPIF 可被检测** → `Target.attachedToTarget` 事件已收到，子 session 可见
- [x] **OOPIF 可被操作** → ✅ **已验证成功**

### 验证成功日志

```
[control.callback] {
  "method": "Runtime.evaluate",
  "sessionId": "0F0F5C1D0A33B10BACDBD41ABC29E3DE",
  "response": {
    "result": {
      "type": "string",
      "value": "Example Domain"  // ← iframe 内的 document.title
    }
  }
}
```

## 下一步

~~1. 修复 debugger detach 问题~~ ✅ 已通过 `keepAttached: true` 解决
~~2. 验证子 session 命令~~ ✅ 已验证成功
~~3. 确认跨域 iframe 操作~~ ✅ 已验证成功

**Phase 0 验证完成**，可以继续：
- Phase 1-5 的其他验证项（大部分基础设施已就绪）
- Phase 6 的 Stagehand 集成（基于 DriverAdapter）

## 备注

- OOPIF 已被成功检测（type=iframe）
- 子 session 被分配了独立的 sessionId
- `keepAttached: true` 选项可保持 debugger 连接
- **跨域 iframe 完全可操作**：可在 OOPIF 内执行 CDP 命令并获取结果

