# Agent 缓存详细说明

## AgentCache 概述

AgentCache 用于缓存 Agent 执行过程和结果，支持后续回放。通过缓存可以：

1. **避免重复执行**：相同指令直接返回缓存结果
2. **加速开发调试**：快速回放已执行的操作
3. **降低 API 成本**：减少重复的 LLM 调用

## 构建缓存键

### 使用 CacheKeyBuilder

```typescript
import { CacheKeyBuilder } from '@mimo/agent-cache';

const builder = new CacheKeyBuilder();

const key = builder.build({
    instruction: '在 GitHub 上登录',
    startUrl: 'https://github.com',
    model: 'claude-3-5-sonnet',
    tools: ['browser_click', 'browser_fill'],
});

// 或者使用 AgentCache 的方法
const key2 = agentCache.buildKey('在 GitHub 上登录', {
    instruction: '在 GitHub 上登录',
    model: 'claude-3-5-sonnet',
    tools: ['browser_click', 'browser_fill'],
});
```

### 缓存键的组成

缓存键由以下因素决定：

```typescript
interface CacheKeyConfig {
    instruction: string;     // Agent 指令（必需）
    startUrl?: string;       // 起始 URL（可选）
    model: string;           // 使用的模型（必需）
    tools: string[];         // 使用的工具列表（必需）
    configSignature?: string;// 配置签名（可选）
}
```

## 保存缓存

### 基础保存

```typescript
import { AgentCache } from '@mimo/agent-cache';

const agentCache = new AgentCache();

const key = agentCache.buildKey('登录 GitHub', {
    instruction: '在 GitHub 上登录',
    model: 'claude-3-5-sonnet',
    tools: ['browser_click', 'browser_fill'],
});

await agentCache.save(key, execution);
```

### 带选项的保存

```typescript
await agentCache.save(key, execution, {
    ttl: 86400000,        // 24小时后过期
    prune: true,          // 自动剪枝大体积数据
    removeScreenshots: true,  // 移除截图
    maxTextLength: 10000,     // 截断长文本
});
```

### CachedAgentExecution 结构

```typescript
interface CachedAgentExecution {
    version: 1;
    key: string;
    instruction: string;
    startUrl: string;
    options: {
        instruction: string;
        startUrl?: string;
        model: string;
        tools: string[];
    };
    configSignature: string;
    steps: AgentReplayStep[];
    result: AgentResult;
    timestamp: number;
}

interface AgentReplayStep {
    action: {
        type: string;      // 'goto', 'click', 'type', 'screenshot', etc.
        [key: string]: any;
    };
    selector?: string;     // CSS 选择器
    result?: any;          // 执行结果
}
```

## 获取缓存

```typescript
// 获取缓存
const cached = await agentCache.get(key);

if (cached) {
    console.log('缓存命中！');
    console.log(`执行时间: ${new Date(cached.timestamp).toLocaleString()}`);
    console.log(`步骤数: ${cached.steps.length}`);
    console.log(`结果: ${cached.result.success ? '成功' : '失败'}`);
} else {
    console.log('缓存未命中');
}
```

## 查询缓存

```typescript
// 获取所有缓存
const allEntries = await agentCache.entries();

// 按模型过滤
const claudeCaches = await agentCache.entries({
    model: 'claude-3-5-sonnet',
});

// 按指令过滤
const loginCaches = await agentCache.entries({
    instruction: '登录',
});

// 按起始 URL 过滤
const githubCaches = await agentCache.entries({
    startUrl: 'https://github.com',
});

// 组合过滤
const specific = await agentCache.entries({
    instruction: '登录',
    model: 'claude-3-5-sonnet',
    startUrl: 'https://github.com',
});
```

## 缓存管理

### 失效缓存

```typescript
// 失效所有缓存
await agentCache.invalidate();

// 失效匹配特定模式的缓存
await agentCache.invalidate('login');

await agentCache.invalidate('https://github.com');
```

### 获取统计

```typescript
const stats = await agentCache.getStats();
console.log(stats);
// {
//     totalEntries: 10,
//     hits: 45,
//     misses: 12,
//     replayCount: 8
// }

// 计算命中率
const hitRate = stats.hits / (stats.hits + stats.misses);
console.log(`命中率: ${(hitRate * 100).toFixed(1)}%`);
```

### 导出/导入

```typescript
// 导出所有缓存
const exported = await agentCache.export();
await fs.writeFile('agent-cache.json', JSON.stringify(exported, null, 2));

// 导入缓存
const data = JSON.parse(await fs.readFile('agent-cache.json', 'utf-8'));
const count = await agentCache.import(data);
console.log(`导入了 ${count} 条缓存`);
```

## 结果剪枝

