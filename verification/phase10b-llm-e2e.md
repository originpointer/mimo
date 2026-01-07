# Phase 10-B：LLM End-to-End（在 Policy + Confirm + Audit 之上）

> 目标：让 LLM 负责“规划”，系统负责“安全执行”。LLM 产生动作计划，但执行必须走 Phase9 的 Policy+Confirm+Audit。

## 前置条件

- Phase9-A 已通过：确认闭环 + 审计落盘 + 回放/导出（至少 MVP）。
- Phase9-B（Policy）已落地：服务端权威 risk/confirm/reason。

## 目标与范围（MVP）

- 新增 `POST /control/plan`：
  - 输入：用户意图（自然语言）+ 目标页面 context（observe/extract 的结果）
  - 输出：结构化 action plan（taskId + actions[]），每个 action 有 type/target/params/（可选）risk 建议。
- 执行：仍通过 `POST /control/act2`（或后续统一 `POST /control/execute`）逐步执行。
- 高风险：必须触发确认（由 policy 决定），并在审计中可回放。

## 建议的 action schema（与现有 act2 兼容）

- action.type：`click.selector` / `type.selector` / `click.iframeSelector` / `type.iframeSelector` …
- target：selector / frameSelector
- params：text / timeoutMs / wait
- 运行关联：taskId/actionId（由服务端生成或 LLM 生成但需校验）

## 实现建议

- 服务端新增：`server/routes/control/plan.post.ts`
  - LLM prompt：
    - 约束输出必须是 JSON
    - 只能使用允许的 action 列表
    - 禁止直接输出 cookie/token 等敏感字段
  - 失败处理：输出不可解析则返回明确错误码
- 复用：`/control/observe` 作为上下文采集入口（DOM/A11y/screenshot）

## 验收标准

- 给定测试页 `/test-stagehand.html`：
  - LLM 能产出 click + type 两步计划
  - 执行时：low 自动执行；high 触发确认 → Approve → 重试成功
  - 审计可回放并定位每一步为何需要确认

## 风险与边界

- 不允许 LLM 绕过 policy：risk/confirm 最终以服务端 policy 为准。
- 不允许 LLM 直接下发 CDP 原语；只能下发“语义动作”。
