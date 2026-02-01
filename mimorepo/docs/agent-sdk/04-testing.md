# 04-测试计划与排错（完整 Agent 流程）

本章说明如何验证“完整 Agent 流程测试”已经跑通，以及如何在失败时定位问题。

## 已落地的完整流程测试用例

### Stage06 deterministic（不依赖真实 LLM）

- 用例：`tests/integration/agent-flow/agent-flow.deterministic.test.ts`
- 覆盖链路：
  - `@mimo/agent-multi`：`WorkflowAgent.execute()`
  - `@mimo/agent-tools`：`ToolRegistry` + `ToolExecutor`
  - `@mimo/agent-cache`：`AgentCache.save/replay`
  - `@mimo/agent-context`：`SensitiveDataFilter`（验证脱敏生效）
- 关键断言：
  - Run1：LLM 调用 1 次，工具生效（input value/click state）
  - Run2：**命中缓存**，LLM 调用次数不增加

### Stage06 real LLM（依赖 AI Gateway）

- 用例：`tests/integration/agent-flow/agent-flow.real-llm.test.ts`
- 覆盖链路：
  - 真实 `LLMProvider.getClient(testModels.claude)` 生成结构化 plan
  - 同样验证 Run2 replay 命中（LLM calls 不再增加）

### LLM structured output（responseModel）

- 用例：`tests/integration/core-llm/structured-output.integration.test.ts`
- 目的：验证 `complete({ responseModel })` 的 `structuredData` 可用且通过 schema

## 如何运行

### 只构建 Stage06 相关依赖（推荐）

```bash
pnpm -C mimorepo exec turbo run build --filter=@mimo/agent-multi...
```

### 运行集成测试（包含 real-LLM）

```bash
pnpm -C mimorepo/tests/integration test
```

## 常见问题与定位

### 1) real-LLM 用例被跳过

检查 `tests/integration/setup.ts` 的提示信息；通常是未配置 `AI_GATEWAY_API_KEY`。

### 2) 输出不是 JSON / plan 解析失败

当前 Stage06 依赖 `responseModel`（zod schema）来稳定生成结构化 plan：
- schema 定义：`packages/@mimo/agent-multi/src/workflow/types.ts`
- 如果模型仍输出不稳定，建议：
  - 提高约束：更严格的 system prompt（仅 JSON、无多余字段）
  - 降低 temperature（当前已强制 0）
  - 减少可选字段，或把 selector/url 的约束写到 prompt 里

### 3) TokenUsage 为 0

现状：`@mimo/llm` 在 `complete({ responseModel })` 的路径中，为了稳定性直接调用 provider 的结构化输出能力（例如 `generateObject`），但该路径在当前适配层 **未统一提取 token usage**，因此返回的 `usage` 为 0。

如果你需要在 Stage06 中精确统计 usage：
- 方案 A：在 `@mimo/llm` 的结构化输出实现中补齐 usage 提取（按 provider/AISDK 能力）
- 方案 B：让 LLM 走普通 `chatCompletion` 并要求严格 JSON（但会增加 flaky 风险）

### 4) replay 时出现 “URL mismatch” 警告

这是 `ReplayEngine` 的保护性日志：如果 page 当前 url 与 cached.startUrl 不一致会提示，但不一定失败（便于自愈回放）。在测试里使用的 `createNodeTestPage()` 初始 url 是 `about:blank`，因此常见此告警。

## 回归建议（CI/本地）

- **快速回归（稳定）**：只跑 deterministic 套件（不打真实 LLM）
- **真实回归（夜间/手动）**：跑 real-LLM 套件（依赖 AI Gateway）

