# API 参考

## 模块导出

```typescript
// 主入口
import { CacheManager } from '@mimo/agent-cache';

// 存储后端
import { MemoryStore, FileSystemStore } from '@mimo/agent-cache/storage';

// Token 追踪
import { TokenTracker, PricingManager } from '@mimo/agent-cache';

// Agent 缓存
import { AgentCache } from '@mimo/agent-cache';
import { CacheKeyBuilder, ResultPruner, ReplayEngine } from '@mimo/agent-cache';

// 插件
import {
    PluginManager,
    createLoggingPlugin,
    createMetricsPlugin,
    createPersistencePlugin,
} from '@mimo/agent-cache';

// 类型
import type {
    ICacheStore,
    CacheEntry,
    CacheStats,
    TokenUsage,
    TokenCostRecord,
    CachedAgentExecution,
    CachePlugin,
} from '@mimo/agent-cache';
```

## CacheManager

### 创建实例

```typescript
CacheManager.create(config?, components?): CacheManager
```

### 配置

```typescript
interface CacheManagerConfig {
    namespace?: string;      // 默认: 'default'
    defaultTTL?: number;      // 默认 TTL (毫秒)
    enableHooks?: boolean;    // 默认: true
}

interface CacheComponents {
    tokenStore?: ICacheStore;
    agentStore?: ICacheStore;
    pricingManager?: PricingManager;
    plugins?: CachePlugin[];
}
```

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getStats()` | `Promise<GlobalStats>` | 获取全局统计 |
| `clear()` | `Promise<void>` | 清空所有缓存 |
| `save()` | `Promise<unknown>` | 序列化状态 |
| `load(data)` | `Promise<void>` | 加载状态 |
| `onBeforeTrack(hook)` | `void` | 注册 Hook |
| `onAfterTrack(hook)` | `void` | 注册 Hook |
| `onBeforeCache(hook)` | `void` | 注册 Hook |
| `onAfterCache(hook)` | `void` | 注册 Hook |
| `registerPlugin(plugin)` | `void` | 注册插件 |
| `unregisterPlugin(name)` | `boolean` | 注销插件 |
| `getPlugins()` | `CachePlugin[]` | 获取所有插件 |

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `tokenTracker` | `TokenTracker` | Token 追踪器 |
| `agentCache` | `AgentCache` | Agent 缓存 |
| `pricing` | `PricingManager` | 定价管理器 |

## TokenTracker

### 构造函数

```typescript
constructor(options?: TokenTrackerOptions)
```

### 配置

```typescript
interface TokenTrackerOptions {
    store?: ICacheStore;
    pricing?: PricingManager;
    namespace?: string;
    hooks?: {
        beforeTrack?: (context) => void | Promise<void>;
        afterTrack?: (context, record) => void | Promise<void>;
    };
}
```

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `track(model, usage, options?)` | `Promise<TokenCostRecord>` | 追踪 Token |
| `trackMultiple(records)` | `Promise<TokenCostRecord[]>` | 批量追踪 |
| `getTotalCost(filter?)` | `Promise<number>` | 获取总成本 |
| `getRecords(filter?)` | `Promise<TokenUsageRecord[]>` | 获取记录 |
| `getStats(filter?)` | `Promise<PricingStats>` | 获取统计 |
| `getStatsReport(filter?)` | `Promise<StatsReport>` | 获取报告 |
| `clear()` | `Promise<void>` | 清空记录 |

## PricingManager

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getPricing(model)` | `ModelPricing` | 获取定价 |
| `registerPricing(model, pricing)` | `void` | 注册定价 |
| `registerPricingMap(map)` | `void` | 批量注册 |
| `calculateCost(model, usage)` | `TokenCostRecord` | 计算成本 |
| `getModels()` | `string[]` | 获取所有模型 |
| `supportsCaching(model)` | `boolean` | 是否支持缓存 |

## AgentCache

### 构造函数

```typescript
constructor(config?: AgentCacheConfig)
```

### 配置

```typescript
interface AgentCacheConfig {
    store?: ICacheStore;
    namespace?: string;
    defaultTTL?: number;
    autoPrune?: boolean;
}
```

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `buildKey(instruction, options)` | `string` | 构建缓存键 |
| `get(key)` | `Promise<CachedAgentExecution \| null>` | 获取缓存 |
| `save(key, execution, options?)` | `Promise<void>` | 保存缓存 |
| `invalidate(pattern?)` | `Promise<void>` | 失效缓存 |
| `clear()` | `Promise<void>` | 清空缓存 |
| `replay(key, context, options?)` | `Promise<AgentResult>` | 回放执行 |
| `canReplay(key, context?)` | `boolean` | 是否可回放 |
| `getStats()` | `Promise<AgentCacheStats>` | 获取统计 |
| `keys()` | `Promise<string[]>` | 获取所有键 |
| `entries(filter?)` | `Promise<CachedAgentExecution[]>` | 获取条目 |
| `prune(key, options?)` | `Promise<boolean>` | 剪枝缓存 |
| `export()` | `Promise<Record<string, CachedAgentExecution>>` | 导出 |
| `import(data)` | `Promise<number>` | 导入 |

