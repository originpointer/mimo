# 2026-01-05 WebApp中转方案：落地记录与结论

## 背景

目标是落地“**控制端服务 → WebApp（前端页）→ MV3 扩展（`chrome.debugger`/CDP）**”的可运行闭环，扩展侧执行结果与遥测通过 **HTTP** 回传控制端服务。

## 本次编码做了哪些事情（产出）

### 契约冻结（单一真源）

- 文档：`/Users/sodaabe/codes/coding/mimo/verification/contracts/contracts.md`
- 三条链路：
  - **Server → WebApp**：SSE 下发 `control.command`
  - **WebApp → Extension**：`externally_connectable + sendMessage → onMessageExternal`
  - **Extension → Server**：HTTP `POST /control/callback` 回传

### 控制端服务（Nitro routes + 内置 crypto）

- **JWKS**：`server/routes/.well-known/jwks.json.ts`
- **SSE 命令流**：`server/routes/control/stream.ts`
- **测试下发**：`server/routes/control/enqueue.post.ts`
- **回传接收**：`server/routes/control/callback.post.ts`（会打印 `[control.callback] ...` 便于验收）
- **签名与队列**：`server/utils/control/{keys.ts,bus.ts,base64url.ts}`
  - 不依赖外部库，使用 Node `crypto` 实现 **ES256 JWS** + **JWKS**

### WebApp（中转页）

- **中转页**：`server/routes/control/webapp.ts`
  - 订阅 SSE、转发到扩展、处理 `runtime.lastError`、展示最近日志
- **兼容别名**：`server/routes/control/weapp.ts`
  - `/control/weapp` → 302 跳转 `/control/webapp`（防拼写误用）

### MV3 扩展（最小闭环）

- 目录：`/Users/sodaabe/codes/coding/mimo/extension/`
- **manifest**：`extension/manifest.json`
- **外部消息入口 + 执行 + 回传**：`extension/background.js`
- **ES256/JWKS 验签**：`extension/jwks.js`
  - 兼容 WebCrypto 对 ECDSA 签名格式差异：先验 P-1363，失败再转 DER 复验（`extension/ecdsa.js`）
- 文档：`extension/README.md`

### 验收文档

- `verification/smoke/e2e.md`

---

## 本次验证了哪些问题（结论）

### 端到端闭环已跑通

你已在 Nitro 终端观察到：

- `[control.callback] {... "status":"ok", "method":"Runtime.evaluate", "value": 2 ...}`

说明链路：**SSE 下发 → WebApp 转发 → 扩展验签 → CDP 执行 → HTTP 回传** 全部成功。

### 联调阶段发现并修复的阻断点

- **路由拼写错误**：访问 `/control/weapp` 找不到路由  
  - 处理：增加 alias 路由重定向到 `/control/webapp`
- **sender origin 被拒**：`Sender origin not allowed: http://localhost:3000`  
  - 处理：扩展侧允许 localhost/127.0.0.1（含端口）
- **回传地址误填**：`replyUrl` 指向 `/control/enqueue`（它是测试下发端点，不是 callback 端点）  
  - 处理：WebApp 默认纠正为 `/control/callback`
- **验签失败**：`Invalid signature`  
  - 处理：扩展侧兼容 WebCrypto 的签名编码差异（P-1363 与 DER）

---

## 当前如何使用（本地验收最短路径）

1. 启动 Nitro

```bash
pnpm dev
```

2. 加载扩展

- Chrome `chrome://extensions` → 开启开发者模式 → 加载目录 `.../mimo/extension/`

3. 打开中转页并连 SSE

- `/control/webapp`（或 `/control/weapp` 会自动跳转）
- 点击 **Connect SSE**

4. 触发测试命令

- 点击 **Test enqueue (Runtime.evaluate 1+1)**
- 预期 Nitro 终端打印 `[control.callback] ...`

---

## 下一步建议（按优先级）

### 1) 收敛安全边界（必须）

- **收紧扩展权限**：`externally_connectable.matches`、`host_permissions` 从当前联调范围收敛到真实域名
- **配置化**：`JWKS URL`、允许 origin、回传地址建议改为受控配置源（如 managed storage / 构建时注入）
- **服务端密钥持久化与轮换**：当前为进程启动随机生成；生产需固定私钥并支持轮换，否则重启会导致旧命令验签失败

### 2) 从“测试下发”切换为 Stagehand 真调度

- 用 Stagehand 的 handler/缓存语义生成 `SignedCommand.op`
- 明确 `commandId/traceId` 的状态机：重试/超时/幂等/审计落库

### 3) 扩展执行能力向 Stagehand v3 inventory 靠拢

