# Hook 与插件开发

## Hook 系统

Hook 系统允许在关键操作点执行自定义逻辑，类似于中间件或生命周期钩子。

## 可用的 Hooks

### Token 追踪 Hooks

| Hook | 触发时机 | 参数 |
|------|---------|------|
| `beforeTrack` | Token 追踪前 | `TrackContext` |
| `afterTrack` | Token 追踪后 | `TrackContext`, `TokenCostRecord` |

### Agent 缓存 Hooks

| Hook | 触发时机 | 参数 |
|------|---------|------|
| `beforeCache` | 保存缓存前 | `AgentCacheContext`, `CachedAgentExecution` |
| `afterCache` | 保存缓存后 | `AgentCacheContext`, `CachedAgentExecution` |
| `beforeReplay` | 回放前 | `CachedAgentExecution` |
| `afterReplay` | 回放后 | `CachedAgentExecution`, `AgentResult` |
| `beforeInvalidate` | 失效前 | `pattern?` |
| `afterInvalidate` | 失效后 | `pattern?`, `count?` |

## 注册 Hook

### 方法 1: 直接注册

```typescript
import { CacheManager } from '@mimo/agent-cache';

const cache = CacheManager.create();

// Token 追踪后 Hook
cache.onAfterTrack(async (context, record) => {
    console.log(`模型: ${record.model}`);
    console.log(`成本: $${record.costs.totalCost.toFixed(6)}`);
    console.log(`Token: ${record.usage.totalTokens}`);

    // 可以在这里：
    // - 写入数据库
    // - 发送通知
    // - 更新实时统计
    // - 等等...
});

// Agent 缓存后 Hook
cache.onAfterCache(async (context, execution) => {
    console.log(`缓存已保存: ${context.key}`);
});
```

### 方法 2: 使用插件

```typescript
import { CacheManager, createLoggingPlugin } from '@mimo/agent-cache';

const cache = CacheManager.create({}, {
    plugins: [createLoggingPlugin()],
});
```

## 内置插件

### 1. 日志插件

```typescript
import { createLoggingPlugin } from '@mimo/agent-cache';

const logger = createLoggingPlugin({
    logLevel: 'debug',  // 'debug' | 'info' | 'warn' | 'error'
});

const cache = CacheManager.create({}, {
    plugins: [logger],
});

// 输出示例:
// [Cache] Token tracked: claude-3-5-sonnet - $0.009000
// [Cache] Execution cached: agent:abc123...
// [Cache] Execution replayed: agent:abc123... - success
// [Cache] Invalidated 5 entries matching: login
```

### 2. 指标插件

```typescript
import { createMetricsPlugin } from '@mimo/agent-cache';

const metricsPlugin = createMetricsPlugin();

const cache = CacheManager.create({}, {
    plugins: [metricsPlugin],
});

// 获取指标
const plugin = cache.getPlugins().find(p => p.name === 'metrics');
if (plugin && 'getMetrics' in plugin) {
    const stats = (plugin as any).getMetrics();
    console.log(stats);
    // {
    //     tokenTrackCount: 100,
    //     totalTokenCost: 1.23,
    //     cacheHitCount: 50,
    //     cacheMissCount: 20,
    //     replayCount: 10,
    //     invalidateCount: 5
    // }
}
```

### 3. 持久化插件

```typescript
import { createPersistencePlugin } from '@mimo/agent-cache';

const persistencePlugin = createPersistencePlugin({
    saveInterval: 60000,  // 每分钟保存一次
    onSave: async (data) => {
        await fs.writeFile(
            'cache-state.json',
            JSON.stringify(data, null, 2)
        );
    },
});

const cache = CacheManager.create({}, {
    plugins: [persistencePlugin],
});
```

## 自定义插件

### 基础插件

```typescript
import type { CachePlugin } from '@mimo/agent-cache';

const myPlugin: CachePlugin = {
    name: 'my-plugin',
    version: '1.0.0',
    description: '我的自定义插件',

    hooks: {
        afterTrack: async (context, record) => {
            // 自定义逻辑
            console.log(`追踪完成: ${record.model}`);
        },
        afterCache: async (context, execution) => {
            // 自定义逻辑
            console.log(`已缓存: ${context.key}`);
        },
    },
};

const cache = CacheManager.create({}, {
    plugins: [myPlugin],
});
```

### 带生命周期的插件

```typescript
const advancedPlugin: CachePlugin = {
    name: 'advanced-plugin',
    version: '1.0.0',

    hooks: {
        afterTrack: async (context, record) => {
            // 追踪后执行
        },
    },

    // 初始化时调用
    init() {
        console.log('插件已初始化');
        // 可以在这里：
        // - 建立数据库连接
        // - 启动定时任务
        // - 加载配置
    },

    // 销毁时调用
    destroy() {
        console.log('插件已销毁');
        // 可以在这里：
        // - 关闭数据库连接
        // - 清理定时任务
        // - 保存状态
    },
};
```

### 复杂插件示例

