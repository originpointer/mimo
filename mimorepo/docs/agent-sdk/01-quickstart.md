# 01-快速开始（WorkflowAgent）

本章给出一个最小可运行的 `WorkflowAgent` 用法：让 LLM 输出结构化 plan，并用工具执行 plan。

## 前置条件

- **Node >= 18**
- 已安装依赖：`pnpm -C mimorepo install`
- 若要跑 real-LLM：环境变量 **`AI_GATEWAY_API_KEY`** 已配置（本仓库的 integration tests 已按此约定）

## 核心概念（最小集合）

- **LLM（结构化决策）**：通过 `ILLMClient.complete({ responseModel })` 获得 `structuredData`（plan）。
- **Tools（执行闭环）**：plan 的每一步会映射为 tool call，通过 `ToolExecutor.execute()` 执行。
- **Page（回放/执行载体）**：工具通常需要一个页面对象；当前实现通过 `toolContext.config.page` 传入。
- **Cache/Replay（可选）**：配置 `AgentCache` 后，重复输入优先走 `cache.replay()`。

## 最小示例（Node 环境）

> 说明：这里为了让示例“可复制”，用 `@mimo/agent-cache` 的 `IPage` 作为页面接口；你可以用 Playwright/Puppeteer 自己适配（见 [03-典型场景与示例代码](./03-examples.md)）。

```ts
import { z } from 'zod';
import { LLMProvider } from '@mimo/llm';
import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { AgentCache } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';
import type { ToolDefinition } from '@mimo/agent-core/types';
import type { IPage } from '@mimo/agent-cache';
import { WorkflowAgent } from '@mimo/agent-multi';

// 1) 构造工具（示例：goto/type/click/evaluate）
function buildBrowserTools(): ToolDefinition[] {
  const goto: ToolDefinition = {
    name: 'goto',
    description: 'Navigate to url',
    parameters: z.object({ url: z.string() }),
    execute: async ({ url }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.goto(url);
      return { ok: true };
    },
  };

  const typeTool: ToolDefinition = {
    name: 'type',
    description: 'Type into selector',
    parameters: z.object({ selector: z.string(), text: z.string() }),
    execute: async ({ selector, text }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.type(selector, text);
      return { typed: true };
    },
  };

  const click: ToolDefinition = {
    name: 'click',
    description: 'Click selector',
    parameters: z.object({ selector: z.string() }),
    execute: async ({ selector }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      await page.click(selector);
      return { clicked: true };
    },
  };

  const evaluate: ToolDefinition = {
    name: 'evaluate',
    description: 'Evaluate javascript expression',
    parameters: z.object({ code: z.string() }),
    execute: async ({ code }, ctx) => {
      const page = (ctx.config as any)?.page as IPage;
      // 生产环境建议换成受控 evaluator；这里仅演示。
      const fn = new Function(`return (${code});`);
      const value = await page.evaluate(() => fn());
      return { value };
    },
  };

  return [goto, typeTool, click, evaluate];
}

// 2) 准备 LLM client（通过 AI Gateway 或 direct provider）
const llmProvider = new LLMProvider();
const llm = llmProvider.getClient('anthropic/claude-haiku-4.5');

// 3) 注册工具 + executor
const registry = new ToolRegistry();
registry.registerBatch(buildBrowserTools() as any);
const executor = new ToolExecutor();

// 4) 可选：启用 cache/replay
const cache = new AgentCache({ store: new MemoryStore(), namespace: 'agent-sdk' });

// 5) 构造 WorkflowAgent
const agent = new WorkflowAgent({
  id: 'agent-sdk-demo',
  model: 'anthropic/claude-haiku-4.5',
  llm,
  registry,
  executor,
  toolContext: { config: {} },
  cache,
  promptTemplate: 'default',
});

// 6) 执行（page 需要你提供：Playwright 适配见下一章）
const result = await agent.execute('在页面里输入 hello 并提交', {
  instruction: '在页面里输入 hello 并提交',
  startUrl: 'http://127.0.0.1:1234/',
  page: /* your IPage adapter */,
  enableCache: true,
  sensitiveData: new Map([
    // 被 SensitiveDataFilter 替换，避免写入 history
    ['AI_GATEWAY_API_KEY', process.env.AI_GATEWAY_API_KEY ?? ''],
  ]),
});

console.log(result.success, result.duration);
```

## 返回值与可观测点

- `agent.execute()` 返回 `AgentResult`：
  - `success`: 是否成功
  - `actions`: 执行的工具动作序列（每步含参数与结果）
  - `usage`: LLM token 使用情况（注意：结构化输出路径的 usage 目前为 0，详见 [04-测试计划与排错](./04-testing.md)）
- `agent.getHistory()`：
  - 返回脱敏后的消息历史，可用于调试“模型为什么这么规划”。