- 覆盖更多 CDP 域调用
- 增加事件订阅能力（`cdp.subscribe`）
- 明确 tab/target 的选择策略（active tab、指定 tabId、多窗口场景）

---

## 2026-01-05 续：Phase 0-6 验证与 OOPIF 突破

### 新增能力（Phase 0-6 实现）

#### Phase 0-2: 事件流回传与 Session Registry

| 文件 | 说明 |
|------|------|
| `server/routes/control/events.post.ts` | 接收扩展 CDP 事件回传 |
| `server/routes/control/events.get.ts` | 查询最近事件 |
| `server/utils/control/sessionRegistry.ts` | 服务端 session 注册表 |
| `server/routes/control/sessions.get.ts` | 查询子 session（iframe/OOPIF） |

**扩展侧增强**：`extension/background.js`
- `chrome.debugger.onEvent` 监听并回传到服务端
- Session Registry 自动维护（`Target.attachedToTarget`/`detachedFromTarget`）
- 支持 `sessionId` 命令路由（用于子 iframe 操作）
- 支持 `keepAttached` 选项（保持 debugger 连接）

#### Phase 3: sessionId Multiplexer

- 服务端自动追踪 `Target.attachedToTarget` 事件，维护子 session 列表
- `POST /control/enqueue` 支持 `sessionId` 参数，可在子 iframe 中执行命令

#### Phase 5: 等待/稳定性机制

| 文件 | 说明 |
|------|------|
| `server/utils/control/waitHelpers.ts` | 等待工具函数 |
| `server/routes/control/wait.post.ts` | 等待 API |

- `waitForPageLoad()`, `waitForDomReady()`, `waitForNetworkIdle()`, `waitForStable()`
- 基于 CDP 事件流判断页面状态

#### Phase 6: DriverAdapter + Act/Extract API

| 文件 | 说明 |
|------|------|
| `server/utils/control/driverAdapter.ts` | Stagehand 风格的驱动适配器 |
| `server/routes/control/act.post.ts` | 简化版 act API |
| `server/routes/control/extract.post.ts` | 简化版 extract API |

**DriverAdapter 接口**：
- `send(method, params)` - CDP 命令发送
- `evaluate(expression)` - JS 执行
- `navigate(url)`, `clickAt(x, y)`, `type(text)`, `press(key)`
- `screenshot()`, `waitForLoad()`, `waitForStable()`
- `getChildSessions()`, `findSessionByUrl()` - session 管理

---

### 🎉 关键验证结果：OOPIF 完全可操作

**测试场景**：主页面嵌入 `<iframe src="https://example.com">`

**验证日志**：
```json
{
  "method": "Runtime.evaluate",
  "sessionId": "0F0F5C1D0A33B10BACDBD41ABC29E3DE",
  "response": {
    "result": {
      "type": "string",
      "value": "Example Domain"  // ← 跨域 iframe 内的 document.title
    }
  }
}
```

**结论**：

| 能力 | 状态 |
|------|------|
| 检测跨域 iframe | ✅ `Target.attachedToTarget` 事件收到 |
| 获取子 session ID | ✅ 自动注册到 sessionRegistry |
| 在 OOPIF 中执行命令 | ✅ `Runtime.evaluate` 成功返回 |
| 获取 iframe 内 DOM | ✅ `document.title = "Example Domain"` |

**意义**：Stagehand 的 Frame/OOPIF 穿透逻辑可在扩展侧完整复现，无需降级策略。

---

### 验证文档清单

| Phase | 文档 | 状态 |
|-------|------|------|
| Phase 0 | `verification/phase0-oopif-result.md` | ✅ 已验证通过 |
| Phase 1 | `verification/phase1-tier1-cdp-coverage.md` | 📝 已创建，待填写 |
| Phase 2 | `verification/phase2-event-subscription.md` | 📝 已创建 |
| Phase 3 | `verification/phase3-session-multiplexer.md` | 📝 已创建 |
| Phase 4 | `verification/phase4-frame-oopif.md` | ✅ 由 Phase 0 结果覆盖 |
| Phase 5 | `verification/phase5-stability-wait.md` | 📝 已创建 |
| Phase 6 | `verification/phase6-stagehand-integration.md` | 📝 已创建 |

---

### 下一步（更新后的优先级）

1. **✅ OOPIF 验证已通过** - 无需降级策略
2. **可选：批量 CDP 方法验证** - webapp 已有 Round 1-7 按钮，可逐个验证
3. **推荐：集成 LLM 推理** - 基于 DriverAdapter 实现完整的 Stagehand act/extract
4. **推荐：移植 Stagehand handler** - 复用 observeHandler/actHandler 的元素定位逻辑

