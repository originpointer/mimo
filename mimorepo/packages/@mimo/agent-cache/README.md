# @mimo/agent-cache

Cache optimization layer for Mimo Agent system with Token tracking and Agent replay capabilities.

## Features

- **Token Tracking**: Track LLM API usage and costs across multiple providers
- **Agent Caching**: Cache and replay Agent executions with SHA256 keys
- **Storage Backends**: Memory and filesystem storage with unified interface
- **Hook System**: Extend functionality with lifecycle hooks and plugins
- **Result Pruning**: Automatically prune large data (screenshots, base64) from cache

## Installation

```bash
pnpm add @mimo/agent-cache
```

## Quick Start

```typescript
import { CacheManager } from '@mimo/agent-cache';

// Create cache manager
const cache = CacheManager.create({
    namespace: 'my-app',
    defaultTTL: 3600000, // 1 hour
});

// Track token usage
const record = await cache.tokenTracker.track('claude-3-5-sonnet', {
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
});

console.log(`Cost: $${record.costs.totalCost.toFixed(6)}`);

// Agent caching
const key = cache.agentCache.buildKey('Login to GitHub', {
    instruction: 'Login to GitHub',
    model: 'claude-3-5-sonnet',
    tools: ['browser_click', 'browser_fill'],
});

await cache.agentCache.save(key, execution, { prune: true });
```

## Documentation

- [Quick Start](./docs/00-快速开始.md)
- [Token Tracking](./docs/01-Token追踪.md)
- [Agent Caching](./docs/02-Agent缓存.md)
- [Storage Backends](./docs/03-存储后端.md)
- [Hooks & Plugins](./docs/04-Hook与插件.md)
- [API Reference](./docs/05-API参考.md)

## License

MIT
