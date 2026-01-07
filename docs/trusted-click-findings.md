# 可信点击（CDP Input）验证方式、结果与结论（Phase7 vs Phase8）

## 背景与问题

我们希望回答一个工程与产品都必须面对的问题：

> 在用户正常使用其他页面（不切 tab、不 bringToFront、不抢占用户输入）的情况下，是否还能 **可靠地** 完成“可信点击/可信输入”？

这里的“可信”指 **通过 CDP Input 注入**（`Input.dispatchMouseEvent` / `Input.insertText` / `Input.dispatchKeyEvent`），而不是 `element.click()` 这种 `isTrusted=false` 的 DOM 方式。

## 1) 定义与验收口径

### 1.1 可信点击（Trusted Click）

- **定义**：使用 `Input.dispatchMouseEvent`（鼠标移动/按下/抬起）驱动页面交互，并以页面业务侧可观测状态变化来判定“点击发生”。  
- **反例（不算可信）**：`element.click()`、`dispatchEvent(new MouseEvent(...))` 等非 CDP Input 的路径（`isTrusted=false`）。

### 1.2 完全不打扰用户（No-disturb）

Phase8 的“不打扰”口径是可证据化的：

- **真实 active tab 不变**：扩展提供 `getFocusedActiveTab`（严格版，不做“最后非 control tab”回退），在关键步骤前后采样，要求 `tabId` 始终等于基线 `userTabId0`。
- **目标页确实在后台**：目标 tab 内 `document.visibilityState === "hidden"` 且 `document.hidden === true`。

> 备注：`document.hasFocus()` 不能作为“不打扰”的硬指标，因为脚本 focus 可能让它变为 `true`，但并不代表用户 active tab 被切走。\n

## 2) 验证方式（证据链）

### 2.1 “点击是否发生”的判定

我们不把“CDP 命令返回 ok:true”当作点击发生的证据，而是要求页面业务状态变化，例如测试页 `test-stagehand.html` 的：

- `#clickStatus` 从 `clickStatus: not_clicked` → `clickStatus: clicked`

### 2.2 “是否打扰用户”的判定

在 Phase8 中，我们同时采集两类证据：

- **active tab 证据**：`getFocusedActiveTab` 的连续采样（baseline / after createTab / after navigate / after click / after type）
- **后台可见性证据**：`document.visibilityState` 与 `document.hidden`

### 2.3 CDP Input 注入序列（我们尝试过的最小鼠标序列）

为排除“事件序列不完整导致 click 丢失”的假阴性，我们把 `clickAt` 调整为：

- `mouseMoved` → `mousePressed(buttons=1, clickCount=1)` → `25ms delay` → `mouseReleased(buttons=0, clickCount=1)`

（并携带 `pointerType:"mouse"` 等字段）

## 3) Phase7 结果：前台/可见情况下可信点击可行

验证入口：`/control/verify/phase7`\n
验证目标：在同文档中 `click.selector` 后，`#clickStatus` 必须变为 clicked。\n

结论（摘要）：\n
- **PASS**：`click.selector` 能稳定触发页面 click handler，`#clickStatus === "clickStatus: clicked"`。\n

这说明：**在目标 tab 可见/前台（允许交互）时，基于 CDP Input 的可信点击可行。**

## 4) Phase8 结果：完全不打扰用户的后台可信点击“不可靠/不可用”

验证入口：`/control/verify/phase8`\n
验证关键约束：目标 tab 通过 `createTab(active:false)` 创建，用户继续使用其他页面。\n

### 4.1 “不打扰用户”证据成立

来自一次 Phase8 Detailed Output（用户提供日志摘要）：

- **active tab 全程不变**：\n
  - baseline / after createTab / after navigate / after click / after type 全部 `ok:true`\n
  - `expected` 始终是 `userTabId0`，且 `got` 一直相等
- **目标页确实后台**：\n
  - `visibilityState: "hidden"`\n
  - `hidden: true`

因此我们可以确认：**验证确实发生在后台场景，且没有切走用户正在使用的 tab。**

### 4.2 可信点击失败（关键结论）

同一次日志中：

- `click` 的 API 返回 `ok:true`（说明 CDP 命令被接受并执行了 send 链路）
- 但 `clickStatus.result` 仍为：`"clickStatus: not_clicked"`