### 使用 ResultPruner

```typescript
import { ResultPruner } from '@mimo/agent-cache';

const pruner = new ResultPruner();

// 剪枝执行结果
const pruned = pruner.prune(execution, {
    removeScreenshots: true,   // 移除截图
    removeBase64: false,       // 保留其他 base64 数据
    maxTextLength: 1000,       // 截断长文本
    truncationMarker: '...[截断]',
});
```

### 估算剪枝收益

```typescript
const benefit = pruner.estimateSizeReduction(execution);

console.log(`原始大小: ${benefit.before} 字节`);
console.log(`剪枝后: ${benefit.after} 字节`);
console.log(`减少: ${benefit.reduction} 字节`);
console.log(`比例: ${benefit.percentage.toFixed(1)}%`);

// 示例输出:
// 原始大小: 1048576 字节
// 剪枝后: 262144 字节
// 减少: 786432 字节
// 比例: 75.0%
```

### 剪枝已缓存的执行

```typescript
await agentCache.prune(key, {
    removeScreenshots: true,
    maxTextLength: 5000,
});
```

## 回放引擎

### 基础回放

```typescript
import { ReplayEngine } from '@mimo/agent-cache';

const engine = new ReplayEngine();

// 回放缓存的执行
const result = await engine.replay(cached, {
    page: browserPage,  // 浏览器页面实例
});
```

### 带选项的回放

```typescript
const result = await engine.replay(cached, {
    page: browserPage,
}, {
    waitTimeout: 10000,        // 等待选择符超时
    skipScreenshots: true,     // 跳过截图步骤
    continueOnError: true,     // 遇到错误继续
    onStep: async (step, index) => {
        console.log(`步骤 ${index + 1}: ${step.action.type}`);
    },
    onError: async (step, error, index) => {
        console.error(`步骤 ${index + 1} 失败:`, error.message);
    },
});
```

### 检查是否可回放

```typescript
const canReplay = engine.canReplay(cached, {
    page: browserPage,
});

console.log(canReplay ? '可以回放' : '不能回放');
```

### 获取步骤摘要

```typescript
const summary = engine.getStepsSummary(cached);
console.log(summary);
// {
//     total: 5,
//     byType: {
//         goto: 1,
//         click: 2,
//         type: 1,
//         screenshot: 1
//     },
//     hasScreenshots: true
// }
```

## 支持的回放操作

| 操作类型 | 说明 | 必需参数 |
|---------|------|---------|
| `goto` | 导航到 URL | `url` |
| `click` | 点击元素 | `selector` |
| `type` / `fill` | 输入文本 | `selector`, `text` |
| `screenshot` | 截图 | - |
| `evaluate` | 执行 JavaScript | `code` |
| `wait` | 等待指定时间 | `duration` |

### AgentContext 接口

```typescript
interface AgentContext {
    page?: IPage;  // 浏览器页面接口
    [key: string]: any;  // 其他上下文数据
}

interface IPage {
    waitForSelector(selector: string, options?: { state?: string; timeout?: number }): Promise<void>;
    click(selector: string, options?: { timeout?: number }): Promise<void>;
    type(selector: string, text: string, options?: { delay?: number }): Promise<void>;
    goto(url: string, options?: { waitUntil?: string }): Promise<void>;
    screenshot(options?: { encoding?: string }): Promise<string | Buffer>;
    evaluate(fn: () => any): Promise<any>;
    url(): string;
}
```

## 完整示例

```typescript
import { AgentCache, ReplayEngine } from '@mimo/agent-cache';

const agentCache = new AgentCache({
    autoPrune: true,
    defaultTTL: 86400000,
});

async function executeAgent(instruction: string) {
    const key = agentCache.buildKey(instruction, {
        instruction,
        model: 'claude-3-5-sonnet',
        tools: ['browser_click', 'browser_fill'],
    });

    // 尝试从缓存获取
    const cached = await agentCache.get(key);
    if (cached) {
        console.log('使用缓存结果');
        return cached.result;
    }

    // 执行 Agent
    console.log('执行 Agent...');
    const result = await runAgent(instruction);

    // 保存到缓存
    await agentCache.save(key, {
        version: 1,
        key,
        instruction,
        startUrl: window.location.href,
        options: { instruction, model: 'claude-3-5-sonnet', tools: [] },
        configSignature: 'abc123',
        steps: result.steps,
        result,
        timestamp: Date.now(),
    });

    return result;
}

// 回放缓存的执行
async function replayAgent(key: string) {
    const cached = await agentCache.get(key);
    if (!cached) {
        throw new Error('缓存不存在');
    }

    const engine = new ReplayEngine();
    return await engine.replay(cached, {
        page: browserPage,
    });
}
```
