# 上下文管理 (Context)

## 概述

上下文管理模块负责创建和管理工具执行上下文，提供统一的依赖注入和配置管理机制。

## 核心组件

- **ExecutionContextManager**：执行上下文管理器
- **ToolExecutionContext**：执行上下文类型

## ExecutionContextManager

### 构造函数

```typescript
const manager = new ExecutionContextManager();
```

### API

#### create

创建一个新的执行上下文。

```typescript
create(options?: ContextOptions): ToolExecutionContext
```

**参数：**
```typescript
interface ContextOptions {
  fileSystem?: FileSystem;         // 文件系统
  browser?: BrowserSession;        // 浏览器会话
  llm?: ILLMClient;                // LLM 客户端
  memory?: MemoryStore;            // 内存存储
  logger?: Logger;                 // 日志记录器
  config?: Record<string, any>;    // 自定义配置
}
```

```typescript
const context = manager.create({
  fileSystem: myFileSystem,
  logger: console,
  config: {
    apiKey: 'secret',
    maxRetries: 3
  }
});
```

#### merge

合并多个上下文。

```typescript
merge(base: ToolExecutionContext, extra: ContextOptions): ToolExecutionContext
```

```typescript
const baseContext = manager.create({ logger: console });
const enhancedContext = manager.merge(baseContext, {
  browser: myBrowser,
  config: { timeout: 5000 }
});
```

#### createChild

创建子上下文（继承父上下文）。

```typescript
createChild(parent: ToolExecutionContext, overrides?: ContextOptions): ToolExecutionContext
```

```typescript
const parentContext = manager.create({
  logger: console,
  config: { apiKey: 'secret' }
});

// 子上下文继承所有父级属性
const childContext = manager.createChild(parentContext, {
  config: { timeout: 5000 }  // 添加额外配置
});

// childContext.config 包含 { apiKey: 'secret', timeout: 5000 }
```

#### validate

验证上下文是否包含必需的字段。

```typescript
validate(context: ToolExecutionContext, requirements: string[]): boolean
```

```typescript
const context = manager.create({ logger: console });

const isValid = manager.validate(context, ['logger', 'config']);
// false - 缺少 config

const isValid2 = manager.validate(context, ['logger']);
// true
```

## 全局实例

### getExecutionContextManager

获取全局上下文管理器实例。

```typescript
import { getExecutionContextManager } from '@mimo/agent-tools/context';

const manager = getExecutionContextManager();
```

### resetExecutionContextManager

重置全局上下文管理器实例。

```typescript
import { resetExecutionContextManager } from '@mimo/agent-tools/context';

resetExecutionContextManager();
```

## 上下文结构

### ToolExecutionContext

```typescript
interface ToolExecutionContext {
  fileSystem?: FileSystem;         // 文件系统操作接口
  browser?: BrowserSession;        // 浏览器会话
  llm?: ILLMClient;                // LLM 客户端
  memory?: MemoryStore;            // 内存存储
  logger?: Logger;                 // 日志记录器
  config?: Record<string, any>;    // 自定义配置
}
```

### 各字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `fileSystem` | FileSystem | 文件系统操作接口（读写文件等） |
| `browser` | BrowserSession | 浏览器会话（网页自动化） |
| `llm` | ILLMClient | LLM 客户端（调用语言模型） |
| `memory` | MemoryStore | 内存存储（键值对存储） |
| `logger` | Logger | 日志记录器（记录日志） |
| `config` | Record<string, any> | 自定义配置（任意键值对） |

## 使用示例

### 基本使用

```typescript
import { ExecutionContextManager } from '@mimo/agent-tools/context';

const manager = new ExecutionContextManager();

// 创建基本上下文
const context = manager.create({
  logger: console,
  config: {
    timeout: 30000,
    maxRetries: 3
  }
});
```

### 创建完整上下文

```typescript
import { ExecutionContextManager } from '@mimo/agent-tools/context';
import { createLogger } from '@mimo/agent-core';

const manager = new ExecutionContextManager();

const context = manager.create({
  fileSystem: {
    readFile: async (path) => { /* ... */ },
    writeFile: async (path, content) => { /* ... */ }
  },
  browser: {
    currentUrl: 'https://example.com',
    navigate: async (url) => { /* ... */ }
  },
  llm: myLLMClient,
  memory: new Map(),
  logger: createLogger('MyTool'),
  config: {
    apiKey: 'xxx',
    endpoint: 'https://api.example.com'
  }
});
```

### 上下文继承

```typescript
// 创建基础上下文
const baseContext = manager.create({
  logger: console,
  config: {
    apiKey: 'secret',
    endpoint: 'https://api.example.com'
  }
});

// 创建子上下文，添加浏览器会话
const browserContext = manager.createChild(baseContext, {
  browser: myBrowser,
  config: {
    timeout: 5000  // 添加额外配置
  }
});

// browserContext.config 现在包含:
// { apiKey: 'secret', endpoint: 'https://api.example.com', timeout: 5000 }
```

