# Phase 9-B → Phase 10-B 分部推进计划（在 Phase9-A 闭环通过基础上）

> 现状：Phase9-A（Confirm + Audit + Replay）已验证通过：`/control/verify/phase9` 一键跑通，high risk 触发 `CONFIRMATION_REQUIRED` → 系统通知 Approve → 重试成功，并生成审计与回放。

## 目标

- 将当前“可用的闭环验证实现”升级为“可回归、可扩展、可被 LLM 安全调用的产品能力”。
- 分部推进：每一部都有明确验收、回滚点、以及对现有 Phase6/7/8/9 的回归不破坏。

---

## Part A（Phase 9-B）：Policy 判定（服务端权威）

### A1. 目标

- `risk` / `requiresConfirmation` 不再依赖调用方手填，改为 **服务端权威判定**（并允许显式覆盖，但需记录到审计）。
- 同时沉淀“为什么要确认”的 reason，确保通知/回放可解释。

### A2. 最小范围（MVP）

- 判定输入：action.type、target selector、是否输入文本、是否跨域（从 tabUrl / page url 推断）、是否触发 `Input.*`。
- 输出：`risk: low|medium|high`、`requiresConfirmation: boolean`、`reason: string`。

### A3. 实现建议

- 新增 `server/utils/control/policy.ts`
  - `evaluatePolicy({ actionType, target, params, pageContext }) -> { risk, requiresConfirmation, reason }`
- 在 `server/routes/control/act2.post.ts` 中：
  - 若请求未显式提供，则使用 policy 计算；若显式提供，则以“请求值 + policy值”写入审计（可对高风险强制确认）。

### A4. 验收标准

- `/control/verify/phase9`：
  - low 场景无需传 risk/confirm 字段也能通过（由服务端判定为 low/false）。
  - high 场景无需传 risk/confirm 字段也能触发确认（由服务端判定为 high/true）。
- `audit/<taskId>.jsonl` 必须记录 policy 输出与 reason。

---

## Part B（Phase 9-C）：审计与回放产品化（导出 Zip + 更强回放）

### B1. 目标

- 让审计产物可交付：可导出、可归档、可重放。

### B2. 最小范围（MVP）

- `GET /control/export/:taskId` 输出 zip（包含 jsonl + screenshots）。
- `GET /control/replay/:taskId` 增强：
  - 展示 action 摘要、risk、reason、错误码；
  - 可下载单张截图；
  - 显示重试次数/是否命中幂等缓存。

### B3. 实现建议

- 新增 `server/utils/control/exportZip.ts`（纯 Node 实现，不依赖外网；如需第三方库再评估）。
- 回放页保持纯 HTML（当前已是），增加字段展示与按钮。

### B4. 验收标准

- Phase9 验证页自动断言：
  - jsonl 行数 >= 2（至少 low + high 结果），
  - before/after 图片可读取。
- export zip 下载后解压结构正确。

---

## Part C（Phase 9-D）：确认体验增强（通知合并 + 降级策略）

### C1. 目标

- 通知内容可读、可解释、无骚扰：同一 actionKey 只弹一次；可从通知进入回放。

### C2. 最小范围（MVP）

- `notificationId` 稳定映射 `taskId:actionId`（已做）。
- 通知 message 显示：站点、动作、风险、原因。
- 若 `getPermissionLevel()!=granted`：
  - 回退到 popup 手动 approve/reject（已做）+ 在 verify 页明确提示。

### C3. 验收标准

- 连续触发同一 action 重试，不会刷屏。
- Approve/Reject 事件可靠写入 store 并清理通知。

---

## Part D（Phase 10-B）：LLM 端到端（在闭环之上）

### D1. 目标

- 让 LLM 只负责产出“协议动作计划”，执行必须走 Phase9 的 Policy+Confirm+Audit。

### D2. 最小范围（MVP）

- 新增 `POST /control/plan`：输入自然语言任务 + page context（observe/extract），输出 action plan（taskId + actions[]）。
- 执行仍通过 `POST /control/act2`（或未来 `POST /control/execute`）逐步推进。

### D3. 验收标准

- LLM 生成的每个 action 都能被 policy 标注 risk，并在需要时触发确认。
- 任一失败可回放审计并定位原因。

---

## 推荐推进顺序

1. Part A（Policy）
2. Part B（导出 Zip + 回放增强 + 回归断言）
3. Part C（通知合并与降级强化）
4. Part D（LLM 端到端）

## 现有关键入口（便于定位改动）

- 扩展确认与通知：`extension/background.js`
- 扩展确认面板/诊断：`extension/popup.html` / `extension/popup.js`
- 语义动作与审计落盘：`server/routes/control/act2.post.ts`
- 幂等与锁：`server/utils/control/taskExecution.ts`
- 审计存储：`server/utils/control/auditStore.ts`
- 回放/导出：`server/routes/control/replay/[taskId].get.ts` / `server/routes/control/export/[taskId].get.ts`
- 一键验收：`server/routes/control/verify/phase9.get.ts`
