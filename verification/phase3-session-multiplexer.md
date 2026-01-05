# Phase 3: sessionId Multiplexer 验证

## 目标

实现"根会话 + 子会话"的完整 multiplexer，对齐 Stagehand Understudy 的 session routing 逻辑。

## 实现内容

### 服务端 Session Registry

**文件**: `server/utils/control/sessionRegistry.ts`

```typescript
interface TargetInfo {
  targetId: string
  sessionId: string
  type: "page" | "iframe" | "worker" | "service_worker" | "other"
  url: string
  attachedAt: number
}

interface TabSession {
  tabId: number
  rootSessionId: string | null
  children: Map<string, TargetInfo>
  lastActivity: number
}
```

**功能**：
- `registerChildSession(tabId, sessionId, targetInfo)` - 注册子 session
- `unregisterChildSession(tabId, sessionId)` - 注销子 session
- `getChildSessionsByTabId(tabId)` - 获取所有子 sessions
- `findSessionByUrl(tabId, urlPattern)` - 按 URL 查找 session
- `findSessionByType(tabId, type)` - 按类型查找 session

### 事件自动更新

`events.post.ts` 自动处理 Target 事件更新 registry：
- `Target.attachedToTarget` → 注册子 session
- `Target.detachedFromTarget` → 注销子 session

### 扩展侧 Session Support

`background.js` 支持：
- `op.sessionId` / `target.sessionId` - 指定命令目标 session
- `op.keepAttached` / `options.keepAttached` - 保持 debugger 连接

### API Endpoints

- `GET /control/sessions` - 查询所有 sessions
- `GET /control/sessions?tabId=123` - 查询特定 tab 的子 sessions
- `GET /control/sessions?tabId=123&url=example.com` - 按 URL 查找
- `GET /control/sessions?summary=1` - 返回摘要

## 验证步骤

### Step 1: 验证 Session Registry 自动更新

1. 执行 `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false })`
2. 加载包含 iframe 的页面
3. 查询 `GET /control/sessions`

**预期**：能看到子 session 被自动注册

### Step 2: 验证子 Session 命令路由

1. 从 `GET /control/sessions?tabId=xxx` 获取子 session 的 `sessionId`
2. 使用该 `sessionId` 发送命令：

```json
{
  "extensionId": "xxx",
  "tabId": 123,
  "sessionId": "<child-session-id>",
  "op": {
    "kind": "cdp.send",
    "method": "Runtime.evaluate",
    "params": { "expression": "document.title", "returnByValue": true }
  },
  "replyUrl": "http://localhost:3000/control/callback"
}
```

3. 观察返回结果

**预期**：返回的是子 iframe 的 `document.title`，而非主页面

### Step 3: 验证 keepAttached 选项

1. 发送命令时设置 `keepAttached: true`
2. 发送多个连续命令
3. 观察 debugger 是否保持连接

**预期**：
- 第一次命令后 debugger 保持连接
- 后续命令不需要重新 attach
- 子 session 信息得以保留

### Step 4: 验证 Session 清理

1. 关闭目标页面或 iframe
2. 查询 `GET /control/sessions`

**预期**：
- `Target.detachedFromTarget` 事件被收到
- 对应的子 session 被自动清理

## 验收标准

| 检查项 | 预期 | 实际 |
|--------|------|------|
| Session registry 自动更新 | ✅ | [ ] |
| 子 session 命令能正确路由 | ✅ | [ ] |
| 子 session 返回结果正确 | ✅ | [ ] |
| keepAttached 选项生效 | ✅ | [ ] |
| Session 清理正确 | ✅ | [ ] |
| GET /control/sessions API 工作 | ✅ | [ ] |

## 结论

- [ ] Session multiplexer 通过 → 继续 Phase 4
- [ ] 部分功能失败 → 需要排查

## 备注

_______________________________________________________________

