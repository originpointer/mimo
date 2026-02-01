# 使用示例

本文档提供了 `@mimo/agent-tools` 的完整使用示例，涵盖从基础到高级的各种场景。

## 目录

- [基础示例](#基础示例)
- [工具注册](#工具注册)
- [策略控制](#策略控制)
- [批量执行](#批量执行)
- [监控系统](#监控系统)
- [完整应用](#完整应用)

## 基础示例

### 简单的工具执行

```typescript
import {
  ToolRegistry,
  ToolExecutor,
  ExecutionContextManager
} from '@mimo/agent-tools';

// 1. 创建注册表并注册工具
const registry = new ToolRegistry();

registry.register({
  name: 'hello',
  description: '向用户打招呼',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '用户名称' }
    },
    required: ['name']
  },
  execute: async (params) => {
    return `你好，${params.name}！`;
  }
});

// 2. 创建执行上下文
const contextManager = new ExecutionContextManager();
const context = contextManager.create({
  logger: console
});

// 3. 执行工具
const executor = new ToolExecutor();
const tool = registry.getTool('hello')!;

const result = await executor.execute(
  tool,
  { name: '世界' },
  context
);

console.log(result.result); // 输出: 你好，世界！
```

## 工具注册

### 注册多种类型的工具

```typescript
import { ToolRegistry } from '@mimo/agent-tools/registry';

const registry = new ToolRegistry();

// 浏览器工具
registry.register({
  name: 'browser_navigate',
  description: '导航到指定 URL',
  group: 'browser',
  tags: ['browser'],
  domains: ['*'],  // 允许所有域名
  execute: async (params, context) => {
    await context.browser?.navigate(params.url);
    return { success: true };
  }
});

// 文件工具
registry.register({
  name: 'file_read',
  description: '读取文件内容',
  group: 'file',
  tags: ['file'],
  execute: async (params, context) => {
    const content = await context.fileSystem?.readFile(params.path);
    return { content };
  }
});

// 搜索工具
registry.register({
  name: 'web_search',
  description: '网络搜索',
  group: 'search',
  tags: ['search'],
  execute: async (params) => {
    // 搜索逻辑...
    return { results: [] };
  }
});

console.log(`已注册 ${registry.size()} 个工具`);
```

### 批量注册工具

```typescript
const tools = [
  {
    name: 'add',
    description: '加法运算',
    group: 'math',
    execute: async (params) => params.a + params.b
  },
  {
    name: 'subtract',
    description: '减法运算',
    group: 'math',
    execute: async (params) => params.a - params.b
  },
  {
    name: 'multiply',
    description: '乘法运算',
    group: 'math',
    execute: async (params) => params.a * params.b
  }
];

registry.registerBatch(tools);

// 获取所有数学工具
const mathTools = registry.getGroup('math');
console.log('数学工具:', mathTools.map(t => t.name));
```

### 带参数注入的工具

```typescript
registry.register({
  name: 'save_to_file',
  description: '保存数据到文件',
  injectConfig: ['fileSystem', 'logger'] as const,
  execute: async (params, context: { fileSystem: FileSystem; logger: Logger }) => {
    context.logger.info(`保存到文件: ${params.path}`);

    await context.fileSystem.writeFile(
      params.path,
      JSON.stringify(params.data)
    );

    return { success: true };
  }
});
```

## 策略控制

### 基本策略

```typescript
import { PolicyBuilder } from '@mimo/agent-tools/policy';
import { ToolRegistry } from '@mimo/agent-tools/registry';

const registry = new ToolRegistry();
// ... 注册工具 ...

// 创建策略：只允许浏览器和文件读取
const policy = new PolicyBuilder()
  .allowTools('browser_*', 'file_read')
  .deny('*_delete', '*_write')
  .build();

// 过滤工具
const allowedTools = registry.filterTools(policy.tools || {});
console.log('允许的工具:', allowedTools.map(t => t.name));
```

### 域名限制策略

```typescript
// 只允许在 GitHub 域名执行某些操作
const githubPolicy = new PolicyBuilder()
  .allowTools('browser_navigate', 'browser_click', 'browser_fill')
  .allowOnDomains('browser_navigate', 'github.com', '*.github.com')
  .allowOnDomains('browser_click', '*.github.com')
  .build();

const allowed = registry.isToolAllowed('browser_navigate', githubPolicy);
console.log('browser_navigate 是否允许:', allowed);
```

### 使用预定义策略

```typescript
import { POLICY_PROFILES } from '@mimo/agent-tools/policy';

// 只允许浏览器工具
const browserOnly = POLICY_PROFILES.BROWSER_ONLY;

// 扩展预定义策略
const customPolicy = new PolicyBuilder()
  .extend(POLICY_PROFILES.BROWSER_ONLY)
  .allow('file_read')
  .allow('web_search')
  .build();
```

### 动态策略

```typescript
const dynamicPolicy = new PolicyBuilder()
  .allowTools('browser_*', 'file_read')
  .setOverride(async (tool, context) => {
    // 根据用户角色决定
    const userRole = context.config?.userRole;

    if (tool.tags?.includes('dangerous')) {
      return userRole === 'admin';
    }

    // 只在工作时间允许
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 18;
  })
  .build();
```

## 批量执行

### 串行执行

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';

const executor = new ToolExecutor();

const tasks = [
  { tool: registry.getTool('browser_navigate')!, params: { url: 'https://example.com' } },
  { tool: registry.getTool('browser_click')!, params: { selector: '#button' } },
  { tool: registry.getTool('file_read')!, params: { path: '/config.json' } }
];

const results = await executor.executeBatch(tasks, context);

for (const result of results) {
  console.log(`${result.toolCall.name}: ${result.success ? '成功' : '失败'}`);
}
```

### 分组并行执行

```typescript
import { ToolScheduler } from '@mimo/agent-tools/scheduler';

const scheduler = new ToolScheduler();

// 浏览器操作会串行执行
// 文件操作会串行执行
// 但浏览器和文件操作之间是并行的
const tasks = [
  { tool: browserNavigateTool, params: { url: 'https://site1.com' } },
  { tool: browserClickTool, params: { selector: '#btn1' } },
  { tool: fileReadTool, params: { path: '/data1.json' } },
  { tool: webSearchTool, params: { query: 'test' } }
];

const results = await scheduler.executeBatch(tasks, context);

// 监控执行状态
for (const group of scheduler.getGroups()) {
  const status = scheduler.getQueueStatus(group);
  console.log(`[${group}] 队列长度: ${status?.length}`);
}

// 等待所有任务完成
await scheduler.shutdown();
```

## 监控系统

### 记录和统计

```typescript
import { getToolMonitor } from '@mimo/agent-tools/monitor';
import { ToolExecutor } from '@mimo/agent-tools/executor';

const executor = new ToolExecutor();
const monitor = getToolMonitor();

// 执行并记录
const result = await executor.execute(tool, params, context);
monitor.record(result);

// 获取统计
const stats = monitor.getStats();
console.log(`
  总执行: ${stats.total}
  成功: ${stats.successful}
  失败: ${stats.failed}
  成功率: ${(stats.successRate * 100).toFixed(1)}%
  平均耗时: ${stats.avgDuration.toFixed(0)}ms
`);

// 获取特定工具统计
const toolStats = monitor.getStats('browser_navigate');
console.log(`browser_navigate 平均耗时: ${toolStats.avgDuration}ms`);

// 获取所有工具统计
const allStats = monitor.getAllStats();
for (const [toolName, stats] of allStats) {
  console.log(`${toolName}: ${stats.successful}/${stats.total} 成功`);
}
```

### 失败分析

```typescript
// 获取最近的失败
const failures = monitor.getRecentFailures(20);

// 分析错误类型
const errorCounts = new Map<string, number>();
for (const failure of failures) {
  const error = failure.result.error || 'Unknown';
  errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
}

// 输出错误报告
console.log('错误分析:');
for (const [error, count] of errorCounts) {
  console.log(`  ${error}: ${count} 次`);
}
```

### 自动化监控

```typescript
class MonitoredExecutor {
  private executor = new ToolExecutor();
  private monitor = getToolMonitor();

  async execute(tool, params, context) {
    const result = await this.executor.execute(tool, params, context);
    this.monitor.record(result);

    // 自动报告失败
    if (!result.success) {
      context.logger?.error(`工具执行失败: ${result.toolCall.name} - ${result.error}`);
    }

    return result;
  }

  getReport() {
    return {
      summary: this.monitor.getStats(),
      failures: this.monitor.getRecentFailures(10)
    };
  }
}
```

## 完整应用

### Agent 工具系统

```typescript
import {
  ToolRegistry,
  ToolExecutor,
  ToolScheduler,
  ExecutionContextManager,
  PolicyBuilder,
  getToolMonitor
} from '@mimo/agent-tools';

class AgentToolSystem {
  private registry = new ToolRegistry();
  private scheduler = new ToolScheduler();
  private contextManager = new ExecutionContextManager();
  private monitor = getToolMonitor();

  constructor() {
    this.initializeTools();
    this.initializePolicy();
  }

  private initializeTools() {
    // 注册浏览器工具
    this.registry.register({
      name: 'browser_navigate',
      description: '导航到 URL',
      group: 'browser',
      tags: ['browser'],
      execute: async (params, ctx) => {
        await ctx.browser?.navigate(params.url);
        return { success: true };
      }
    });

    // 注册文件工具
    this.registry.register({
      name: 'file_read',
      description: '读取文件',
      group: 'file',
      tags: ['file'],
      execute: async (params, ctx) => {
        const content = await ctx.fileSystem?.readFile(params.path);
        return { content };
      }
    });

    // 注册计算工具
    this.registry.register({
      name: 'calculate',
      description: '执行计算',
      group: 'util',
      execute: async (params) => {
        return { result: eval(params.expression) };
      }
    });
  }

  private initializePolicy() {
    // 根据环境设置策略
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.policy = new PolicyBuilder()
      .allowTools('browser_*', 'file_read', 'calculate')
      .deny('*_delete', '*_write')
      .setOverride(async (tool, ctx) => {
        if (isDevelopment) return true;
        // 生产环境的额外检查...
        return true;
      })
      .build();
  }

  private policy: any;

  async execute(toolName: string, params: any, context: any) {
    // 检查策略
    if (!this.registry.isToolAllowed(toolName, this.policy.tools)) {
      throw new Error(`工具 ${toolName} 不被允许执行`);
    }

    // 获取工具
    const tool = this.registry.getTool(toolName);
    if (!tool) {
      throw new Error(`工具 ${toolName} 不存在`);
    }

    // 执行
    const result = await this.scheduler.execute(tool, params, context);
    this.monitor.record(result);

    return result;
  }

  async executeBatch(tasks: Array<{ tool: string; params: any }>, context: any) {
    const items = tasks.map(t => ({
      tool: this.registry.getTool(t.tool)!,
      params: t.params
    }));

    const results = await this.scheduler.executeBatch(items, context);

    for (const result of results) {
      this.monitor.record(result);
    }

    return results;
  }

  getStats() {
    return this.monitor.getStats();
  }

  getAllStats() {
    return this.monitor.getAllStats();
  }
}

// 使用示例
async function main() {
  const system = new AgentToolSystem();

  const context = {
    browser: myBrowser,
    fileSystem: myFileSystem,
    logger: console
  };

  // 执行单个工具
  const result1 = await system.execute('browser_navigate', { url: 'https://example.com' }, context);
  console.log(result1);

  // 批量执行
  const results = await system.executeBatch([
    { tool: 'file_read', params: { path: '/config.json' } },
    { tool: 'calculate', params: { expression: '2 + 2' } }
  ], context);

  console.log('批量结果:', results);

  // 查看统计
  console.log('系统统计:', system.getStats());
}
```

### Web 自动化 Agent

```typescript
import {
  ToolRegistry,
  ToolScheduler,
  ExecutionContextManager,
  PolicyBuilder,
  POLICY_PROFILES
} from '@mimo/agent-tools';

class WebAutomationAgent {
  private registry = new ToolRegistry();
  private scheduler = new ToolScheduler();
  private contextManager = new ExecutionContextManager();

  constructor() {
    this.setupTools();
  }

  private setupTools() {
    // 导航工具
    this.registry.register({
      name: 'go_to',
      description: '访问网页',
      group: 'browser',
      tags: ['browser'],
      domains: ['*'],  // 允许所有域名
      execute: async (params, ctx) => {
        const url = params.url;
        if (!url.startsWith('http')) {
          throw new Error('Invalid URL');
        }
        await ctx.browser?.navigate(url);
        return { url: ctx.browser?.currentUrl };
      }
    });

    // 点击工具
    this.registry.register({
      name: 'click',
      description: '点击元素',
      group: 'browser',
      tags: ['browser'],
      execute: async (params, ctx) => {
        await ctx.browser?.click(params.selector);
        return { clicked: params.selector };
      }
    });

    // 填写工具
    this.registry.register({
      name: 'fill',
      description: '填写表单',
      group: 'browser',
      tags: ['browser'],
      execute: async (params, ctx) => {
        await ctx.browser?.fill(params.selector, params.value);
        return { filled: params.selector };
      }
    });

    // 等待工具
    this.registry.register({
      name: 'wait',
      description: '等待元素',
      group: 'browser',
      tags: ['browser'],
      execute: async (params, ctx) => {
        await ctx.browser?.waitFor(params.selector, params.timeout || 5000);
        return { visible: params.selector };
      }
    });
  }

  async runAutomation(steps: any[], browser: any) {
    const context = this.contextManager.create({ browser });

    const tasks = steps.map(step => ({
      tool: this.registry.getTool(step.action)!,
      params: step.params
    }));

    return await this.scheduler.executeBatch(tasks, context);
  }
}

// 使用示例
async function automateLogin() {
  const agent = new WebAutomationAgent();

  const steps = [
    { action: 'go_to', params: { url: 'https://example.com/login' } },
    { action: 'fill', params: { selector: '#username', value: 'user@example.com' } },
    { action: 'fill', params: { selector: '#password', value: 'password123' } },
    { action: 'click', params: { selector: 'button[type="submit"]' } },
    { action: 'wait', params: { selector: '.dashboard' } }
  ];

  const results = await agent.runAutomation(steps, myBrowser);
  console.log('自动化结果:', results);
}
```

### 受限的文件操作 Agent

```typescript
class SafeFileAgent {
  private registry = new ToolRegistry();
  private executor = new ToolExecutor();
  private contextManager = new ExecutionContextManager();

  constructor() {
    this.setupTools();
  }

  private setupTools() {
    // 只允许安全的文件操作
    this.registry.register({
      name: 'read_file',
      description: '读取文件',
      tags: ['file'],
      execute: async (params, ctx) => {
        // 验证路径
        const path = params.path;
        if (path.includes('..')) {
          throw new Error('Path traversal not allowed');
        }
        const content = await ctx.fileSystem?.readFile(path);
        return { content };
      }
    });

    this.registry.register({
      name: 'list_files',
      description: '列出目录',
      tags: ['file'],
      execute: async (params, ctx) => {
        const files = await ctx.fileSystem?.listFiles(params.path);
        return { files };
      }
    });

    // 不允许的删除和写入操作不会注册
  }

  async execute(action: string, params: any, context: any) {
    const tool = this.registry.getTool(action);
    if (!tool) {
      throw new Error(`Action ${action} not available`);
    }

    return await this.executor.execute(tool, params, context);
  }

  getAvailableActions() {
    return this.registry.getTools().map(t => t.name);
  }
}

// 使用
const agent = new SafeFileAgent();

console.log('可用操作:', agent.getAvailableActions());
// ['read_file', 'list_files']
// 注意: 没有 write_file 或 delete_file
```