这意味着：**在后台场景下，CDP 的鼠标事件注入并不能可靠触发页面 click handler**。\n
即便我们补全了更真实的鼠标事件序列，仍无法让 `#clickStatus` 变化。\n

### 4.3 可信输入（insertText）可行，但键盘事件不行（信息性结论）

同一次日志中：

- `type` 返回 `ok:true` 且 `value.result === "Hello Background"` → **Input.insertText 在后台可写入 input value**（至少在测试页成立）。
- `pressA` 返回 `ok:true` 但 `#keyStatus` 从 `0` 到 `0` → **dispatchKeyEvent 在后台未触发 keydown 监听**（信息性结论，符合很多平台限制的直觉）。

## 5) 结论（可承诺 vs 不可承诺）

### 5.1 结论（工程事实）

- **前台/可见（Phase7）**：可信点击可行。\n
- **后台且不打扰（Phase8）**：\n
  - **可信点击不可靠/不可用**（至少在当前 Chrome/系统环境 + 当前实现下，测试页已复现“click ok:true 但状态不变”）。\n
  - **可信文本注入可行**（Input.insertText 能写入 value）。\n
  - **键盘事件不可靠**（dispatchKeyEvent 不触发 keydown）。\n

### 5.2 产品承诺建议

- **严格不打扰模式**（承诺）：后台 read/extract/observe/wait + 部分写入（insertText）。\n
- **需要可靠点击的任务**（不在严格不打扰承诺内）：\n
  - 必须引入“可打扰策略”（短暂激活目标 tab 并显式告知用户），或\n
  - 在关键点击点提示用户完成一次真实交互，再继续后台流程。\n

## 6) 苏格拉底式自检问题（用来发现遗漏/边界）

把下面问题当作“反证清单”。如果某题答不上来，说明文档或验证还需补强：

1. 我们对“可信点击”的定义是否足够精确？\n
   - 是否把“CDP 命令返回 ok:true”误当成“点击发生”？\n
   - 是否需要额外的页面侧证据（例如事件回调、日志埋点）来证明 handler 执行？\n

2. 我们的“点击发生”判据是否可能被绕过？\n
   - `#clickStatus` 改变是否可能由非点击因素触发？\n
   - 是否应加入“点击点命中元素”的验证（例如 elementFromPoint 记录）？\n

3. 我们对“不打扰用户”的证据是否充分？\n
   - active tab 不变是否足以证明“用户输入未被抢占”？\n
   - 是否需要额外监控窗口焦点（window focus）或系统级输入占用？\n

4. 后台点击失败的替代解释是什么？我们是否已排除？\n
   - 是不是页面事件监听还没绑定（时序问题）？（我们是否用 stable/wait 足够？）\n
   - 是不是 clickAt 序列不真实（我们已补 move/press/release/delay）？\n
   - 是不是坐标不在视口（我们是否 scrollIntoView + boxModel 可靠）？\n
\n
5. “后台 tab hidden”是否会导致页面节流/冻结，从而解释点击不生效？\n
   - 我们是否需要一个心跳/动画/定时器来证明页面在后台仍在执行 JS？\n
\n
6. 这个结论是否只对我们的测试页成立？迁移到真实网站时有哪些差异？\n
   - 真实网站可能有防自动化/手势限制/权限弹窗：它们会如何影响前台/后台点击？\n
   - 我们要把“可靠”的定义限定在哪些平台/版本/站点类型范围内？\n
\n
7. 如果业务必须点击，但又要尽量不打扰用户，我们有没有折中策略？\n
   - 只在关键节点短暂激活目标 tab？激活时长/提示文案/可取消性怎么设计？\n
   - 是否能通过站点 API/表单提交/URL 参数替代点击？\n

## 7) 相关实现位置（便于回溯）

- Phase7 验证页：`server/routes/control/verify/phase7.get.ts`\n
- Phase8 验证页：`server/routes/control/verify/phase8.get.ts`\n
- DriverAdapter（clickAt/input）：`server/utils/control/driverAdapter.ts`\n
- 扩展严格 active tab：`extension/background.js`（`getFocusedActiveTab`）\n


