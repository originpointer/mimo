# 执行器 (Executor)

## 概述

执行器模块负责工具的执行，提供了超时控制、重试机制、参数注入和域名保护等功能。

## 核心组件

- **ToolExecutor**：工具执行器，支持超时、重试和错误处理
- **ParamInjector**：参数注入器，自动检测并注入特殊参数
- **DomainGuard**：域名保护器，检查工具是否允许在当前域名执行

## ToolExecutor

ToolExecutor 负责执行工具并处理各种执行场景。

### 构造函数

```typescript
const executor = new ToolExecutor();
```

### API

#### execute

执行单个工具。

```typescript
async execute(
  tool: ToolDefinition,
  params: any,
  context: ToolExecutionContext,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**参数：**
- `tool` - 工具定义
- `params` - 工具参数
- `context` - 执行上下文
- `options` - 执行选项（可选）

**返回：** ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean;        // 是否成功
  result?: any;            // 执行结果（成功时）
  error?: string;          // 错误信息（失败时）
  duration: number;        // 执行耗时（毫秒）
  toolCall: ToolCall;      // 工具调用记录
}
```

#### executeBatch

批量执行工具（串行）。

```typescript
async executeBatch(
  items: Array<{
    tool: ToolDefinition;
    params: any;
  }>,
  context: ToolExecutionContext,
  options?: ExecutionOptions
): Promise<ExecutionResult[]>
```

### 执行选项

```typescript
interface ExecutionOptions {
  timeout?: number;    // 超时时间（毫秒），默认 30000
  retries?: number;    // 重试次数，默认 0
  retryDelay?: number; // 重试延迟（毫秒），默认 1000
}
```

### 使用示例

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';

const executor = new ToolExecutor();

const result = await executor.execute(
  tool,
  { query: 'test' },
  context,
  {
    timeout: 5000,   // 5 秒超时
    retries: 3,      // 失败时重试 3 次
    retryDelay: 1000 // 重试间隔 1 秒
  }
);

if (result.success) {
  console.log('结果:', result.result);
} else {
  console.error('错误:', result.error);
}
```

## ParamInjector

ParamInjector 自动检测并注入工具所需的特殊参数。

### 特殊参数类型

支持以下特殊参数的自动注入：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `fileSystem` | FileSystem | 文件系统接口 |
| `browser` | BrowserSession | 浏览器会话 |
| `llm` | ILLMClient | LLM 客户端 |
| `memory` | MemoryStore | 内存存储 |
| `logger` | Logger | 日志记录器 |
| `config` | Record<string, any> | 配置对象 |

### API

#### detectRequiredParams

检测工具需要的特殊参数。

```typescript
detectRequiredParams(tool: ToolDefinition): SpecialInjectParam[]
```

#### inject

将特殊参数注入到参数对象中。

```typescript
inject<T>(
  params: T,
  context: ToolExecutionContext,
  tool: ToolDefinition
): T
```

#### validate

验证上下文是否包含所需的参数。

```typescript
validate(
  tool: ToolDefinition,
  context: ToolExecutionContext
): { valid: boolean; missing: SpecialInjectParam[] }
```

### 参数注入方式

ParamInjector 通过以下方式检测需要注入的参数：

1. **显式配置**：检查 `tool.injectConfig`
2. **签名检测**：解析函数签名的类型注解
3. **回退机制**：使用 injectConfig 作为后备

### 使用示例

```typescript
import { ParamInjector } from '@mimo/agent-tools/executor';

const injector = new ParamInjector();

// 定义一个需要上下文的工具
const tool = {
  name: 'save_file',
  description: '保存文件',
  injectConfig: ['fileSystem', 'logger'] as SpecialInjectParam[],
  execute: async (params: any, context: { fileSystem: FileSystem; logger: Logger }) => {
    context.logger.info('正在保存文件...');
    await context.fileSystem.writeFile(params.path, params.content);
    return { success: true };
  }
};

// 验证上下文
const validation = injector.validate(tool, context);
if (!validation.valid) {
  console.error('缺少参数:', validation.missing);
}

// 注入参数
const injected = injector.inject({ path: '/test.txt', content: 'Hello' }, context, tool);
```

## DomainGuard

DomainGuard 确保工具只能在允许的域名下执行。

### API

#### check

检查工具是否允许在当前域名执行。

```typescript
async check(
  tool: ToolDefinition,
  browserSession?: BrowserSession
): Promise<boolean>
```

#### validate

验证域名，如果不允许则抛出异常。

```typescript
async validate(
  tool: ToolDefinition,
  browserSession?: BrowserSession
): Promise<void>
```

**异常：**
- `DomainNotAllowedError` - 当域名不被允许时抛出

### 域名匹配

域名支持通配符模式匹配（使用 path-to-regexp）：

```typescript
// 精确匹配
'github.com'