## CacheKeyBuilder

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `build(options)` | `string` | 构建缓存键 |
| `buildConfigSignature(config)` | `string` | 构建配置签名 |
| `buildFromInstruction(instruction, options)` | `string` | 从指令构建 |
| `isValidKey(key)` | `boolean` | 验证键格式 |

## ResultPruner

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `prune(execution, options?)` | `CachedAgentExecution` | 剪枝结果 |
| `restore(execution)` | `CachedAgentExecution` | 恢复结果 |
| `estimateSizeReduction(execution, options?)` | `SizeInfo` | 估算收益 |

### 剪枝选项

```typescript
interface PruneOptions {
    removeScreenshots?: boolean;  // 默认: true
    removeBase64?: boolean;       // 默认: false
    maxTextLength?: number;       // 默认: 0 (不限制)
    truncationMarker?: string;    // 默认: '...[truncated]'
}
```

## ReplayEngine

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `replay(cached, context, options?)` | `Promise<AgentResult>` | 回放执行 |
| `canReplay(cached, context?)` | `boolean` | 是否可回放 |
| `getStepsSummary(cached)` | `StepsSummary` | 步骤摘要 |

### 回放选项

```typescript
interface ReplayOptions {
    waitTimeout?: number;         // 默认: 5000
    skipScreenshots?: boolean;    // 默认: false
    continueOnError?: boolean;    // 默认: false
    onStep?: (step, index) => void | Promise<void>;
    onError?: (step, error, index) => void | Promise<void>;
}
```

## 存储后端

### MemoryStore

```typescript
new MemoryStore(options?: MemoryStoreOptions)

interface MemoryStoreOptions {
    maxSize?: number;           // 默认: 无限制
    defaultTTL?: number;         // 默认: 无限制
    cleanupInterval?: number;    // 默认: 0 (不清理)
}
```

### FileSystemStore

```typescript
new FileSystemStore(options: FileSystemStoreOptions)

interface FileSystemStoreOptions {
    rootDir: string;             // 必需
    subdir?: string;             // 默认: 'cache'
    defaultTTL?: number;         // 默认: 无限制
}
```

## 插件

### createLoggingPlugin

```typescript
createLoggingPlugin(options?: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}): CachePlugin
```

### createMetricsPlugin

```typescript
createMetricsPlugin(): CachePlugin & {
    getMetrics(): MetricsData;
}
```

### createPersistencePlugin

```typescript
createPersistencePlugin(options?: {
    saveInterval?: number;
    onSave?: (data: unknown) => void | Promise<void>;
}): CachePlugin
```

## 类型定义

### TokenUsage

```typescript
interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedReadTokens?: number;
    cachedCreationTokens?: number;
    reasoningTokens?: number;
}
```

### TokenCostRecord

```typescript
interface TokenCostRecord {
    id: string;
    timestamp: number;
    model: string;
    provider: LLMProvider;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cachedReadTokens?: number;
        cachedCreationTokens?: number;
        reasoningTokens?: number;
    };
    costs: {
        inputCost: number;
        outputCost: number;
        cacheReadCost?: number;
        cacheWriteCost?: number;
        reasoningCost?: number;
        totalCost: number;
    };
}
```

### CachedAgentExecution

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
        type: string;
        [key: string]: any;
    };
    selector?: string;
    result?: any;
}

interface AgentResult {
    success: boolean;
    actions?: AgentAction[];
    error?: string;
    [key: string]: any;
}
```

### CachePlugin

```typescript
interface CachePlugin {
    name: string;
    version?: string;
    description?: string;
    author?: string;
    hooks?: {
        beforeTrack?: BeforeTrackHook;
        afterTrack?: AfterTrackHook;
        beforeCache?: BeforeCacheHook;
        afterCache?: AfterCacheHook;
        beforeReplay?: BeforeReplayHook;
        afterReplay?: AfterReplayHook;
        beforeInvalidate?: BeforeInvalidateHook;
        afterInvalidate?: AfterInvalidateHook;
    };
    init?(): SyncOrAsync<void>;
    destroy?(): SyncOrAsync<void>;
}
```

### Hook 类型

```typescript
type BeforeTrackHook = (context: TrackContext) => SyncOrAsync<void>;
type AfterTrackHook = (context: TrackContext, record: TokenCostRecord) => SyncOrAsync<void>;
type BeforeCacheHook = (context: AgentCacheContext, execution: CachedAgentExecution) => SyncOrAsync<void>;
type AfterCacheHook = (context: AgentCacheContext, execution: CachedAgentExecution) => SyncOrAsync<void>;
type BeforeReplayHook = (cached: CachedAgentExecution) => SyncOrAsync<void>;
type AfterReplayHook = (cached: CachedAgentExecution, result: AgentResult) => SyncOrAsync<void>;
type BeforeInvalidateHook = (pattern?: string) => SyncOrAsync<void>;
type AfterInvalidateHook = (pattern?: string, count?: number) => SyncOrAsync<void>;

type SyncOrAsync<T> = T | PromiseLike<T>;
```
