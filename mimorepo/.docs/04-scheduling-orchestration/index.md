# Scheduling & Orchestration

This section describes the core scheduling logic that manages concurrent agent execution in OpenClaw.

## Overview

OpenClaw uses a **queue-based scheduling system** to ensure:

- **Serialization**: Only one agent run per session at a time
- **Concurrency limits**: Global limits on total concurrent agent runs
- **Collision prevention**: Concurrent messages don't corrupt session state
- **Priority handling**: Cron jobs and heartbeats get dedicated lanes

## Queue Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY QUEUE SYSTEM                              │
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Cron Lane  │  │  Main Lane  │  │ Subagent    │  │  Per-Session│       │
│  │             │  │             │  │   Lane      │  │    Lanes    │       │
│  │ maxConcur=1 │  │ maxConcur=N │  │ maxConcur=M │  │ (dynamic)   │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │              │
│         └────────────────┴────────────────┴────────────────┘              │
│                                  │                                        │
│                                  ▼                                        │
│                    ┌──────────────────────────────┐                        │
│                    │   Command Queue Executor    │                        │
│                    │   (serialize execution)     │                        │
│                    └──────────────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────────┘
```

## Queue Lanes

| Lane | Purpose | Concurrency | Source |
|------|---------|-------------|--------|
| **Cron** | Scheduled jobs, wake-ups | 1 (default) | [`src/gateway/server-cron.ts`](../../src/gateway/server-cron.ts) |
| **Main** | Primary agent runs | Configurable | [`src/config/agent-limits.ts`](../../src/config/agent-limits.ts) |
| **Subagent** | Spawned subagents | Configurable | [`src/config/agent-limits.ts`](../../src/config/agent-limits.ts) |
| **Session** | Per-session serialization | 1 per session | [`src/process/command-queue.ts`](../../src/process/command-queue.ts) |

**Lane concurrency configuration**:

```yaml
agents:
  defaults:
    maxConcurrent: 4  # Main lane concurrency

cron:
  maxConcurrentRuns: 1  # Cron lane concurrency
```

Location: [`src/gateway/server-lanes.ts:6`](../../src/gateway/server-lanes.ts#L6)

---

## Documents

| Document | Description |
|----------|-------------|
| **[Session Queues](./session-queues.md)** | Per-session queueing system |
| **[Global Lanes](./global-lanes.md)** | Global concurrency control |
| **[Cron Scheduler](./cron-scheduler.md)** | Cron job and wake-up scheduling |
| **[Queue Modes](./queue-modes.md)** | Collect/steer/followup modes |
| **[Concurrency Control](./concurrency-control.md)** | Serialization and race prevention |
| **[Priority Handling](./priority-handling.md)** | Priority and execution order |

## Queue Execution Flow

```
Incoming Message
       │
       ▼
┌─────────────────────────────────────┐
│  1. Resolve sessionKey             │
│     agent:main:telegram:dm:123456   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Get/create session lane         │
│     Key: sessionKey                 │
│     Limit: 1 (serialized)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Check global lane availability  │
│     - Main lane: maxConcurrent?     │
│     - If full: wait for slot        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Enqueue in session lane         │
│     enqueueCommand({                │
│       lane: Main,                   │
│       sessionKey,                   │
│       run: agentCommand             │
│     })                              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Wait for turn                   │
│     - If lane busy: queue           │
│     - When free: execute            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  6. Execute agent run               │
│     - Load session                  │
│     - Run agent                     │
│     - Stream events                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  7. Release session lane            │
│     - Next queued run can start     │
└─────────────────────────────────────┘
```

## Queue Modes

Channels can specify how concurrent messages are handled:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **collect** | Collect concurrent messages, process together | Burst messages |
| **steer** | Cancel previous run, start new | User changes mind |
| **followup** | Append to existing run | Follow-up questions |

**Example**:

```yaml
channels:
  telegram:
    queueMode: "followup"  # Append follow-ups to current run
```

## Key Concepts

### Session Key as Queue Key

The `sessionKey` serves as the queue partition key:

```
agent:main:telegram:dm:123456789  → Queue for this specific user
agent:main:whatsapp:dm:987654321  → Separate queue
```

This ensures:
- **Isolation**: Different users don't block each other
- **Serialization**: Same user's messages process in order
- **State consistency**: Session history is never corrupted by concurrent writes

### Global vs Session Lanes

```
Global Lane (Main)           Session Lanes (per sessionKey)
─────────────────            ────────────────────────────
┌─────────────┐              ┌─────────────────────────┐
│ Slot 1      │─────────────▶│ sessionKey A (busy)     │
│ Slot 2      │─────────────▶│ sessionKey B (waiting)  │
│ Slot 3      │─────────────▶│ sessionKey C (free)     │
│ Slot 4      │─────────────▶│ sessionKey D (free)     │
└─────────────┘              └─────────────────────────┘
```

- **Global lane**: Limits total concurrent agent runs (resource management)
- **Session lanes**: Serializes runs per session (state consistency)

### Cron Priority

Cron jobs get a dedicated lane with `maxConcurrent=1`:

```
Cron Lane (serialized)
───────────────────────
┌─────────────────────────┐
│ cron:health-check       │
│ cron:wake-up-8am        │
│ cron:daily-summary      │
└─────────────────────────┘
```

This ensures:
- Cron jobs never starve
- Only one cron job runs at a time
- Cron jobs don't interfere with user messages

## Implementation

### Queue Initialization

**Location**: [`src/gateway/server-lanes.ts:6`](../../src/gateway/server-lanes.ts#L6)

```typescript
export function applyGatewayLaneConcurrency(cfg) {
  setCommandLaneConcurrency(CommandLane.Cron, cfg.cron?.maxConcurrentRuns ?? 1);
  setCommandLaneConcurrency(CommandLane.Main, resolveAgentMaxConcurrent(cfg));
  setCommandLaneConcurrency(CommandLane.Subagent, resolveSubagentMaxConcurrent(cfg));
}
```

### Command Queue

**Location**: [`src/process/command-queue.ts`](../../src/process/command-queue.ts)

```typescript
export async function enqueueCommand(opts: {
  lane: CommandLane;
  sessionKey?: string;
  run: () => Promise<void>;
}): Promise<void> {
  // Enqueues the command in the appropriate lane
  // Waits for turn if lane is busy
  // Executes when lane is free
}
```

### Lane Types

**Location**: [`src/process/lanes.ts`](../../src/process/lanes.ts)

```typescript
export enum CommandLane {
  Cron = "cron",           // Scheduled jobs
  Main = "main",           // Primary agent runs
  Subagent = "subagent",   // Spawned subagents
}
```

## Quick Reference

| Question | Answer |
|----------|--------|
| **How many concurrent runs per session?** | 1 (serialized) |
| **How many total concurrent runs?** | Configurable (`agents.defaults.maxConcurrent`) |
| **Where are queues implemented?** | [`src/process/command-queue.ts`](../../src/process/command-queue.ts) |
| **What are queue modes?** | `collect`, `steer`, `followup` |
| **Do cron jobs block user messages?** | No, separate lane |

## References

| Topic | Location |
|-------|----------|
| Lane concurrency | [`src/gateway/server-lanes.ts`](../../src/gateway/server-lanes.ts) |
| Command queue | [`src/process/command-queue.ts`](../../src/process/command-queue.ts) |
| Lane types | [`src/process/lanes.ts`](../../src/process/lanes.ts) |
| Agent limits | [`src/config/agent-limits.ts`](../../src/config/agent-limits.ts) |
| Cron service | [`src/gateway/server-cron.ts`](../../src/gateway/server-cron.ts) |
