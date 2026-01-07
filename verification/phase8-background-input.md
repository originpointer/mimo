# Phase 8: 后台（不打扰）可信点击/输入 验证与实现

## 目标（验收口径）

- **不打扰用户**：不切换到目标 tab、不 `Page.bringToFront`、不抢占用户键盘鼠标输入焦点。
- **可信输入**：必须用 **CDP Input**（`Input.dispatchMouseEvent` / `Input.insertText` / `Input.dispatchKeyEvent`），而不是 `element.click()` 等 `isTrusted=false` 的 DOM 事件。
- **可靠性**：至少在我们的测试页上可重复 PASS，并明确系统/浏览器限制与产品策略。

## 为什么需要“严格 active tab”检查

扩展里原有 `getActiveTab` 会优先返回“最后一个非 control tab”，用于避免把控制页当作目标 tab。  
但 Phase 8 的“不打扰”验收必须检查 **真实 active tab**，因此新增了：

- `driver.getFocusedActiveTab`：直接返回 `chrome.tabs.query({active:true,lastFocusedWindow:true})` 的结果（不做 non-control 回退）

## 一键验证页

访问：`http://localhost:3000/control/verify/phase8`

### 运行步骤（重要）

1. 点击 **Run All**
2. 在提示出现后 **2 秒内切换**到你要继续正常使用的页面（不要停留在 verify 页）
3. 验证页会在后台完成：
   - 创建后台 tab（`active:false`）
   - 导航到 `/test-stagehand.html`
   - 用 `/control/act2` 在后台执行 click/type（CDP Input）
   - 用 `getFocusedActiveTab` 与 `document.hasFocus()` 证明“不打扰”

## PASS/FAIL 判据

Run All 的核心判定（必须满足）：

1. ✅ **active tab 不变**：关键步骤前后 `getFocusedActiveTab.tabId` 始终等于基线 `userTabId0`
2. ✅ **后台 click 生效**：`#clickStatus` 变为 `clickStatus: clicked`
3. ✅ **后台 type 生效**：`#input.value === "Hello Background"`
4. ✅ **不抢焦点**：目标页 `document.hasFocus() === false`

### 可选项（信息性，不影响 PASS）

- （optional）`keydown` 计数器：在真正后台状态下，`Input.dispatchKeyEvent` 可能被系统/浏览器限制而不生效；verify 页会展示 PASS/FAIL 作为边界信息。\n
  测试页 `test-stagehand.html` 增加了 `document.keydown` 计数器 `#keyStatus` 以便观测。

## 可能失败的原因与策略

### 1) 后台 click/type 不生效

可能原因：
- 平台/Chrome 版本对后台 target 的 Input 注入有约束（尤其是键盘事件）
- 页面需要真实用户手势（例如某些弹窗、权限请求），后台注入被页面逻辑拒绝

策略：
- **优先后台执行**：只要 `click/type + hasFocus=false + activeTab不变` 通过就可承诺后台能力
- 若失败：提供两种产品策略（需要明确告知用户）
  - **短暂激活目标 tab** 执行关键交互（会打扰用户，但可靠性更强）
  - 降级为 **只读/只抓取**（extract/observe）与异步提示用户完成关键点击

### 2) active tab 被切换（打扰用户）

可能原因：
- createTab 误用 `active:true`
- 执行链路调用了 `Page.bringToFront` 或其他切换 API

策略：
- 强制所有自动化使用 `createTab(active:false)` 或复用已存在后台 tab
- 严格在验证中每步采样 `getFocusedActiveTab`，一旦变化即判失败

## 相关实现文件

- 扩展（新增严格 active tab 查询）：`extension/background.js`（新增 `getFocusedActiveTab`）
- 验证页：`server/routes/control/verify/phase8.get.ts`
- 语义动作（确定性）：`server/routes/control/act2.post.ts`
- 测试页（含 optional keydown 计数器）：`server/routes/test-stagehand.html.get.ts`


