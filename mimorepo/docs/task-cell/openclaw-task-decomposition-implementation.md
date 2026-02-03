# OpenClaw 任务拆解实现分析

> 深入分析 OpenClaw 如何实现任务拆解和多智能体编排
> 日期：2026-02-02

---

## 目录

1. [架构概览](#架构概览)
2. [OpenProse 语言层](#openprose-语言层)
3. [子智能体生成机制](#子智能体生成机制)
4. [并行执行实现](#并行执行实现)
5. [生命周期管理](#生命周期管理)
6. [结果通知机制](#结果通知机制)
7. [提示词工程](#提示词工程)
8. [设计模式实现](#设计模式实现)
9. [关键代码索引](#关键代码索引)

---

## 架构概览

### 六层架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: OpenProse 语言层                                   │
│  声明式任务编排语法 (.prose 文件)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 2: OpenProse VM 层                                    │
│  LLM 驱动的虚拟机，解释执行程序                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ session 工具调用
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 3: 工具层                                             │
│  sessions_spawn 工具 → 创建子智能体                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ Gateway RPC
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 4: 管理层                                             │
│  subagent-registry → 生命周期管理                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ 事件监听
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 5: 通知层                                             │
│  subagent-announce → 结果回传父会话                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│  Layer 6: 执行层 (Pi Agent)                                  │
│  runEmbeddedPiAgent → 执行单个 LLM 调用                     │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户请求
    │
    ▼
[OpenProse 程序解析]
    │
    ├─→ session 语句 ──→ sessions_spawn 工具
    │                          │
    │                          ▼
    │                     [创建子会话]
    │                          │
    │                          ▼
    │                     [注册到 subagent-registry]
    │                          │
    │                          ▼
    │                     [通过 Gateway 调用 Pi Agent]
    │                          │
    │                          ▼
    │                     [子智能体执行任务]
    │                          │
    │                          ▼
    │                     [监听生命周期事件]
    │                          │
    │                          ▼
    │                     [触发 subagent-announce]
    │                          │
    │                          ▼
    └─────────────────────[结果通知父会话]
```

---

## OpenProse 语言层

### 非传统编译器架构

OpenProse 不采用传统的解析器-编译器-字节码架构，而是**让 LLM 充当虚拟机**：

```
传统编译器：
  源代码 → 词法分析 → 语法分析 → AST → 字节码 → VM 执行

OpenProse：
  源代码 → LLM 理解 → 工具调用 → 真实执行
```

### VM 执行语义

**核心概念：** [prose.md](../.sources/openclaw/extensions/open-prose/skills/prose/prose.md)

```markdown
You are the OpenProse VM.

# 映射关系
- Your conversation history  → The VM's working memory
- Your Task tool calls       → The VM's instruction execution
- Your state tracking        → The VM's execution trace
- Your judgment on **...**    → The VM's intelligent evaluation
```

### 语言原语

| 原语 | 语法 | 作用 |
|------|------|------|
| `session` | `session "task"` | 创建子任务 |
| `resume` | `resume: agent` | 恢复已存在的会话 |
| `parallel` | `parallel: ...` | 并行执行多个分支 |
| `parallel for` | `parallel for x in xs` | 并行处理集合 |
| `block` | `block name(args)` | 定义可复用代码块 |
| `do` | `do block(args)` | 调用代码块 |
| `choice/if` | `choice { ... }` | 条件分支 |
| `try/catch` | `try { ... } catch { ... }` | 错误处理 |

### 智能判断机制

```prose
# **...** 标记表示需要 LLM 智能判断，而非布尔求值
if **user appears frustrated**:
  session "Escalate to human support"

if **data under 50k characters**:
  output session: analyzer
```

---

## 子智能体生成机制

### sessions_spawn 工具实现

**文件：** [sessions-spawn-tool.ts](../.sources/openclaw/src/agents/tools/sessions-spawn-tool.ts)

### 执行流程

```typescript
// 1. 创建独立子会话密钥
const childSessionKey = `agent:${targetAgentId}:subagent:${crypto.randomUUID()}`;

// 2. 构建子智能体系统提示词
const childSystemPrompt = buildSubagentSystemPrompt({
  requesterSessionKey,
  childSessionKey,
  task,
});

// 3. 通过 Gateway RPC 启动子智能体
const response = await callGateway({
  method: "agent",
  params: {
    message: task,
    sessionKey: childSessionKey,
    lane: AGENT_LANE_SUBAGENT,  // 专用通道，避免阻塞主会话
    extraSystemPrompt: childSystemPrompt,
  },
});

// 4. 注册到子智能体注册表
registerSubagentRun({
  runId: childRunId,
  childSessionKey,
  requesterSessionKey,
  task,
  cleanup,
});
```

### 参数结构

```typescript
type SessionsSpawnParams = {
  task: string;                    // 任务描述（必需）
  label?: string;                  // 可选标签
  agentId?: string;                // 目标智能体ID
  model?: string;                  // 模型覆盖
  thinking?: string;               // 思考级别
  runTimeoutSeconds?: number;      // 超时设置
  cleanup?: "delete" | "keep";     // 清理策略
};
```

### 权限控制

```typescript
// 白名单验证
const allowAgents = resolveAgentConfig(cfg, requesterAgentId)?.subagents?.allowAgents ?? [];

if (targetAgentId !== requesterAgentId) {
  const allowAny = allowAgents.some(v => v.trim() === "*");
  const allowSet = new Set(allowAgents.map(v => normalizeAgentId(v).toLowerCase()));

  if (!allowAny && !allowSet.has(normalizedTargetId)) {
    return jsonResult({
      status: "forbidden",
      error: `agentId is not allowed for sessions_spawn (allowed: ${allowedText})`,
    });
  }
}
```

---

## 并行执行实现

### parallel 块实现

```prose
# 语法
parallel:
  task1 = session "独立任务1"
  task2 = session "独立任务2"
  task3 = session "独立任务3"
```

**执行流程：**

```
1. VM 解析 parallel 块
   │
2. 同时创建所有子会话（sessions_spawn）
   │
3. 等待所有子会话完成（Gateway agent.wait）
   │
4. 收集所有结果
   │
5. 继续执行下一条语句
```

### 并行策略

| 策略 | 语法 | 行为 |
|------|------|------|
| `all` (默认) | `parallel:` | 等待所有分支完成 |
| `first` | `parallel (first):` | 首个完成后取消其他 |
| `any` | `parallel (any):` | 首个成功后返回 |

### 失败处理

| 策略 | 语法 | 行为 |
|------|------|------|
| `fail-fast` (默认) | 默认 | 任何错误立即失败 |
| `continue` | `parallel (on-fail: "continue"):` | 等待所有后报告错误 |
| `ignore` | `parallel (on-fail: "ignore"):` | 错误视为成功 |

### parallel for 实现

```prose
# 批量处理集合
parallel for topic in topics:
  session "Deep research on {topic}"

# 等价于
parallel:
  task1 = session "Deep research on {topics[0]}"
  task2 = session "Deep research on {topics[1]}"
  task3 = session "Deep research on {topics[2]}"
  ...
```

### 管道组合

```prose
# map: 转换每个元素
let mapped = data
  | map: session "Transform {item}"

# filter: 过滤元素
let filtered = data
  | filter: session "Is {item} valid?"

# reduce: 归约为单个值
let result = data
  | reduce(acc, curr): session "Combine {acc} and {curr}"
```

---

## 生命周期管理

### 状态机

```
┌─────────┐
│ CREATED │  创建子会话
└────┬────┘
     │
     ▼
┌─────────┐
│ STARTED │  开始执行
└────┬────┘
     │
     ▼
┌─────────┐
│ ENDED   │  执行完成
└────┬────┘
     │
     ├─────────────┐
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────┐
│ ARCHIVED│  │ ANNOUNCED   │  结果已通知
└─────────┘  └─────────────┘
                  │
                  ▼
           ┌─────────────┐
           │ CLEANED_UP  │  已清理
           └─────────────┘
```

### 数据结构

```typescript
// 来自 subagent-registry.ts
type SubagentRunRecord = {
  runId: string;                    // 运行ID
  childSessionKey: string;          // 子会话密钥
  requesterSessionKey: string;      // 父会话密钥
  requesterOrigin?: DeliveryContext; // 父会话上下文
  task: string;                     // 任务描述
  cleanup: "delete" | "keep";       // 清理策略
  label?: string;                   // 标签
  createdAt: number;                // 创建时间
  startedAt?: number;               // 开始时间
  endedAt?: number;                 // 结束时间
  outcome?: SubagentRunOutcome;     // 执行结果
  archiveAtMs?: number;             // 归档时间
  cleanupCompletedAt?: number;      // 清理完成时间
};
```

### 事件监听

```typescript
// 监听子智能体生命周期事件
listenerStop = onAgentEvent((evt) => {
  if (evt.stream !== "lifecycle") return;

  const entry = subagentRuns.get(evt.runId);
  if (!entry) return;

  const phase = evt.data?.phase;

  if (phase === "start") {
    entry.startedAt = evt.data?.startedAt;
  } else if (phase === "end" || phase === "error") {
    entry.endedAt = evt.data?.endedAt;
    entry.outcome = phase === "error"
      ? { status: "error", error: evt.data?.error }
      : { status: "ok" };

    // 触发清理和通知
    beginSubagentCleanup(evt.runId);
    runSubagentAnnounceFlow({ ... });
  }

  // 持久化到磁盘
  persistSubagentRuns();
});
```

### 持久化

```typescript
// 保存到磁盘
function persistSubagentRuns() {
  const filepath = resolveSubagentRegistryPath();
  const data = Array.from(subagentRuns.entries());
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// 启动时恢复
function restoreSubagentRunsOnce() {
  const filepath = resolveSubagentRegistryPath();
  if (!fs.existsSync(filepath)) return;

  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  for (const [runId, entry] of data) {
    subagentRuns.set(runId, entry);
    // 恢复执行（如果未完成）
    if (!entry.endedAt) {
      resumeSubagentRun(runId);
    }
  }
}
```

---

## 结果通知机制

### 通知流程

**文件：** [subagent-announce.ts](../.sources/openclaw/src/agents/subagent-announce.ts)

```typescript
export async function runSubagentAnnounceFlow(params: {
  childSessionKey: string;
  childRunId: string;
  requesterSessionKey: string;
  task: string;
  outcome?: SubagentRunOutcome;
}): Promise<boolean> {
  // 1. 等待子智能体完成
  const wait = await callGateway({
    method: "agent.wait",
    params: { runId: params.childRunId, timeoutMs: waitMs },
  });

  // 2. 构建统计信息
  const statsLine = await buildSubagentStatsLine({
    sessionKey: params.childSessionKey,
    startedAt: params.startedAt,
    endedAt: params.endedAt,
  });
  // 包含：runtime、tokens、成本、sessionKey、transcriptPath

  // 3. 构建通知消息
  const triggerMessage = [
    `A background task "${taskLabel}" just ${statusLabel}.`,
    "",
    "Findings:",
    reply || "(no output)",
    "",
    statsLine,
    "",
    "Summarize this naturally for the user. Keep it brief (1-2 sentences).",
  ].join("\n");

  // 4. 发送到父会话
  await callGateway({
    method: "agent",
    params: {
      sessionKey: params.requesterSessionKey,
      message: triggerMessage,
      deliver: true,
      channel: requesterOrigin?.channel,
    },
  });

  return true;
}
```

### 统计信息

```typescript
type SubagentStats = {
  runtime: string;        // 运行时长 "2m 34s"
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: {
    prompt: string;
    completion: string;
    total: string;
  };
  sessionKey: string;     // 子会话密钥
  transcriptPath: string; // 对话记录路径
};
```

---

## 提示词工程

### 子智能体系统提示词

```typescript
function buildSubagentSystemPrompt(params: {
  requesterSessionKey?: string;
  childSessionKey: string;
  label?: string;
  task?: string;
}) {
  const taskText = params.task?.trim() || "{{TASK_DESCRIPTION}}";

  return [
    "# Subagent Context",
    "",
    "You are a **subagent** spawned by the main agent for a specific task.",
    "",
    "## Your Role",
    `- You were created to handle: ${taskText}`,
    "- Complete this task. That's your entire purpose.",
    "- You are NOT the main agent. Don't try to be.",
    "",
    "## Rules",
    "1. **Stay focused** - Do your assigned task, nothing else",
    "2. **Complete the task** - Your final message will be automatically reported",
    "3. **Don't initiate** - No heartbeats, no proactive actions",
    "4. **Be ephemeral** - You may be terminated after completion",
    "",
    "## What You DON'T Do",
    "- NO user conversations",
    "- NO external messages unless explicitly tasked",
    "- NO cron jobs or persistent state",
    "- NO using the `message` tool directly",
    "",
    "## Session Context",
    params.label ? `- Label: ${params.label}` : undefined,
    `- Requester: ${params.requesterSessionKey}`,
    `- Your session: ${params.childSessionKey}`,
  ].filter(Boolean).join("\n");
}
```

### Captain 模式提示词

```prose
# 协调者智能体
agent captain:
  model: opus
  prompt: """You are a senior engineering manager.

You NEVER write code directly. Your job is to:

- Break down complex tasks into discrete work items
- Dispatch work to appropriate specialists
- Validate that outputs meet requirements
- Maintain strategic alignment with user intent
- Identify blockers and escalate decisions

Always think about:
- What context does each subagent need?
- What can run in parallel?
- What needs human validation?"""
```

### 设计原则

| 原则 | 实现 |
|------|------|
| **角色明确** | main agent vs subagent |
| **边界清晰** | DO vs DON'T 列表 |
| **任务聚焦** | 单一职责，避免越界 |
| **上下文意识** | 传递引用而非值 |
| **检查点设计** | 关键决策请求确认 |

---

## 设计模式实现

### 1. Captain's Chair（协调者模式）

**文件：** [29-captains-chair.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/29-captains-chair.prose)

```prose
# 协调者智能体 - 高级模型
agent captain:
  model: opus
  prompt: "Break down tasks, coordinate work, validate outputs"

# 执行者智能体 - 中等模型
agent coder:
  model: sonnet
  prompt: "Write clean, idiomatic code"

# 审查者智能体
agent critic:
  model: sonnet
  prompt: "Find logic errors, security vulnerabilities"

# 工作流程
let breakdown = session: captain
  prompt: "Analyze this task and create a strategic plan"

do research-sweep(task)

let implementation_plan = session: captain
  context: { breakdown, docs, code }

parallel (on-fail: "continue"):
  impl_a = do implement-with-review(work_items)
  impl_b = session: tester

let integration = session: captain
  context: { impl_a, impl_b }
```

### 2. Divide and Conquer（分治算法）

**文件：** [41-rlm-divide-conquer.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose)

```prose
block process(data, depth):
  # 基础情况
  if **data under 50k characters** or depth <= 0:
    output session: analyzer
      prompt: "{query}"
      context: data

  # 递归情况
  let chunks = session: chunker
    prompt: "Split this corpus"

  # 并行处理
  let partials = []
  parallel for chunk in chunks:
    let result = do process(chunk, depth - 1)
    partials = partials + [result]

  # 合并结果
  output session: synthesizer
    prompt: "Synthesize for: {query}"
    context: partials

output answer = do process(corpus, 4)
```

### 3. Feature Factory（功能工厂）

**文件：** [35-feature-factory.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/35-feature-factory.prose)

```prose
# Phase 1: 理解代码库
let codebase_analysis = session "Analyze codebase structure"

# Phase 2: 设计
let design = session: architect
  prompt: "Design the implementation"

# Phase 3: 任务拆解
let tasks = resume: captain
  prompt: "Break the design into ordered tasks"

# Phase 4: 顺序执行
for task in tasks:
  let implementation = session: implementer
    prompt: "Implement: {task}"

  let review = resume: captain
    prompt: "Review this implementation"

  if review.needs_revision:
    let implementation = session: implementer
      prompt: "Revise based on: {review.feedback}"
```

### 4. Specialist Swarm（专家群体）

```prose
# 专业智能体
agent security-reviewer:
  model: sonnet
  prompt: "Focus on authentication and authorization flaws"

agent performance-reviewer:
  model: sonnet
  prompt: "Focus on algorithmic complexity and I/O"

agent accessibility-reviewer:
  model: sonnet
  prompt: "Focus on WCAG compliance"

# 并行多维度审查
parallel:
  security = session: security-reviewer "Review"
  performance = session: performance-reviewer "Review"
  accessibility = session: accessibility-reviewer "Review"

# 综合审查结果
session "Synthesize all feedback"
  context: { security, performance, accessibility }
```

---

## 关键代码索引

### 核心实现

| 文件 | 功能 |
|------|------|
| [src/agents/tools/sessions-spawn-tool.ts](../.sources/openclaw/src/agents/tools/sessions-spawn-tool.ts) | 子智能体生成工具 |
| [src/agents/subagent-registry.ts](../.sources/openclaw/src/agents/subagent-registry.ts) | 生命周期管理 |
| [src/agents/subagent-announce.ts](../.sources/openclaw/src/agents/subagent-announce.ts) | 结果通知机制 |
| [src/agents/agent-scope.ts](../.sources/openclaw/src/agents/agent-scope.ts) | 智能体作用域配置 |
| [src/agents/pi-embedded-runner/run.ts](../.sources/openclaw/src/agents/pi-embedded-runner/run.ts) | 嵌入式智能体运行器 |

### OpenProse 语言

| 文件 | 功能 |
|------|------|
| [extensions/open-prose/skills/prose/prose.md](../.sources/openclaw/extensions/open-prose/skills/prose/prose.md) | VM 执行语义 |
| [extensions/open-prose/skills/prose/compiler.md](../.sources/openclaw/extensions/open-prose/skills/prose/compiler.md) | 语法规范 |
| [extensions/open-prose/skills/prose/guidance/system-prompt.md](../.sources/openclaw/extensions/open-prose/skills/prose/guidance/system-prompt.md) | 系统提示词 |
| [extensions/open-prose/skills/prose/guidance/patterns.md](../.sources/openclaw/extensions/open-prose/skills/prose/guidance/patterns.md) | 设计模式 |
| [extensions/open-prose/skills/prose/primitives/session.md](../.sources/openclaw/extensions/open-prose/skills/prose/primitives/session.md) | 会话原语 |

### 示例程序

| 文件 | 模式 |
|------|------|
| [extensions/open-prose/skills/prose/examples/29-captains-chair.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/29-captains-chair.prose) | 协调者模式 |
| [extensions/open-prose/skills/prose/examples/35-feature-factory.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/35-feature-factory.prose) | 功能工厂 |
| [extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose) | 分治算法 |
| [extensions/open-prose/skills/prose/examples/37-the-forge.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/37-the-forge.prose) | 大型项目构建 |
| [extensions/open-prose/skills/prose/examples/42-parallel-research-sweep.prose](../.sources/openclaw/extensions/open-prose/skills/prose/examples/42-parallel-research-sweep.prose) | 并行研究 |

### 工作流引擎

| 文件 | 功能 |
|------|------|
| [extensions/lobster/src/lobster-tool.ts](../.sources/openclaw/extensions/lobster/src/lobster-tool.ts) | Lobster 工作流工具 |
| [extensions/llm-task/src/llm-task-tool.ts](../.sources/openclaw/extensions/llm-task/src/llm-task-tool.ts) | LLM 任务工具 |

### 文档

| 文件 | 内容 |
|------|------|
| [docs/tools/subagents.md](../.sources/openclaw/docs/tools/subagents.md) | 子智能体使用文档 |
| [docs/concepts/multi-agent.md](../.sources/openclaw/docs/concepts/multi-agent.md) | 多智能体路由机制 |

---

## 核心创新点总结

### 1. LLM 驱动的 VM

传统编译器 vs OpenProse：
- 传统：源代码 → 解析器 → AST → 字节码 → VM
- OpenProse：源代码 → LLM 理解 → 工具调用 → 真实执行

### 2. 引用传递

上下文按引用传递，避免 Token 膨胀：
```prose
# 不复制数据，只传递引用
session "Analyze this"
  context: largeData  # 引用，不展开
```

### 3. 智能判断

`**condition**` 实现语义理解：
```prose
if **user appears frustrated**:
  session "Escalate to human"
```

### 4. 分层智能体

Captain (Opus) → Specialists (Sonnet/Haiku)：
- 协调与执行分离
- 成本与质量平衡

### 5. 递归分治

处理超大规模输入：
```prose
block process(data, depth):
  if **data small enough** or depth <= 0:
    output session: analyzer
  # 否则递归分块
```

---

## 总结

OpenClaw 的任务拆解实现是一个**创新的多层架构系统**：

1. **语言层**：OpenProse DSL 提供声明式任务编排语法
2. **VM 层**：LLM 充当虚拟机，解释执行程序
3. **工具层**：sessions_spawn 实现子智能体生成
4. **管理层**：subagent-registry 管理完整生命周期
5. **通知层**：subagent-announce 实现结果回传
6. **执行层**：Pi Agent 运行单个 LLM 调用

这种架构实现了**高度可组合、可扩展、可观测**的多智能体编排系统，其核心创新在于：
- **非传统编译器**：LLM 模拟执行而非字节码解释
- **引用传递**：避免上下文窗口爆炸
- **智能判断**：语义理解而非布尔求值
- **分层智能体**：协调与执行分离
- **递归分治**：处理超大规模输入

---

*本文档基于 OpenClaw 源码分析生成*
