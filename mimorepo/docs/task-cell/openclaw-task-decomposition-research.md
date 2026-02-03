# OpenClaw 任务拆解实现调研报告

> 本文档分析 openclaw 项目中任务拆解（Task Decomposition）的实现机制
> 研究日期：2026-02-02

---

## 目录

1. [项目概述](#项目概述)
2. [核心架构](#核心架构)
3. [子智能体机制](#子智能体机制)
4. [OpenProse 工作流语言](#openprose-工作流语言)
5. [任务拆解设计模式](#任务拆解设计模式)
6. [关键代码文件索引](#关键代码文件索引)
7. [实现总结](#实现总结)

---

## 项目概述

OpenClaw 是一个强大的多智能体编排系统，通过 **OpenProse** 领域特定语言（DSL）和**子智能体机制**实现复杂的任务拆解和并行执行。

### 核心特性

| 特性 | 说明 |
|------|------|
| 多智能体编排 | 支持创建和管理多个独立的子智能体 |
| OpenProse DSL | 专门设计的任务编排语言 |
| 并行执行 | 支持 `parallel` 和 `parallel for` 并行模式 |
| 上下文隔离 | 每个子智能体拥有独立的会话和作用域 |
| 结果聚合 | 自动收集和聚合子任务结果 |
| 递归分解 | 支持大规模任务的递归分治处理 |

---

## 核心架构

```
openclaw/
├── src/agents/                    # 智能体核心实现
│   ├── tools/
│   │   ├── sessions-spawn-tool.ts # 子智能体生成工具
│   │   ├── sessions-send-tool.ts  # 消息发送
│   │   └── sessions-list-tool.ts  # 会话管理
│   ├── subagent-registry.ts       # 子智能体注册表
│   └── subagent-announce.ts       # 结果通知机制
├── extensions/
│   ├── open-prose/                # OpenProse 工作流语言
│   │   └── skills/prose/
│   │       ├── prose.md           # VM 执行语义
│   │       ├── compiler.md        # 语法规范
│   │       ├── examples/          # 示例程序（49个）
│   │       └── guidance/          # 设计模式
│   ├── lobster/                   # 工作流引擎
│   └── llm-task/                  # LLM 任务工具
└── docs/
    ├── tools/subagents.md         # 子智能体文档
    └── concepts/multi-agent.md    # 多智能体路由
```

---

## 子智能体机制

### 1. 会话生成工具 (Sessions Spawn Tool)

**文件：** [`src/agents/tools/sessions-spawn-tool.ts`](../.sources/openclaw/src/agents/tools/sessions-spawn-tool.ts)

**核心参数：**

```typescript
SessionsSpawnToolSchema = Type.Object({
  task: Type.String(),                    // 任务描述（必需）
  label: Type.Optional(Type.String()),    // 可选标签
  agentId: Type.Optional(Type.String()),  // 目标智能体ID
  model: Type.Optional(Type.String()),    // 模型覆盖
  thinking: Type.Optional(Type.String()), // 思考级别
  runTimeoutSeconds: Type.Optional(Type.Number()), // 超时设置
  cleanup: optionalStringEnum(["delete", "keep"]), // 清理策略
})
```

**功能特性：**

- 创建独立的子智能体会话
- 支持模型选择和参数覆盖
- 可配置超时和清理策略
- 自动处理任务分发和结果通知

### 2. 子智能体注册表

**文件：** [`src/agents/subagent-registry.ts`](../.sources/openclaw/src/agents/subagent-registry.ts)

**职责：**

- 管理所有子智能体运行记录
- 跟踪生命周期状态（创建、开始、结束、归档）
- 处理结果通知到父会话
- 提供子智能体查询接口

**生命周期状态：**

```
CREATED → STARTED → ENDED → ARCHIVED
    ↓                      ↓
  FAILED               ANNOUNCED
```

### 3. 智能体作用域

**文件：** [`src/agents/agent-scope.ts`](../.sources/openclaw/src/agents/agent-scope.ts)

每个智能体拥有独立的：
- **工作空间（workspace）**：独立的文件系统
- **认证配置**：独立的 API 密钥和权限
- **会话存储**：独立的对话历史

---

## OpenProse 工作流语言

OpenProse 是专门为任务编排设计的 DSL，支持声明式的任务拆解和执行。

### 核心原语

#### 1. 会话原语 (session)

```prose
# 基础会话
let result = session "任务描述"
  context: { data }

# 指定智能体
let result = session: expert "任务描述"

# 并行会话
parallel:
  a = session "任务A"
  b = session "任务B"
```

#### 2. 并行执行

```prose
# 并行块
parallel:
  task1 = session "独立任务1"
  task2 = session "独立任务2"
  task3 = session "独立任务3"

# 并行循环
parallel for item in items:
  session "处理 {item}"

# 扇出-扇入
parallel for topic in topics:
  session "研究 {topic}"

# 聚合结果
session "综合所有研究结果"
  context: { task1, task2, task3 }
```

#### 3. 顺序执行

```prose
# 顺序任务链
let step1 = session "第一步"
let step2 = session "第二步"
  context: step1
let step3 = session "第三步"
  context: step2
```

#### 4. 管道组合

```prose
let result = data
  | filter: session "过滤条件"
  | map: session "转换操作"
  | reduce: session "聚合结果"
```

---

## 任务拆解设计模式

### 模式 1：Captain's Chair（协调者模式）

**文件：** [`extensions/open-prose/skills/prose/examples/29-captains-chair.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/29-captains-chair.prose)

**核心理念：** 分离协调与执行

```prose
# 协调者智能体 - 负责任务拆解和协调
agent captain:
  model: opus
  prompt: """You are a senior engineering manager. You NEVER write code directly.
Your job is to:
- Break down complex tasks into discrete work items
- Dispatch work to appropriate specialists
- Validate that outputs meet requirements
- Maintain strategic alignment with user intent"""

# 执行者智能体
agent coder:
  model: sonnet
  prompt: """You are an expert software engineer. Write clean, idiomatic code."""

# 审查者智能体
agent critic:
  model: sonnet
  prompt: """You are a senior code reviewer. Find logic errors, security vulnerabilities."""

# 并行研究阶段
block research-sweep(topic):
  parallel (on-fail: "continue"):
    docs = session: researcher
      prompt: "Find relevant documentation for: {topic}"
    code = session: researcher
      prompt: "Find existing code patterns for: {topic}"

# 任务拆解
let breakdown = session: captain
  prompt: """Analyze this task and create a strategic plan:
1. List of discrete work items
2. Dependencies between work items
3. What can be parallelized
4. Key questions that need user input"""
```

**适用场景：**
- 复杂功能开发
- 需要多角色协作的任务
- 需要严格质量控制的项目

---

### 模式 2：Feature Factory（功能工厂）

**文件：** [`extensions/open-prose/skills/prose/examples/35-feature-factory.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/35-feature-factory.prose)

**工作流程：**

```prose
# Phase 1: 理解代码库
let codebase_analysis = session "Analyze codebase structure"

# Phase 2: 设计阶段
let design = session: architect
  prompt: "Design the implementation for: {feature}"

# Phase 3: 任务拆解
let tasks = resume: captain
  prompt: """Break the design into ordered implementation tasks.
Each task should be:
- Small enough to implement in one session
- Have clear acceptance criteria
- List file(s) to modify"""

# Phase 4: 顺序执行每个任务
for task in tasks:
  let implementation = session: implementer
    prompt: "Implement this task: {task}"

  # 每个任务后进行审查
  let review = resume: captain
    prompt: "Review this implementation"

  # 审查不通过则重新实现
  if review.needs_revision:
    let implementation = session: implementer
      prompt: "Revise based on feedback: {review.feedback}"
```

**适用场景：**
- 结构化的功能开发
- 需要逐步验证的场景
- 长期项目开发

---

### 模式 3：Divide and Conquer（分治算法）

**文件：** [`extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose)

**递归分解模式：**

```prose
# 处理超过上下文限制的大型输入
block process(data, depth):
  # 基础情况：数据足够小或达到递归深度限制
  if **data under 50k characters** or depth <= 0:
    output session: analyzer
      prompt: "{query}"
      context: data

  # 递归情况：分块处理
  let chunks = session: chunker
    prompt: "Split this corpus into logical sections"
    context: data

  # 并行处理每个分块
  let partials = []
  parallel for chunk in chunks:
    let result = do process(chunk, depth - 1)
    partials = partials + [result]

  # 合并结果
  output session: synthesizer
    prompt: "Synthesize these partial results for: {query}"
    context: partials

# 启动递归处理
output answer = do process(corpus, 4)
```

**适用场景：**
- 超大文档分析
- 大规模代码库重构
- 分布式数据处理

---

### 模式 4：Map-Reduce（映射归约）

```prose
# Map 阶段：并行处理
let mapped = parallel for item in items:
  session "Transform {item}"

# Reduce 阶段：逐步归约
let result = mapped
  | reduce(acc, curr): session "Combine {acc} and {curr}"
```

**适用场景：**
- 批量数据处理
- 分布式计算
- 结果聚合

---

### 模式 5：Specialist Swarm（专家群体）

```prose
# 定义专业智能体
agent security-reviewer:
  model: sonnet
  prompt: "Focus exclusively on authentication and authorization flaws"

agent performance-reviewer:
  model: sonnet
  prompt: "Focus exclusively on algorithmic complexity and I/O bottlenecks"

agent accessibility-reviewer:
  model: sonnet
  prompt: "Focus exclusively on WCAG compliance and screen reader support"

# 并行多维度审查
parallel:
  security = session: security-reviewer "Review this code"
  performance = session: performance-reviewer "Review this code"
  accessibility = session: accessibility-reviewer "Review this code"

# 综合审查结果
session "Synthesize all review feedback"
  context: { security, performance, accessibility }
```

**适用场景：**
- 多维度代码审查
- 需要专家意见的任务
- 综合评估场景

---

## 关键代码文件索引

### 核心实现文件

| 文件路径 | 功能描述 |
|---------|---------|
| [`src/agents/tools/sessions-spawn-tool.ts`](../.sources/openclaw/src/agents/tools/sessions-spawn-tool.ts) | 子智能体生成工具，创建独立会话 |
| [`src/agents/tools/sessions-send-tool.ts`](../.sources/openclaw/src/agents/tools/sessions-send-tool.ts) | 向子智能体会话发送消息 |
| [`src/agents/tools/sessions-list-tool.ts`](../.sources/openclaw/src/agents/tools/sessions-list-tool.ts) | 列出所有子会话 |
| [`src/agents/subagent-registry.ts`](../.sources/openclaw/src/agents/subagent-registry.ts) | 子智能体生命周期管理 |
| [`src/agents/subagent-announce.ts`](../.sources/openclaw/src/agents/subagent-announce.ts) | 结果通知机制 |
| [`src/agents/agent-scope.ts`](../.sources/openclaw/src/agents/agent-scope.ts) | 智能体作用域配置 |

### OpenProse 语言文件

| 文件路径 | 功能描述 |
|---------|---------|
| [`extensions/open-prose/skills/prose/prose.md`](../.sources/openclaw/extensions/open-prose/skills/prose/prose.md) | OpenProse VM 执行语义 |
| [`extensions/open-prose/skills/prose/compiler.md`](../.sources/openclaw/extensions/open-prose/skills/prose/compiler.md) | 语法规范和编译器实现 |
| [`extensions/open-prose/skills/prose/primitives/session.md`](../.sources/openclaw/extensions/open-prose/skills/prose/primitives/session.md) | 会话原语定义 |

### 示例程序

| 文件路径 | 模式名称 |
|---------|---------|
| [`examples/29-captains-chair.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/29-captains-chair.prose) | 协调者模式 |
| [`examples/35-feature-factory.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/35-feature-factory.prose) | 功能工厂 |
| [`examples/41-rlm-divide-conquer.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/41-rlm-divide-conquer.prose) | 分治算法 |
| [`examples/37-the-forge.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/37-the-forge.prose) | 大型项目构建 |
| [`examples/42-parallel-research-sweep.prose`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/42-parallel-research-sweep.prose) | 并行研究 |

### 设计文档

| 文件路径 | 功能描述 |
|---------|---------|
| [`docs/tools/subagents.md`](../.sources/openclaw/docs/tools/subagents.md) | 子智能体使用文档 |
| [`docs/concepts/multi-agent.md`](../.sources/openclaw/docs/concepts/multi-agent.md) | 多智能体路由机制 |
| [`extensions/open-prose/skills/prose/guidance/patterns.md`](../.sources/openclaw/extensions/open-prose/skills/prose/guidance/patterns.md) | 设计模式和最佳实践 |
| [`extensions/open-prose/skills/prose/guidance/antipatterns.md`](../.sources/openclaw/extensions/open-prose/skills/prose/guidance/antipatterns.md) | 反模式警告 |
| [`extensions/open-prose/skills/prose/examples/README.md`](../.sources/openclaw/extensions/open-prose/skills/prose/examples/README.md) | 示例总览 |

### 工作流引擎

| 文件路径 | 功能描述 |
|---------|---------|
| [`extensions/lobster/src/lobster-tool.ts`](../.sources/openclaw/extensions/lobster/src/lobster-tool.ts) | Lobster 工作流工具 |
| [`extensions/llm-task/src/llm-task-tool.ts`](../.sources/openclaw/extensions/llm-task/src/llm-task-tool.ts) | LLM 任务工具 |

---

## 实现总结

### 任务拆解的核心机制

#### 1. 层级化智能体架构

```
┌─────────────────────────────────────────┐
│           协调者智能体 (Opus)            │
│  - 任务分析                             │
│  - 拆解规划                             │
│  - 结果验证                             │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┬───────────────┐
     ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│ 执行者  │   │ 执行者  │   │ 执行者  │
│(Sonnet) │   │(Sonnet) │   │(Sonnet) │
│  代码   │   │  测试   │   │  文档   │
└─────────┘   └─────────┘   └─────────┘
```

#### 2. 并行执行策略

| 策略 | 语法 | 适用场景 |
|------|------|---------|
| 并行块 | `parallel: ...` | 独立任务同时执行 |
| 并行循环 | `parallel for` | 批量处理集合 |
| 扇出-扇入 | 先并行后聚合 | 分布式计算 |
| 管道组合 | `data \| map \| reduce` | 流式处理 |

#### 3. 上下文管理原则

1. **最小传递**：只传递必要的上下文
2. **隔离保护**：每个子智能体独立会话
3. **结果聚合**：父会话收集所有子结果
4. **状态追踪**：完整的生命周期记录

#### 4. 质量保证机制

- **检查点验证**：关键决策需用户批准
- **多角色审查**：不同专家视角验证
- **持续反馈**：审查不通过则重新执行
- **错误处理**：支持 `on-fail: "continue"` 策略

### 设计优势

| 优势 | 说明 |
|------|------|
| **模块化** | 清晰的职责分离，易于维护 |
| **可扩展** | 插件化架构，支持自定义智能体 |
| **可组合** | 原语可自由组合成复杂流程 |
| **可观测** | 完整的生命周期追踪 |
| **容错性** | 支持错误恢复和重试 |
| **效率** | 并行执行提升吞吐量 |

### 适用场景

1. **大型功能开发**：Captain's Chair 模式
2. **代码库重构**：Divide and Conquer 模式
3. **批量处理**：Map-Reduce 模式
4. **多维度审查**：Specialist Swarm 模式
5. **研究分析**：Parallel Research Sweep

---

## 参考资料

- **OpenClaw 源码仓库**：[.sources/openclaw/](../.sources/openclaw/)
- **OpenProse 语言文档**：[extensions/open-prose/skills/prose/](../.sources/openclaw/extensions/open-prose/skills/prose/)
- **子智能体工具**：[docs/tools/subagents.md](../.sources/openclaw/docs/tools/subagents.md)
- **设计模式指南**：[extensions/open-prose/skills/prose/guidance/patterns.md](../.sources/openclaw/extensions/open-prose/skills/prose/guidance/patterns.md)

---

*本文档由 AI 自动生成，基于 OpenClaw 项目源码分析*
