# Token 追踪详细说明

## PricingManager

### 默认定价数据

PricingManager 内置了主流 LLM 模型的定价数据：

| 模型 | 提供商 | 输入 ($/M tokens) | 输出 ($/M tokens) | 缓存读取 | 缓存写入 |
|------|--------|-------------------|-------------------|---------|---------|
| claude-sonnet-4-5 | Anthropic | $3.00 | $15.00 | $0.30 | $3.75 |
| claude-haiku-4-5 | Anthropic | $0.80 | $4.00 | $0.08 | $1.00 |
| gpt-4o | OpenAI | $5.00 | $15.00 | - | - |
| gpt-4o-mini | OpenAI | $0.15 | $0.60 | - | - |
| o1 | OpenAI | $15.00 | $60.00 | - | - (推理: $15.00) |

### 自定义定价

```typescript
import { PricingManager } from '@mimo/agent-cache';

const pricing = new PricingManager();

// 注册单个模型定价
pricing.registerPricing('my-model', {
    provider: 'custom',
    inputCostPerToken: 0.000001,
    outputCostPerToken: 0.000002,
    maxContext: 128000,
    supportsCaching: false,
});

// 批量注册
pricing.registerPricingMap({
    'model-a': {
        provider: 'provider-a',
        inputCostPerToken: 0.000001,
        outputCostPerToken: 0.000002,
        maxContext: 32000,
        supportsCaching: false,
    },
    'model-b': { ... },
});

// 检查模型是否支持缓存
const supportsCache = pricing.supportsCaching('claude-sonnet-4-5');
console.log(supportsCache); // true
```

### 成本计算

```typescript
const record = pricing.calculateCost('claude-sonnet-4-5', {
    promptTokens: 1000,
    completionTokens: 500,
    cachedReadTokens: 100,
    cachedCreationTokens: 50,
});

console.log(record.costs);
// {
//     inputCost: 0.003,           // 1000 × $0.000003
//     outputCost: 0.0075,          // 500 × $0.000015
//     cacheReadCost: 0.00003,      // 100 × $0.0000003
//     cacheWriteCost: 0.0001875,   // 50 × $0.00000375
//     totalCost: 0.0107175
// }
```

## TokenTracker

### 基础追踪

```typescript
import { TokenTracker } from '@mimo/agent-cache';

const tracker = new TokenTracker();

// 简单追踪
const record = await tracker.track('claude-3-5-sonnet', {
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
});

console.log(record);
// {
//     id: 'cost:1234567890:abc123',
//     timestamp: 1735737600000,
//     model: 'claude-3-5-sonnet',
//     provider: 'anthropic',
//     usage: { promptTokens: 1000, completionTokens: 500, ... },
//     costs: { totalCost: 0.0105, ... }
// }
```

### 带上下文的追踪

```typescript
const record = await tracker.track('claude-3-5-sonnet', usage, {
    agentId: 'agent-123',
    sessionId: 'session-456',
    metadata: {
        userId: 'user-789',
        operation: 'chat',
    },
});
```

### 批量追踪

```typescript
const records = await tracker.trackMultiple([
    { model: 'claude-3-5-sonnet', usage: { promptTokens: 1000, ... } },
    { model: 'gpt-4o', usage: { promptTokens: 500, ... } },
]);
```

### 查询统计

```typescript
// 获取总成本
const totalCost = await tracker.getTotalCost();

// 按时间范围查询
const todayCost = await tracker.getTotalCost({
    start: Date.now() - 86400000, // 过去24小时
    end: Date.now(),
});

// 按模型查询
const claudeCost = await tracker.getTotalCost({
    model: 'claude-3-5-sonnet',
});

// 获取记录
const records = await tracker.getRecords({
    start: Date.now() - 86400000,
    model: 'claude-3-5-sonnet',
    agentId: 'agent-123',
});

// 获取详细统计
const stats = await tracker.getStats();
console.log(stats);
// {
//     totalCost: 1.23,
//     totalTokens: 500000,
//     recordCount: 100
// }

// 生成报告
const report = await tracker.getStatsReport();
console.log(report.byModel);
// {
//     'claude-3-5-sonnet': { totalCost: 0.80, totalTokens: 300000, ... },
//     'gpt-4o': { totalCost: 0.43, totalTokens: 200000, ... }
// }
```

### 使用 Hook

```typescript
const tracker = new TokenTracker({
    hooks: {
        beforeTrack: async (context) => {
            console.log(`开始追踪: ${context.model}`);
        },
        afterTrack: async (context, record) => {
            console.log(`追踪完成: 成本 $${record.costs.totalCost}`);
        },
    },
});
```

## 与 LLM 集成

### Vercel AI SDK

```typescript
import { generateText } from 'ai';
import { TokenTracker } from '@mimo/agent-cache';

const tracker = new TokenTracker();

async function chat(messages: Message[]) {
    const result = await generateText({
        model: 'claude-3-5-sonnet',
        messages,
    });

    // 追踪 Token 使用
    await tracker.track('claude-3-5-sonnet', {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
    });

    return result;
}
```

### Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { TokenTracker } from '@mimo/agent-cache';

const anthropic = new Anthropic();
const tracker = new TokenTracker();

async function chat(message: string) {
    const result = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
    });

    // 追踪 Token 使用（包括缓存 Token）
    await tracker.track('claude-3-5-sonnet', {
        promptTokens: result.usage.input_tokens,
        completionTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens,
        cachedReadTokens: result.usage.cache_read_input_tokens,
        cachedCreationTokens: result.usage.cache_creation_input_tokens,
    });

    return result;
}
```

### OpenAI SDK

```typescript
import OpenAI from 'openai';
import { TokenTracker } from '@mimo/agent-cache';

const openai = new OpenAI();
const tracker = new TokenTracker();

async function chat(message: string) {
    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
    });

    // 追踪 Token 使用
    await tracker.track('gpt-4o', {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
    });

    return result;
}
```
