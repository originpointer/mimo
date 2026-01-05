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


