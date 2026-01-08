### Stagehand v3（`lib/v3`）文档

本目录整理 `/Users/sodaabe/codes/coding/mimo/.sources/stagehand/packages/core/lib/v3` 的核心实现类与依赖关系（core 粒度），用于快速理解 Stagehand v3 的架构与调用链。

### 快速入口

- **Stagehand 对外入口**：`lib/v3/index.ts`（导出 `V3`，并别名 `Stagehand`）
- **主编排器**：`lib/v3/v3.ts`（`class V3`）

### 文档索引

- **概览 / 生命周期**：[`v3-overview.md`](./v3-overview.md)
- **实现类清单 + 依赖图**：[`v3-dependencies.md`](./v3-dependencies.md)
- **act/extract/observe 主链路**：[`v3-flows-act-extract-observe.md`](./v3-flows-act-extract-observe.md)
- **Agent（AISDK tools / CUA）**：[`v3-agent.md`](./v3-agent.md)
- **Understudy（CDP 驱动层：Context/Page/Frame/Locator）**：[`v3-understudy.md`](./v3-understudy.md)
- **Cache（ActCache/AgentCache）**：[`v3-cache.md`](./v3-cache.md)

### 范围说明（core）

- **包含**：`V3`、Handlers（Act/Extract/Observe/Agent）、LLMProvider/LLMClient、AgentProvider+工具、Understudy（V3Context/Page/Frame/Locator）、Cache（CacheStorage/ActCache/AgentCache）、APIClient（StagehandAPIClient）
- **点到为止**：`dom/*`（脚本生成与注入产物）、`flowLogger.ts`（日志/回放事件）等作为“支撑模块”在文档中按需要引用。
