# E2E Smoke（本地闭环验收）

## 前置条件

- 你可以本地启动 Nitro（`pnpm dev`）
- 你可以在 Chrome 加载 MV3 扩展（本仓库 `extension/` 目录）

## 1) 启动控制端服务（Nitro）

在仓库根目录：

```bash
pnpm dev
```

> 默认会在控制台打印监听地址（例如 `http://localhost:3000`）。

## 2) 加载扩展

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”，指向：`/Users/sodaabe/codes/coding/mimo/extension/`

## 3) 打开 WebApp 中转页

打开：

- `http://localhost:3000/control/webapp`

点击 **Connect SSE**（保持页面打开）。

## 4) 触发一条测试命令（enqueue）

在 WebApp 页面点击 **Test enqueue (Runtime.evaluate 1+1)**。

预期：

- WebApp 日志出现 `sse command` 与 `forward -> extension`
- WebApp 状态显示 `forward ok (accepted)`

## 5) 验证扩展执行 + HTTP 回传

打开扩展 SW 控制台：

1. `chrome://extensions` → 本扩展 → **Service worker** → Inspect

预期：

- 看到 `chrome.debugger.attach/sendCommand/detach` 相关行为（无报错）

在 Nitro 控制台（运行 `pnpm dev` 的终端）预期：

- 出现一条日志：`[control.callback] ...`

## 6) 负例：篡改签名应失败

做法（任选其一）：

- 修改 `server/routes/control/enqueue.post.ts` 里 `signedPayload.op.params` 后不重新签名（模拟中间人篡改）
- 或者在扩展侧临时把 `req.jws` 改成无效字符串

预期：

- WebApp 显示 `Invalid signature`（或同义错误）
- Nitro 控制台不应出现成功 callback（或出现 error callback，取决于实现）




