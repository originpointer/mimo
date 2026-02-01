# @mimo/agent-tools 使用文档

## 简介

`@mimo/agent-tools` 是 Mimo Agent 系统的工具调度、执行和策略管理模块。它提供了一套完整的工具管理功能，包括：

- **工具注册表**：管理工具的注册、索引和查询
- **策略系统**：灵活的工具访问控制策略
- **执行引擎**：支持超时、重试和错误处理的工具执行器
- **调度器**：类型分组的并行执行调度
- **监控系统**：执行统计和历史记录
- **上下文管理**：统一的执行上下文管理

## 目录结构

```
docs/
├── README.md              # 主文档（本文件）
├── registry.md           # 工具注册表文档
├── policy.md             # 策略系统文档
├── executor.md           # 执行器文档
├── scheduler.md          # 调度器文档
├── monitor.md            # 监控系统文档
├── context.md            # 上下文管理文档
└── examples.md           # 使用示例
```

## 快速开始

### 安装

```bash
pnpm add @mimo/agent-tools
```

### 基本使用

```typescript
import { ToolRegistry, ToolExecutor, ExecutionContextManager } from '@mimo/agent-tools';

// 1. 创建工具注册表
const registry = new ToolRegistry();

// 2. 注册工具
registry.register({
  name: 'hello_world',
  description: '向世界问好',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '名称' }
    }
  },
  execute: async (params, context) => {
    return `Hello, ${params.name}!`;
  }
});

// 3. 创建执行上下文
const contextManager = new ExecutionContextManager();
const context = contextManager.create();

// 4. 执行工具
const executor = new ToolExecutor();
const result = await executor.execute(
  registry.getTool('hello_world')!,
  { name: 'World' },
  context
);
```

## 模块导出

`@mimo/agent-tools` 支持多种导入方式：

```typescript
// 导入所有模块
import { ToolRegistry, ToolExecutor, PolicyBuilder, ToolScheduler, ToolMonitor } from '@mimo/agent-tools';

// 仅导入工具注册表
import { ToolRegistry } from '@mimo/agent-tools/registry';

// 仅导入策略模块
import { PolicyBuilder, POLICY_PROFILES } from '@mimo/agent-tools/policy';

// 仅导入执行器
import { ToolExecutor } from '@mimo/agent-tools/executor';

// 仅导入调度器
import { ToolScheduler } from '@mimo/agent-tools/scheduler';

// 仅导入监控
import { ToolMonitor } from '@mimo/agent-tools/monitor';
```

## 核心概念

### 工具定义

工具是一个实现了 `ToolDefinition` 接口的对象：

```typescript
interface ToolDefinition<T = any> {
  name: string;                    // 工具名称
  description: string;             // 工具描述
  parameters?: JSONSchema;         // 参数模式
  group?: string;                  // 执行分组
  tags?: ToolTag[];                // 工具标签
  domains?: string[];              // 允许的域名
  timeout?: number;                // 超时时间（毫秒）
  execute: (params: T, context: ToolExecutionContext) => Promise<any>;
}
```

### 执行上下文

执行上下文包含工具执行时所需的所有依赖和服务：

```typescript
interface ToolExecutionContext {
  fileSystem?: FileSystem;         // 文件系统
  browser?: BrowserSession;        // 浏览器会话
  llm?: ILLMClient;                // LLM 客户端
  memory?: MemoryStore;            // 内存存储
  logger?: Logger;                 // 日志记录器
  config?: Record<string, any>;    // 自定义配置
}
```

### 工具标签

工具标签用于对工具进行分类和过滤：

```typescript
type ToolTag =
  | 'browser'      // 浏览器操作
  | 'file'         // 文件操作
  | 'code'         // 代码操作
  | 'search'       // 搜索操作
  | 'memory'       // 内存操作
  | 'dangerous'    // 危险操作
  | 'runtime';     // 运行时执行
```

## 相关文档

- [工具注册表](./registry.md) - 了解如何注册和查询工具
- [策略系统](./policy.md) - 了解如何控制工具访问权限
- [执行器](./executor.md) - 了解如何执行工具
- [调度器](./scheduler.md) - 了解如何调度多个工具的执行
- [监控系统](./monitor.md) - 了解如何监控工具执行
- [上下文管理](./context.md) - 了解如何管理执行上下文
- [使用示例](./examples.md) - 查看完整的使用示例

## License

MIT
