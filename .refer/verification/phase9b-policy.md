# Phase 9-B：服务端权威 Policy 判定（risk / requiresConfirmation / reason）

> 目标：将 Phase9-A 中调用方“手填 risk/confirm”升级为**服务端权威判定**，并把判定理由写入审计，使确认闭环可解释、可回归、可被 LLM 安全调用。

## 现状

- `/control/act2` 当前支持 `risk` / `requiresConfirmation` / `reason`，但主要由调用方传入。
- 扩展侧仅对 `requiresConfirmation=true && Input.*` 强制确认（通知按钮 Approve/Reject）。

## 目标与范围（MVP）

- **服务端计算默认值**：当请求未显式提供 `risk/requiresConfirmation/reason` 时，由服务端计算。
- **服务端可强制升级**：即使请求显式传 `requiresConfirmation=false`，policy 判为 high 时可强制要求确认（并记录“强制原因”）。
- **审计记录 policy**：每个 action 的 policy 输出必须写入 `audit/<taskId>.jsonl`。

## Policy 输入/输出（建议）

- **输入**：
  - `action.type`（click/type/iframe…）
  - `target`（selector、frameSelector）
  - `params`（是否包含 text、text 长度等）
  - `pageContext`（tabUrl/title，必要时可延后）
  - `op.method`（是否触发 `Input.*`）
- **输出**：
  - `risk: low|medium|high`
  - `requiresConfirmation: boolean`
  - `reason: string`（面向用户/回放）

## 建议的最小判定规则（可后续扩展）

- `type.selector` / `type.iframeSelector`：默认 `risk=high`（写入可能触发副作用/提交）
- `click.selector` / `click.iframeSelector`：默认 `risk=medium`（可升级/降级）
- 若检测到 selector 命中“提交/支付/删除”等关键词（MVP：简单字符串匹配）：升级为 `high`

## 需要改动的文件（建议路径）

- 新增：`server/utils/control/policy.ts`
  - `evaluateAct2Policy(input) -> { risk, requiresConfirmation, reason }`
- 修改：`server/routes/control/act2.post.ts`
  - 在构造 `actionMeta` 前做 policy merge：
    - `effective = merge(request, policy)`
  - 审计 line 中增加字段：`policy: { computedRisk, computedRequiresConfirmation, appliedRisk, appliedRequiresConfirmation, reason, override?:boolean }`
-（可选）修改：`server/routes/control/verify/phase9.get.ts`
  - 不再传 `risk/requiresConfirmation/reason`，依赖服务端判定。

## 验收标准

- `/control/verify/phase9`：
  - low 场景：不传 `risk/requiresConfirmation` 也能自动执行成功。
  - high 场景：不传 `risk/requiresConfirmation` 也能触发 `CONFIRMATION_REQUIRED`，Approve 后重试成功。
- 审计：`audit/<taskId>.jsonl` 每条 action 都包含 policy 输出与 reason。

## 回归点

- Phase7/8 的 `/control/act2` 行为不应被破坏（仍可显式传参覆盖，但会被 policy 记录）。
- 扩展确认逻辑不改：仍以 `requiresConfirmation` 为准。
