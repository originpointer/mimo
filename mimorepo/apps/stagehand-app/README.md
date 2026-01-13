# stagehand-app

用 Node + Stagehand（LOCAL）抓取 `https://www.zhipin.com/web/chat/recommend` 页面可交互元素的 stagehand 风格 XPath，并把结果落盘到 `outputs/`，用于与 `plasmo-app` 的扫描结果对比。

## 前置
- Node >= 18
- pnpm（仓库根 `packageManager` 已指定）

## 安装
在仓库根目录执行：

```bash
pnpm -C mimorepo install
```

## 登录态（persistent profile）
该页面通常需要登录。脚本通过 Playwright persistent context 复用你的 Chrome 用户目录：

- `STAGEHAND_USER_DATA_DIR`：Chrome 用户目录（mac 常见：`~/Library/Application Support/Google/Chrome`）
- `STAGEHAND_PROFILE_DIR`：可选（如 `Default` / `Profile 1`）

首次运行建议 `headless=false`，会打开一个真实浏览器窗口，你手动登录一次即可复用。

### 推荐（更稳）：使用 stagehand-app 自己的持久化 profile
为避免系统 Chrome 的 profile lock/策略导致 CDP 端口不可用，脚本默认使用：`apps/stagehand-app/outputs/chrome-user-data` 作为持久化用户目录，并默认使用 Playwright 自带 Chromium 启动浏览器。

也就是说：你可以**不设置任何环境变量**直接运行，首次手动登录一次，后续会复用该目录的登录态。

### 常见问题：ECONNREFUSED
如果你看到 `connect ECONNREFUSED 127.0.0.1:<port>`，通常是 **Chrome 启动失败或立刻退出**（最常见原因：你给的 `STAGEHAND_USER_DATA_DIR` 正被日常 Chrome 占用/锁住）。\n\n推荐改用 **attach 模式**（更稳）：\n\n1) 先手动启动一个带 remote debugging 的 Chrome：\n\n```bash\n/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n```\n\n2) 再运行抓取（脚本会自动从 `http://127.0.0.1:9222/json/version` 读取 ws url）：\n\n```bash\nSTAGEHAND_CDP_PORT=9222 \\\npnpm --filter stagehand-app capture:zhipin\n```\n+
也支持直接传 `STAGEHAND_CDP_URL=ws://...`。\n+
## 抓取

```bash
pnpm --filter stagehand-app capture:zhipin
```

如果你仍希望复用系统 Chrome 的登录态：

```bash
STAGEHAND_USER_DATA_DIR="$HOME/Library/Application Support/Google/Chrome" \
STAGEHAND_PROFILE_DIR="Default" \
pnpm --filter stagehand-app capture:zhipin
```

输出：
- `outputs/zhipin-xpath.latest.json`
- `outputs/zhipin-xpath.<timestamp>.json`

## 对比（与 plasmo-app）

```bash
pnpm --filter stagehand-app compare:plasmo
```

默认读取：
- Stagehand：`outputs/zhipin-xpath.latest.json`
- Plasmo：`../plasmo-app/docs/xpath.json`