// 通配符子域名
'*.github.com'

// 路径匹配
'github.com/*/blob/*'

// 混合模式
'*.example.com/api/*'
```

### 使用示例

```typescript
import { DomainGuard } from '@mimo/agent-tools/executor';

const guard = new DomainGuard();

// 定义限制域名的工具
const tool = {
  name: 'github_click',
  description: '在 GitHub 上点击元素',
  domains: ['*.github.com', 'github.com'],
  execute: async (params, context) => {
    // ...
  }
};

// 检查是否允许执行
const allowed = await guard.check(tool, context.browser);
if (!allowed) {
  console.log('当前域名不允许执行此工具');
}

// 验证并抛出异常
try {
  await guard.validate(tool, context.browser);
  // 继续执行...
} catch (error) {
  if (error instanceof DomainNotAllowedError) {
    console.error(`不允许在 ${error.domain} 执行 ${error.toolName}`);
  }
}
```

## 错误处理

执行器模块定义了以下错误类型：

| 错误类型 | 说明 |
|---------|------|
| `ToolExecutionError` | 工具执行错误 |
| `ToolTimeoutError` | 工具执行超时 |
| `MissingContextError` | 缺少必需的上下文参数 |
| `DomainNotAllowedError` | 域名不被允许 |

### 错误处理示例

```typescript
import {
  ToolExecutionError,
  ToolTimeoutError,
  MissingContextError,
  DomainNotAllowedError
} from '@mimo/agent-tools/executor';

try {
  const result = await executor.execute(tool, params, context);
} catch (error) {
  if (error instanceof ToolTimeoutError) {
    console.error(`工具 ${error.toolName} 在 ${error.timeout}ms 后超时`);
  } else if (error instanceof MissingContextError) {
    console.error(`缺少上下文参数: ${error.missing.join(', ')}`);
  } else if (error instanceof DomainNotAllowedError) {
    console.error(`域名 ${error.domain} 不在允许列表中`);
  } else if (error instanceof ToolExecutionError) {
    console.error(`执行错误: ${error.message}`);
  }
}
```

## 完整示例

### 基本执行

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';

const executor = new ToolExecutor();

const tool = {
  name: 'calculate',
  description: '执行计算',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string' }
    }
  },
  execute: async (params) => {
    return eval(params.expression);
  }
};

const context = {
  logger: console
};

const result = await executor.execute(
  tool,
  { expression: '2 + 2' },
  context
);

console.log(result.success ? result.result : result.error);
// 输出: 4
```

### 带重试的执行

```typescript
const result = await executor.execute(
  unreliableTool,
  { query: 'test' },
  context,
  {
    timeout: 10000,
    retries: 3,
    retryDelay: 2000
  }
);
```

### 批量执行

```typescript
const results = await executor.executeBatch([
  { tool: tool1, params: { id: 1 } },
  { tool: tool2, params: { id: 2 } },
  { tool: tool3, params: { id: 3 } }
], context);

for (const result of results) {
  console.log(`${result.toolCall.name}: ${result.success ? '成功' : '失败'}`);
}
```

### 带域名保护的工具

```typescript
const githubOnlyTool = {
  name: 'create_issue',
  description: '创建 GitHub Issue',
  domains: ['*.github.com', 'github.com'],
  execute: async (params, context) => {
    // 工具实现...
  }
};

const executor = new ToolExecutor();

// 只有在 GitHub 域名下才会执行成功
const result = await executor.execute(githubOnlyTool, params, context);
```

### 带上下文注入的工具

```typescript
const fileTool = {
  name: 'read_config',
  description: '读取配置文件',
  injectConfig: ['fileSystem', 'logger'] as SpecialInjectParam[],
  execute: async (params: any, context: { fileSystem: FileSystem; logger: Logger }) => {
    context.logger.info(`读取文件: ${params.path}`);
    return await context.fileSystem.readFile(params.path, 'utf-8');
  }
};

const context = {
  fileSystem: myFileSystem,
  logger: myLogger
};

const executor = new ToolExecutor();
const result = await executor.execute(fileTool, { path: '/config.json' }, context);
```
