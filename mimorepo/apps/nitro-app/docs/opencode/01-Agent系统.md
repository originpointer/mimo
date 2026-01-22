# OpenCode Agent 系统

## 概述

OpenCode 的 Agent 系统是其核心功能之一，允许创建专门化的 AI 代理来处理不同类型的任务。每个 Agent 都有独立的配置、权限规则和系统提示词。

## 核心类: Agent 命名空间

### 位置
`packages/opencode/src/agent/agent.ts`

### Agent.Info 数据结构

```typescript
export namespace Agent {
  export const Info = z.object({
    name: z.string(),                    // Agent 唯一标识符
    description: z.string().optional(),  // Agent 描述
    mode: z.enum(["subagent", "primary", "all"]),  // 运行模式
    native: z.boolean().optional(),       // 是否为内置 Agent
    hidden: z.boolean().optional(),       // 是否在 UI 中隐藏
    topP: z.number().optional(),          // 采样参数
    temperature: z.number().optional(),   // 温度参数
    color: z.string().optional(),         // UI 显示颜色
    permission: PermissionNext.Ruleset,  // 权限规则集
    model: z.object({                     // 可选的模型覆盖
      modelID: z.string(),
      providerID: z.string(),
    }).optional(),
    prompt: z.string().optional(),        // 自定义系统提示词
    options: z.record(z.string(), z.any()), // 额外选项
    steps: z.number().int().positive().optional(), // 最大步数限制
  })
  export type Info = z.infer<typeof Info>
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | Agent 的唯一标识符，用于引用 |
| `description` | string | 否 | Agent 功能描述，用于 UI 显示 |
| `mode` | enum | 是 | 运行模式：subagent（仅子代理）、primary（仅主代理）、all（通用） |
| `native` | boolean | 否 | 标识是否为内置 Agent |
| `hidden` | boolean | 否 | 是否在 UI 选择器中隐藏 |
| `temperature` | number | 否 | LLM 温度参数，控制输出随机性 |
| `topP` | number | 否 | LLM top-p 采样参数 |
| `color` | string | 否 | UI 中显示的颜色 |
| `permission` | Ruleset | 是 | Agent 的权限规则集 |
| `model` | object | 否 | 覆盖默认模型配置 |
| `prompt` | string | 否 | 自定义系统提示词 |
| `options` | object | 否 | Agent 特定的额外选项 |
| `steps` | number | 否 | 最大执行步数限制 |

## 内置 Agent

### 1. build Agent

**用途**: 构建和测试项目的专用 Agent

**配置**:
```typescript
{
  name: "build",
  mode: "primary",
  native: true,
  permission: {
    // 允许所有工具 + question + plan_enter
  }
}
```

**特点**:
- 可以使用 question 工具向用户提问
- 可以进入计划模式
- 适用于运行构建、测试等操作

### 2. plan Agent

**用途**: 制定实施计划的专用 Agent

**配置**:
```typescript
{
  name: "plan",
  mode: "primary",
  native: true,
  permission: {
    edit: {
      "*": "deny",
      ".opencode/plans/*.md": "allow",  // 只能编辑计划文件
    }
  }
}
```

**特点**:
- 只读模式（除计划文件外）
- 可向用户提问
- 可退出计划模式
- 专注于分析和规划而非执行

### 3. general Agent

**用途**: 通用目的 Agent，用于研究和执行多步骤任务

**配置**:
```typescript
{
  name: "general",
  description: "General-purpose agent for researching complex questions...",
  mode: "subagent",
  native: true,
  permission: {
    // 禁用 todoread 和 todowrite
  }
}
```

**特点**:
- 可并行执行多个工作单元
- 研究复杂问题
- 执行多步骤任务

### 4. explore Agent

**用途**: 快速探索代码库的专用 Agent

**配置**:
```typescript
{
  name: "explore",
  description: "Fast agent specialized for exploring codebases...",
  mode: "subagent",
  native: true,
  permission: {
    // 只允许只读工具
    "*": "deny",
    grep: "allow",
    glob: "allow",
    list: "allow",
    bash: "allow",  // 仅限只读命令
    webfetch: "allow",
    websearch: "allow",
    read: "allow",
  }
}
```

**提示词** (`src/agent/prompt/explore.txt`):
```
You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Use Bash for file operations like copying, moving, or listing directory contents
...
```

**特点**:
- 只读权限
- 专注于快速搜索和分析
- 支持三种搜索级别：quick、medium、very thorough

### 5. compaction Agent

**用途**: 会话压缩的内部 Agent

**配置**:
```typescript
{
  name: "compaction",
  mode: "primary",
  native: true,
  hidden: true,  // UI 中隐藏
  permission: {
    "*": "deny",  // 完全禁用工具
  }
}
```

**用途**: 当会话上下文过大时，自动压缩消息历史

### 6. title Agent

**用途**: 生成会话标题的内部 Agent

**配置**:
```typescript
{
  name: "title",
  mode: "primary",
  native: true,
  hidden: true,
  temperature: 0.5,  // 较低温度确保一致性
  permission: {
    "*": "deny",
  }
}
```

**提示词** (`src/agent/prompt/title.txt`):
```
You are a title generator. You output ONLY a thread title.

