# 06-示例：工具调用（WorkflowAgent）

本示例展示 `@mimo/agent-multi` 的 **工具调用闭环**：让模型生成结构化 plan，并逐步调用工具执行。

## 适用场景

- 浏览器自动化、RPA、数据抓取、内部系统操作
- 文件/网络/数据库等“有副作用”的操作，需要权限控制与审计
- 希望把执行能力做成可插拔工具集（而不是写死在 Agent 内）

## 核心规范（强约束）

- **工具必须是确定性的、可审计的**：输入参数/输出结果应结构化，避免“隐式副作用”
- **工具参数必须用 zod 严格定义**：让模型难以输出无关字段，降低执行风险
- **工具名称稳定**：工具名变更会导致缓存命中率下降，也会破坏历史兼容
- **不要在工具里随意 eval / 执行任意代码**
- **工具依赖通过 ToolExecutionContext 注入**（例如浏览器 page、logger、config）

## 示例：定义 4 个浏览器工具

```ts
import { z } from 'zod';
import type { ToolDefinition } from '@mimo/agent-core/types';
import type { IPage } from '@mimo/agent-cache';

export function buildBrowserTools(): ToolDefinition[] {
  const goto: ToolDefinition = {
    name: 'goto',
    description: 'Navigate to a URL',
    parameters: z.object({ url: z.string() }).strict(),
    execute: async ({ url }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.goto(url);
      return { ok: true };
    },
  };

  const typeTool: ToolDefinition = {
    name: 'type',
    description: 'Type into selector',
    parameters: z.object({ selector: z.string(), text: z.string() }).strict(),
    execute: async ({ selector, text }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.type(selector, text);
      return { typed: true };
    },
  };

  const click: ToolDefinition = {
    name: 'click',
    description: 'Click selector',
    parameters: z.object({ selector: z.string() }).strict(),
    execute: async ({ selector }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.click(selector);
      return { clicked: true };
    },
  };

  const evaluate: ToolDefinition = {
    name: 'evaluate',
    description: 'Evaluate JS expression (demo only)',
    parameters: z.object({ code: z.string() }).strict(),
    execute: async ({ code }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      const fn = new Function(`return (${code});`);
      const value = await page.evaluate(() => fn());
      return { value };
    },
  };

  return [goto, typeTool, click, evaluate];
}
```

## 示例：构造 WorkflowAgent 并执行

```ts
import { LLMProvider } from '@mimo/llm';
import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { WorkflowAgent } from '@mimo/agent-multi';

import { AgentCache } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';

import type { IPage } from '@mimo/agent-cache';
import { buildBrowserTools } from './tools';

const llmProvider = new LLMProvider();
const llm = llmProvider.getClient('anthropic/claude-haiku-4.5');

const registry = new ToolRegistry();
registry.registerBatch(buildBrowserTools() as any);
const executor = new ToolExecutor();

const cache = new AgentCache({ store: new MemoryStore(), namespace: 'agent-sdk' });

const agent = new WorkflowAgent({
  id: 'workflow-demo',
  model: 'anthropic/claude-haiku-4.5',
  llm,
  registry,
  executor,
  toolContext: { config: {} },
  cache,
  promptTemplate: 'default',
});

const page: IPage = /* 你的 page 适配（见 03-examples Playwright 适配） */;

const result = await agent.execute('在输入框 #q 输入 hello 并点击 #submit', {
  instruction: '在输入框 #q 输入 hello 并点击 #submit',
  startUrl: 'http://127.0.0.1:1234/',
  page,
  enableCache: true,
  sensitiveData: new Map([
    ['AI_GATEWAY_API_KEY', process.env.AI_GATEWAY_API_KEY ?? ''],
  ]),
});

console.log(result.success, result.actions);
```

## 关键点：为什么 plan 是结构化 JSON

`WorkflowAgent` 当前使用 `responseModel`（zod schema）要求模型输出：

- `steps[]`
  - `action.type`: `goto|type|click|evaluate|...`
  - `selector`（可选）

这样可以：
- 让输出更稳定（降低“不是 JSON”的失败率）
- 让执行边界更清晰（只执行允许的 action/tool）
- 更适合缓存与回放（plan 可持久化）

