# Phase 2: Tier2 事件订阅验证

## 目标

实现并验证 `chrome.debugger.onEvent` 的完整分发机制。

## 实现内容

### 扩展侧 (background.js)

1. **Session Registry**
   - 维护 `sessionRegistry: Map<tabId, { attached, children: Map<sessionId, targetInfo> }>`
   - 在 `Target.attachedToTarget` 事件时添加子 session
   - 在 `Target.detachedFromTarget` 事件时移除子 session
   - 在 `chrome.debugger.onDetach` 时清理

2. **事件回传**
   - 所有 CDP 事件 POST 到 `/control/events`
   - 包含 `tabId`, `sessionId`, `method`, `params`, `ts`

3. **支持 sessionId 命令**
   - 命令可指定 `op.sessionId` 或 `target.sessionId`
   - 命令可指定 `keepAttached: true` 保持 debugger 连接

### 服务端 (events.post.ts / events.get.ts)

1. **事件存储**
   - 最近 500 条事件缓存
   - 支持按 `tabId`, `sessionId`, `method` 过滤

2. **事件查询 API**
   - `GET /control/events` - 查询事件
   - `GET /control/events?method=Target` - 按 method 模糊过滤
   - `GET /control/events?clear=1` - 清空事件缓存

## 验证步骤

### Step 1: 验证基础事件接收

1. 打开 `/control/webapp`
2. 填写 extensionId，点击 Connect SSE
3. 点击 "Test enqueue (Runtime.evaluate 1+1)"
4. 访问 `GET /control/events`

**预期**：能看到事件记录

### Step 2: 验证关键事件类型

1. 执行 `Page.enable` + `Runtime.enable`
2. 刷新目标页面
3. 查询事件

**预期事件列表**：

| 事件 | 预期 | 实际 |
|------|------|------|
| `Page.frameNavigated` | ✅ | [ ] |
| `Page.loadEventFired` | ✅ | [ ] |
| `Page.domContentEventFired` | ✅ | [ ] |
| `Runtime.executionContextCreated` | ✅ | [ ] |
| `Runtime.executionContextDestroyed` | ✅ | [ ] |

### Step 3: 验证 Target 事件（OOPIF 场景）

1. 加载包含 iframe 的页面
2. 执行 `Target.setAutoAttach({ autoAttach: true, flatten: true })`
3. 查询 `GET /control/events?method=Target`

**预期事件列表**：

| 事件 | 预期 | 实际 |
|------|------|------|
| `Target.attachedToTarget` | ✅ | [ ] |
| 事件包含 `sessionId` | ✅ | [ ] |
| 事件包含 `targetInfo.type` | ✅ | [ ] |

### Step 4: 验证 sessionId 路由

1. 从 `Target.attachedToTarget` 获取子 `sessionId`
2. 使用该 `sessionId` 发送命令（需要修改 enqueue 支持 sessionId）
3. 观察命令是否在子 session 中执行

## 验收标准

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 事件能正确回传到服务端 | ✅ | [ ] |
| Session registry 正确维护 | ✅ | [ ] |
| `Page.*` 事件能收到 | ✅ | [ ] |
| `Runtime.*` 事件能收到 | ✅ | [ ] |
| `Target.*` 事件能收到 | ✅ | [ ] |
| 子 session 事件包含 sessionId | ✅ | [ ] |

## 结论

- [ ] 事件订阅基础通过 → 继续 Phase 3
- [ ] 部分事件未收到 → 需要排查

## 备注

_______________________________________________________________