Rules:
- Title must be grammatically correct and read naturally
- Never include tool names in the title
- Focus on the main topic or question
- Keep exact: technical terms, numbers, filenames
- Remove: the, this, my, a, an
- Never assume tech stack
- ≤50 characters
...
```

### 7. summary Agent

**用途**: 生成会话摘要的内部 Agent

**配置**:
```typescript
{
  name: "summary",
  mode: "primary",
  native: true,
  hidden: true,
  permission: {
    "*": "deny",
  }
}
```

**提示词** (`src/agent/prompt/summary.txt`):
```
Summarize what was done in this conversation. Write like a pull request description.

Rules:
- 2-3 sentences max
- Describe the changes made, not the process
- Do not mention running tests, builds, or other validation steps
- Write in first person (I added..., I fixed...)
- Never ask questions or add new questions
...
```

## 核心方法

### Agent.get(agent: string)

获取指定名称的 Agent 配置。

```typescript
const buildAgent = await Agent.get("build")
console.log(buildAgent.permission)
```

### Agent.list()

列出所有可用的 Agent，按配置的默认 Agent 排序。

```typescript
const agents = await Agent.list()
for (const agent of agents) {
  console.log(`${agent.name}: ${agent.description}`)
}
```

### Agent.defaultAgent()

获取默认的 Agent 标识符。

```typescript
const defaultAgent = await Agent.defaultAgent()
```

### Agent.generate(input)

基于用户描述自动生成新的 Agent 配置。

```typescript
const result = await Agent.generate({
  description: "Create an agent for code review"
})
// 返回: { identifier, whenToUse, systemPrompt }
```

生成提示词位于 `src/agent/generate.txt`，指导 AI 创建高质量的 Agent 配置。

## 权限系统集成

每个 Agent 都有自己的权限规则集 (`PermissionNext.Ruleset`)，决定了该 Agent 可以使用哪些工具和操作。

### 权限继承

```typescript
const defaults = PermissionNext.fromConfig({
  "*": "allow",           // 默认允许所有工具
  doom_loop: "ask",       // 检测死循环时询问
  external_directory: {
    "*": "ask",
    [Truncate.DIR]: "allow",
    [Truncate.GLOB]: "allow",
  },
  read: {
    "*.env": "ask",       // 敏感文件需要确认
    "*.env.*": "ask",
  },
})

const user = PermissionNext.fromConfig(cfg.permission ?? {})
const agentPermission = PermissionNext.merge(defaults, user, agentSpecific)
```

## Agent 调用

### 通过 Task Tool

```typescript
await Tool.execute({
  name: "task",
  input: {
    subagent: "explore",  // 指定 Agent
    description: "Search for all TypeScript files in src/",
    model: { providerID: "anthropic", modelID: "claude-sonnet-4" }
  }
})
```

### Subtask Part

消息中可以包含子任务部分：

```typescript
{
  type: "subtask",
  prompt: "分析认证模块的实现",
  description: "研究认证流程",
  agent: "explore",
  command: "quick"  // 可选的搜索级别
}
```

## 自定义 Agent

### 通过配置文件

在 `~/.opencode/config.json` 中添加：

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "prompt": "You are a code review expert...",
      "mode": "subagent",
      "permission": {
        "*": "deny",
        "read": "allow",
        "grep": "allow"
      }
    }
  }
}
```

### 通过 AGENTS.md

在项目根目录创建 `AGENTS.md`：

```markdown
# Code Review Agent

When reviewing code, check for:
- Security vulnerabilities
- Performance issues
- Code style consistency
```

## Agent 生成系统

OpenCode 支持通过自然语言描述自动生成 Agent 配置。

### 生成流程

1. 用户描述想要的 Agent 功能
2. 系统调用 `Agent.generate()`
3. 使用 LLM 分析描述并生成配置
4. 返回 `identifier`、`whenToUse` 和 `systemPrompt`

### 生成提示词原则

位于 `src/agent/generate.txt`：

1. **提取核心意图**: 识别基本目的和成功标准
2. **设计专家人设**: 创建相关领域的专家身份
3. **架构全面指令**: 包含行为边界、方法论、边缘处理
4. **性能优化**: 决策框架、质量控制、高效工作流
5. **创建标识符**: 简洁、描述性、易记忆

### 示例

输入:
```
"Create an agent that reviews recently written code for bugs"
```

输出:
```json
{
  "identifier": "code-reviewer",
  "whenToUse": "Use this agent after writing a logical chunk of code to review for bugs, security issues, and best practices.",
  "systemPrompt": "You are a senior code review specialist..."
}
```

## 最佳实践

### Agent 设计原则

1. **单一职责**: 每个 Agent 应专注于特定任务
2. **明确权限**: 只授予必要的工具权限
3. **清晰描述**: 帮助用户理解何时使用
4. **合理步数**: 防止无限循环

### 选择合适的 Agent

- **探索代码库**: 使用 `explore` Agent
- **制定计划**: 使用 `plan` Agent
- **执行构建**: 使用 `build` Agent
- **通用任务**: 使用 `general` Agent
- **自定义任务**: 创建专用 Agent

### Agent 组合

多个 Agent 可以协同工作：

```
主 Agent (build)
    ├─ 子 Agent (explore) - 查找测试文件
    ├─ 子 Agent (explore) - 查找配置文件
    └─ 继续执行构建任务
```