### 上下文验证

```typescript
// 定义上下文要求
const REQUIREMENTS = ['logger', 'config'];

// 创建上下文
const context = manager.create({
  logger: console,
  config: { timeout: 30000 }
});

// 验证
if (manager.validate(context, REQUIREMENTS)) {
  console.log('上下文有效');
} else {
  console.error('上下文缺少必需字段');
}
```

### 与执行器配合使用

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { ExecutionContextManager } from '@mimo/agent-tools/context';

const executor = new ToolExecutor();
const contextManager = new ExecutionContextManager();

// 创建带有依赖的上下文
const context = contextManager.create({
  fileSystem: myFileSystem,
  logger: myLogger
});

// 执行工具
const result = await executor.execute(tool, params, context);
```

## 最佳实践

### 1. 使用工厂函数

```typescript
function createContext(apiKey: string): ToolExecutionContext {
  const manager = new ExecutionContextManager();

  return manager.create({
    logger: createLogger('Tool'),
    config: { apiKey },
    llm: new LLMClient(apiKey)
  });
}
```

### 2. 上下文隔离

```typescript
// 每个会话使用独立的上下文
function createSessionContext(sessionId: string): ToolExecutionContext {
  const manager = new ExecutionContextManager();

  return manager.create({
    logger: createLogger(`Session-${sessionId}`),
    memory: new Map(),
    config: { sessionId }
  });
}
```

### 3. 默认值处理

```typescript
function getWithContext<T>(
  context: ToolExecutionContext,
  callback: (ctx: ToolExecutionContext) => T
): T {
  const manager = new ExecutionContextManager();

  // 确保上下文有必需的字段
  const ensured = manager.merge(context, {
    logger: context.logger || createLogger('Tool')
  });

  return callback(ensured);
}
```

### 4. 配置分层

```typescript
// 默认配置
const defaultConfig = {
  timeout: 30000,
  maxRetries: 3
};

// 用户配置
const userConfig = {
  timeout: 5000
};

// 创建上下文
const context = manager.create({
  logger: console,
  config: { ...defaultConfig, ...userConfig }
  // 结果: { timeout: 5000, maxRetries: 3 }
});
```

### 5. 上下文清理

```typescript
// 使用完毕后清理
async function withCleanup<T>(
  context: ToolExecutionContext,
  callback: (ctx: ToolExecutionContext) => Promise<T>
): Promise<T> {
  try {
    return await callback(context);
  } finally {
    // 清理资源
    context.browser?.close?.();
    context.memory?.clear?.();
  }
}
```

## 完整示例

### 多租户上下文管理

```typescript
import { ExecutionContextManager } from '@mimo/agent-tools/context';

class TenantContextManager {
  private manager = new ExecutionContextManager();
  private contexts = new Map<string, ToolExecutionContext>();

  getContext(tenantId: string): ToolExecutionContext {
    if (!this.contexts.has(tenantId)) {
      const context = this.manager.create({
        logger: createLogger(`Tenant-${tenantId}`),
        memory: new Map(),
        config: { tenantId }
      });
      this.contexts.set(tenantId, context);
    }
    return this.contexts.get(tenantId)!;
  }

  removeContext(tenantId: string): void {
    const context = this.contexts.get(tenantId);
    if (context) {
      context.memory?.clear();
      this.contexts.delete(tenantId);
    }
  }

  clearAll(): void {
    for (const [tenantId] of this.contexts) {
      this.removeContext(tenantId);
    }
  }
}

// 使用
const tenantManager = new TenantContextManager();

const context1 = tenantManager.getContext('tenant-1');
const context2 = tenantManager.getContext('tenant-2');

// 两个上下文完全隔离
```

### 请求级上下文

```typescript
import { ExecutionContextManager } from '@mimo/agent-tools/context';

async function handleRequest(request: Request) {
  const manager = new ExecutionContextManager();

  // 为每个请求创建独立上下文
  const context = manager.create({
    logger: createLogger(`Request-${request.id}`),
    config: {
      requestId: request.id,
      userId: request.userId,
      timestamp: Date.now()
    }
  });

  try {
    // 处理请求
    return await processRequest(request, context);
  } finally {
    // 清理
    context.logger?.info('请求处理完成');
  }
}
```

### 环境配置上下文

```typescript
import { ExecutionContextManager } from '@mimo/agent-tools/context';

function createEnvironmentContext(env: 'development' | 'production'): ToolExecutionContext {
  const manager = new ExecutionContextManager();

  const configs = {
    development: {
      logLevel: 'debug',
      timeout: 60000,
      verbose: true
    },
    production: {
      logLevel: 'info',
      timeout: 30000,
      verbose: false
    }
  };

  return manager.create({
    logger: createLogger(env),
    config: {
      environment: env,
      ...configs[env]
    }
  });
}

// 使用
const devContext = createEnvironmentContext('development');
const prodContext = createEnvironmentContext('production');
```
