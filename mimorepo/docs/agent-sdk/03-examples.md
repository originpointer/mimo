# 03-典型场景与示例代码

本章覆盖常见落地方式：如何定义工具、如何对接真实浏览器、如何运行工作流。

## 场景 A：把 Playwright Page 适配为 `IPage`

`@mimo/agent-cache` 的 `ReplayEngine`/`WorkflowAgent` 使用的是最小页面接口 `IPage`（见 `@mimo/agent-cache`），你可以把 Playwright 的 `page` 做一层适配：

```ts
import type { Page } from 'playwright';
import type { IPage } from '@mimo/agent-cache';

export function adaptPlaywrightPage(page: Page): IPage {
  return {
    async waitForSelector(selector, options) {
      await page.waitForSelector(selector, { timeout: options?.timeout });
    },
    async click(selector, options) {
      await page.click(selector, { timeout: options?.timeout });
    },
    async type(selector, text, options) {
      // Playwright 推荐 fill/type；这里用 type 演示
      await page.type(selector, text, { delay: options?.delay });
    },
    url() {
      return page.url();
    },
    async goto(url, options) {
      await page.goto(url, { waitUntil: options?.waitUntil as any });
    },
    async screenshot(options) {
      const buf = await page.screenshot();
      if (options?.encoding === 'base64') return buf.toString('base64');
      return buf;
    },
    async evaluate(fn) {
      return await page.evaluate(fn);
    },
  };
}
```

## 场景 B：把“页面操作”封装为工具

Stage06 的关键点是：**工具是可插拔的**。你可以把所有外部副作用（浏览器/文件/HTTP/DB）都封装为工具，让 agent 只负责“规划/调度/记录”。

示例：Browser tools（与测试一致）

```ts
import { z } from 'zod';
import type { ToolDefinition } from '@mimo/agent-core/types';
import type { IPage } from '@mimo/agent-cache';

export const gotoTool: ToolDefinition = {
  name: 'goto',
  description: 'Navigate to a URL',
  parameters: z.object({ url: z.string() }),
  execute: async ({ url }, ctx) => {
    const page = (ctx.config as any)?.page as IPage;
    await page.goto(url);
    return { ok: true };
  },
};
```

建议实践：
- 工具 `parameters` 用 zod 严格定义（避免模型乱给字段）
- 工具执行时从 `ToolExecutionContext` 注入依赖（例如 `ctx.config.page`）
- 对不可重试的错误直接 throw（交由 Agent/Executor 决策）

## 场景 C：开启缓存/回放（提速稳定任务）

```ts
import { AgentCache } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';

const cache = new AgentCache({
  store: new MemoryStore(),
  namespace: 'agent-sdk',
});

const agent = new WorkflowAgent({
  // ...
  cache,
});

// 第一次：miss -> LLM+tools -> save
await agent.execute(instruction, { instruction, startUrl, page, enableCache: true });

// 第二次：hit -> replay（不会再调用 LLM）
await agent.execute(instruction, { instruction, startUrl, page, enableCache: true });
```

适用场景：
- 固定网站/固定流程（登录、填表、导出报表）
- 回归测试（同输入重复跑）
- 演示场景（避免现场调用 LLM/外部依赖不稳定）

## 场景 D：工作流编排（runWorkflow）

`WorkflowAgent.runWorkflow(steps)` 支持依赖 topo-sort + 串行执行：

```ts
import type { WorkflowStep } from '@mimo/agent-core/types';

const steps: WorkflowStep[] = [
  { id: 'open', title: 'open', role: 'agent', task: '打开页面', context: { instruction, startUrl, page } },
  { id: 'fill', title: 'fill', role: 'agent', task: '填写表单', dependencies: ['open'], context: { instruction, startUrl, page } },
  { id: 'submit', title: 'submit', role: 'agent', task: '提交', dependencies: ['fill'], context: { instruction, startUrl, page } },
];

const result = await agent.runWorkflow(steps);
console.log(result.success, result.stepResults.get('submit'));
```

注意：
- 目前实现是 P0：串行 + best-effort cycle handling（遇到循环依赖不抛出，但结果可能不符合预期）
- 若要并行（同层无依赖）或多角色分工，可在此基础上扩展

