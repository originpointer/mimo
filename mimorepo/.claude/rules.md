# Mimo Project Rules for Claude

## Code Organization Rules

### No Re-Exports from `@mimo/types`

**Rule:** Packages under `packages/@mimo/` MUST NOT re-export types from `@mimo/types`.

**Rationale:**
- `@mimo/types` is the single source of truth for all shared types
- Re-exporting creates unnecessary indirection and makes dependency tracking harder
- Direct imports from `@mimo/types` make it clear where types are defined

**What to do instead:**
- Import types directly from `@mimo/types` where needed
- Each package should only export its own classes, functions, and error classes

**Correct:**
```typescript
// In packages/@mimo/bus/src/commands.ts
import type { HubCommandRequest, HubCommandResponse } from '@mimo/types';

// In packages/@mimo/bus/src/index.ts
export { MimoBus } from './mimobus.js';
export { MimoBusError, MimoBusTimeoutError } from './errors.js';
```

**Incorrect:**
```typescript
// In packages/@mimo/bus/src/index.ts
export { BusEvent, HubCommandType } from '@mimo/types';  // ❌ Don't re-export types
export type { HubCommandRequest, HubCommandResponse } from '@mimo/types';  // ❌ Don't re-export types
```

**Exception:** Individual type imports within internal implementation files are fine - the rule only applies to package-level index files that act as public API boundaries.

---

## Package Export Responsibilities

| Package | Should Export |
|---------|---------------|
| `@mimo/types` | All shared types (interfaces, enums, type aliases) |
| `@mimo/bus` | `MimoBus` class, bus-specific error classes |
| `@mimo/hub` | `Hub` class, `HubClient` class |
| `@mimo/core` | `Mimo` class, core-specific error classes |
| `@mimo/agent` | `MimoAgent` class, agent-specific error classes |
| `@mimo/context` | `RemotePage`, `RemoteLocator`, `RemoteDeepLocator`, `MimoContext` classes |
| `@mimo/llm` | `LLMProvider`, `LLMClient` abstract class, provider implementations |