```typescript
import type { CachePlugin } from '@mimo/agent-cache';

// 成本告警插件
const costAlertPlugin: CachePlugin = {
    name: 'cost-alert',
    version: '1.0.0',
    description: '当成本超过阈值时发送告警',

    hooks: {
        afterTrack: async (context, record) => {
            const THRESHOLD = 0.1; // $0.1

            if (record.costs.totalCost > THRESHOLD) {
                const alert = {
                    model: record.model,
                    cost: record.costs.totalCost,
                    usage: record.usage,
                    timestamp: new Date().toISOString(),
                };

                // 发送告警（示例：发送到 Slack）
                await fetch('https://hooks.slack.com/services/...', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `⚠️ 高成本告警: $${alert.cost.toFixed(2)}`,
                        attachments: [{ ...alert }],
                    }),
                });
            }
        },
    },
};

// 数据库记录插件
const databasePlugin: CachePlugin = {
    name: 'database-logger',
    version: '1.0.0',

    init() {
        // 初始化数据库连接
        this.db = new Database('sqlite:./cache.db');
    },

    destroy() {
        // 关闭数据库连接
        this.db?.close();
    },

    hooks: {
        afterTrack: async (context, record) => {
            // 记录到数据库
            await this.db.insert('token_usage', {
                id: record.id,
                timestamp: new Date(record.timestamp),
                model: record.model,
                provider: record.provider,
                total_cost: record.costs.totalCost,
                total_tokens: record.usage.totalTokens,
                agent_id: context.agentId,
                session_id: context.sessionId,
            });
        },

        afterCache: async (context, execution) => {
            // 记录到数据库
            await this.db.insert('agent_cache', {
                key: context.key,
                instruction: execution.instruction,
                model: execution.options.model,
                timestamp: new Date(execution.timestamp),
                steps_count: execution.steps.length,
                success: execution.result.success,
            });
        },
    },
};

const cache = CacheManager.create({}, {
    plugins: [costAlertPlugin, databasePlugin],
});
```

### 实时统计插件

```typescript
const realtimeStatsPlugin: CachePlugin = {
    name: 'realtime-stats',
    version: '1.0.0',

    init() {
        this.stats = {
            tokenCostByModel: {},
            cacheHitRate: 0,
            activeSessions: new Set(),
        };
    },

    hooks: {
        afterTrack: async (context, record) => {
            // 按模型统计成本
            if (!this.stats.tokenCostByModel[record.model]) {
                this.stats.tokenCostByModel[record.model] = 0;
            }
            this.stats.tokenCostByModel[record.model] += record.costs.totalCost;

            // 追踪活跃会话
            if (context.sessionId) {
                this.stats.activeSessions.add(context.sessionId);
            }
        },
    },

    getStats() {
        return {
            ...this.stats,
            activeSessions: Array.from(this.stats.activeSessions),
        };
    },
};

const cache = CacheManager.create({}, {
    plugins: [realtimeStatsPlugin],
});
```

## Hook 执行顺序

Hook 按照以下顺序执行：

1. **CacheManager 直接注册的 Hook** (按注册顺序)
2. **插件的 Hook** (按插件注册顺序)

```typescript
cache.onAfterTrack(async (ctx, rec) => {
    console.log('1. 直接注册的 Hook');
});

cache.registerPlugin({
    name: 'plugin-a',
    hooks: {
        afterTrack: async (ctx, rec) => {
            console.log('2. Plugin A Hook');
        },
    },
});

cache.registerPlugin({
    name: 'plugin-b',
    hooks: {
        afterTrack: async (ctx, rec) => {
            console.log('3. Plugin B Hook');
        },
    },
});

// 执行顺序: 1 -> 2 -> 3
```

## 错误处理

Hook 中的错误会被捕获并记录，不会中断主流程：

```typescript
cache.onAfterTrack(async (context, record) => {
    throw new Error('Hook error!');
    // 错误会被记录，但不会影响其他 Hook 或主流程
});

cache.registerPlugin({
    name: 'plugin-with-error',
    hooks: {
        afterTrack: async (context, record) => {
            // 即使上面的 Hook 出错，这个仍会执行
            console.log('仍然执行');
        },
    },
});
```

## 管理插件

```typescript
// 注册插件
cache.registerPlugin(myPlugin);

// 注销插件
cache.unregisterPlugin('my-plugin');

// 获取所有插件
const allPlugins = cache.getPlugins();
console.log(allPlugins);

// 获取特定插件
const plugin = cache.getPlugins().find(p => p.name === 'my-plugin');
```

## 最佳实践

1. **插件命名**: 使用清晰、唯一的名称
2. **错误处理**: 在 Hook 中添加 try-catch
3. **异步操作**: 使用 async/await 处理异步逻辑
4. **资源清理**: 在 `destroy()` 中清理资源
5. **避免阻塞**: Hook 中的操作应尽量快速

```typescript
const goodPlugin: CachePlugin = {
    name: 'good-plugin',

    hooks: {
        afterTrack: async (context, record) => {
            // 快速操作：直接返回
            console.log(record.costs.totalCost);

            // 或使用 Promise 不等待
            database.insert(record).catch(err => {
                console.error('数据库错误:', err);
            });
        },
    },
};
```
