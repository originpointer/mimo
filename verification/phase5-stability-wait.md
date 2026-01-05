# Phase 5: 等待/稳定性验证

## 目标

证明页面加载等待、DOM/Network 稳定等待可实现。

## 实现内容

### Wait Helpers

**文件**: `server/utils/control/waitHelpers.ts`

**功能**:
- `hasPageLoaded(tabId)` - 检查是否收到 Page.loadEventFired
- `hasDomContentLoaded(tabId)` - 检查是否收到 Page.domContentEventFired
- `isNetworkIdle(tabId, idleMs)` - 检查网络是否空闲
- `waitForPageLoad(tabId, options)` - 等待页面加载
- `waitForDomReady(tabId, options)` - 等待 DOM 就绪
- `waitForNetworkIdle(tabId, options)` - 等待网络空闲
- `waitForStable(tabId, options)` - 等待 DOM + 网络都稳定

### Wait API

**Endpoint**: `POST /control/wait`

**Body**:
```json
{
  "tabId": 123,
  "condition": "pageLoad" | "domReady" | "networkIdle" | "stable" | "check",
  "timeoutMs": 30000,
  "idleMs": 500
}
```

**Response**:
```json
{
  "ok": true,
  "tabId": 123,
  "condition": "stable",
  "satisfied": true,
  "result": { "domReady": true, "networkIdle": true },
  "durationMs": 1234
}
```

## 验证步骤

### Step 1: 验证事件接收

1. 执行 `Page.enable` + `Network.enable`
2. 导航到新页面
3. 查询 `GET /control/events?method=Page.`

**预期事件**:

| 事件 | 预期 | 实际 |
|------|------|------|
| `Page.frameNavigated` | ✅ | [ ] |
| `Page.domContentEventFired` | ✅ | [ ] |
| `Page.loadEventFired` | ✅ | [ ] |
| `Page.lifecycleEvent` | ✅ | [ ] |

### Step 2: 验证检查状态 API

1. 导航页面后等待几秒
2. 调用 `POST /control/wait` with `condition: "check"`

**预期结果**:
```json
{
  "ok": true,
  "status": {
    "pageLoaded": true,
    "domReady": true,
    "networkIdle": true
  }
}
```

### Step 3: 验证等待 API

1. 发送 `Page.navigate` 命令
2. 立即调用 `POST /control/wait` with `condition: "pageLoad"`
3. 观察返回时间和结果

**预期**:
- 返回 `satisfied: true`
- `durationMs` 反映实际等待时间

### Step 4: 验证网络空闲判断

1. 打开一个有多个资源的页面
2. 调用 `POST /control/wait` with `condition: "networkIdle"`
3. 观察判断是否准确

**预期**:
- 在所有资源加载完成后返回
- `durationMs` 合理

## 需要订阅的事件

确保扩展侧能正确转发以下事件：

| 事件 | 用途 | 状态 |
|------|------|------|
| `Page.lifecycleEvent` | 页面生命周期 | [ ] |
| `Page.domContentEventFired` | DOM 就绪 | [ ] |
| `Page.loadEventFired` | 页面加载完成 | [ ] |
| `Page.frameNavigated` | 导航完成 | [ ] |
| `Network.requestWillBeSent` | 网络请求开始 | [ ] |
| `Network.loadingFinished` | 请求完成 | [ ] |
| `Network.loadingFailed` | 请求失败 | [ ] |

## 验收标准

| 检查项 | 预期 | 实际 |
|--------|------|------|
| 能检测页面加载状态 | ✅ | [ ] |
| 能检测 DOM 就绪状态 | ✅ | [ ] |
| 能检测网络空闲状态 | ✅ | [ ] |
| 等待 API 能正确等待 | ✅ | [ ] |
| 超时机制工作正常 | ✅ | [ ] |

## 结论

- [ ] 等待机制验证通过 → 继续 Phase 6
- [ ] 部分功能不准确 → 需要调整判断逻辑

## 备注

_______________________________________________________________

