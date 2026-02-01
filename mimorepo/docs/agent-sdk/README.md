# Agent SDK（Stage06）使用文档

本目录文档面向 **`@mimo/agent-multi`**（Stage06：Agent 编排与上层集成）。它在不改动既有 `@mimo/agent` 的前提下，提供一个可复用的“**LLM 结构化决策 → 工具执行闭环 → 缓存/回放 → 上下文管理**”实现，并配套端到端测试用例验证阶段 1-6 的集成路径。

## 你能得到什么

- **单任务闭环**：LLM 生成结构化 plan（JSON schema），按步骤调用工具执行，收敛为 `AgentResult`。
- **缓存/回放**：同输入二次运行优先走 replay，跳过 LLM 与真实执行（可用于稳定任务提速）。
- **上下文能力**：系统 prompt 模板、历史管理、敏感信息脱敏（避免把 key/token 写入历史）。
- **工作流编排**：支持 `runWorkflow(WorkflowStep[])`（依赖 topo-sort + 串行执行；后续可扩展并行）。

## 包与模块定位

- **Stage06（本目录核心）**：`@mimo/agent-multi`
  - 导出：`WorkflowAgent`
- **Stage02**：`@mimo/llm`
  - 提供 `LLMProvider.getClient()`，并支持 `ILLMClient.complete({ responseModel })` 返回 `structuredData`
- **Stage03**：`@mimo/agent-tools`
  - `ToolRegistry` 注册工具，`ToolExecutor` 负责执行（含超时/重试/域名守卫等）
- **Stage04**：`@mimo/agent-cache`
  - `AgentCache`（key、save/get、replay），`ReplayEngine`（对 `IPage` 回放）
- **Stage05**：`@mimo/agent-context`
  - `PromptManager`（模板）、`MessageManager`（历史）、`SensitiveDataFilter`（脱敏）

## 快速开始

1) 构建（只构建 Stage06 相关依赖，避免 app 构建失败影响）：

```bash
pnpm -C mimorepo exec turbo run build --filter=@mimo/agent-multi...
```

2) 运行“完整 Agent 流程”集成测试（包含 deterministic + real-LLM + cache replay）：

```bash
pnpm -C mimorepo/tests/integration test
```

3) 在代码里使用 `WorkflowAgent`

请从下面文档开始：
- [01-快速开始](./01-quickstart.md)
- [02-模块与数据流](./02-modules-and-dataflow.md)
- [03-典型场景与示例代码](./03-examples.md)
- [04-测试计划与排错](./04-testing.md)
- [05-示例：基础聊天（ChatAgent）](./05-example-chat.md)
- [06-示例：工具调用（WorkflowAgent）](./06-example-tools.md)
- [07-示例：缓存命中与回放（WorkflowAgent + AgentCache）](./07-example-cache-replay.md)

