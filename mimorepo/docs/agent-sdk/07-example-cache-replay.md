# 07-示例：缓存命中与回放（WorkflowAgent + AgentCache）

本示例展示 `@mimo/agent-multi` 的 **缓存命中**：同输入第二次运行优先走 replay，从而跳过 LLM 与真实执行。

## 适用场景

- 固定流程/重复任务：登录、导航、下载报表、定期填表
- CI 回归：避免真实外部依赖造成不稳定
- Demo/演示：降低成本与响应时间

## 缓存键的约定

当前 `WorkflowAgent` 的 cache key 由 `AgentCache.buildKey(instruction, options)` 生成，其中 options 会包含：
- `instruction`
- `startUrl`
- `model`
- `tools`（工具名列表）

因此以下变化会影响命中率：
- 工具名增删/改名
- model 变更
- startUrl/instruction 变更（哪怕语义相同但字符串不同）

## 示例：两次执行，第二次必须命中缓存

```ts
import { LLMProvider } from '@mimo/llm';
import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { AgentCache } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';
import type { IPage } from '@mimo/agent-cache';
import { WorkflowAgent } from '@mimo/agent-multi';

import { buildBrowserTools } from './tools';

const llmProvider = new LLMProvider();
const llm = llmProvider.getClient('anthropic/claude-haiku-4.5');

const registry = new ToolRegistry();
registry.registerBatch(buildBrowserTools() as any);
const executor = new ToolExecutor();

const cache = new AgentCache({ store: new MemoryStore(), namespace: 'agent-sdk' });

const agent = new WorkflowAgent({
  id: 'cache-demo',
  model: 'anthropic/claude-haiku-4.5',
  llm,
  registry,
  executor,
  toolContext: { config: {} },
  cache,
});

const page1: IPage = /* page adapter */;
const page2: IPage = /* page adapter */;

const instruction = '在 #q 输入 hello 并点击 #submit';
const startUrl = 'http://127.0.0.1:1234/';

// Run1：miss -> LLM+tools -> save
await agent.execute(instruction, { instruction, startUrl, page: page1, enableCache: true });

// Run2：hit -> replay（不再调用 LLM）
await agent.execute(instruction, { instruction, startUrl, page: page2, enableCache: true });

const stats = await cache.getStats();
console.log(stats); // hits=1, misses=1, replayCount=1（预期）
```

## 回放能力的边界

回放依赖 `ReplayEngine` 对 action type 的支持（当前主要覆盖）：
- `goto`
- `type/fill`
- `click`
- `evaluate`
- `screenshot`
- `wait`

如果你的工具集包含自定义 tool（例如 `downloadFile`），你有两种路线：
- **路线 A（推荐）**：让自定义行为也映射成 `ReplayEngine` 支持的 action type（或扩展 replay 引擎）
- **路线 B**：缓存只作为结果缓存，不做 step replay（需要实现不同的缓存策略）

## 最佳实践

- **缓存只用于稳定任务**：输入与环境一致性越高，收益越高
- **优先用 deterministic 测试验证命中**：见 `tests/integration/agent-flow/agent-flow.deterministic.test.ts`
- **命中后仍要做关键校验**：例如页面 URL/状态检查，避免回放在错误页面执行

