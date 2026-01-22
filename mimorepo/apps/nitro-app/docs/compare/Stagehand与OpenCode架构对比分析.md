# Stagehand 与 OpenCode 架构对比分析

## 概述

本文档通过分析 Stagehand（浏览器自动化工具）和 OpenCode（AI 编码助手）的架构设计，梳理两者在架构设计上的相同之处和不同之处。

### 项目定位

| 项目 | 定位 | 主要应用场景 |
|------|------|-------------|
| **Stagehand** | 浏览器自动化工具 | 网页交互、数据提取、自动化测试、爬虫 |
| **OpenCode** | AI 编码助手 | 代码理解、代码生成、重构、调试 |

---

## 一、相同之处

### 1.1 共同的技术基础

#### AI SDK 使用
两者都基于 **Vercel AI SDK** 进行 LLM 集成：

```typescript
// Stagehand
import { generateText, generateObject } from "ai";

// OpenCode
import { generateText } from "ai";
```

#### 结构化输出
两者都使用 **Zod** 进行 Schema 验证和结构化输出：

```typescript
// Stagehand
const schema = z.object({
  xpath: z.string(),
  action: z.enum(["click", "type", "hover"])
});

// OpenCode
const schema = z.object({
  files: z.array(z.string()),
  changes: z.record(z.string())
});
```

#### 提供商抽象
两者都支持多种 LLM 提供商：

| 提供商类型 | Stagehand | OpenCode |
|-----------|-----------|----------|
| OpenAI | 支持 | 支持 |
| Anthropic | 支持 | 支持 |
| Google | 支持 | 支持 |
| 自定义 baseURL | 支持 | 支持 |

### 1.2 相似的架构模式

#### 流式响应处理
两者都采用流式响应来改善用户体验：

```typescript
// Stagehand - Nitro-app 实现
const result = streamText({
  model: provider.chat("qwen-max"),
  messages,
});
return result.toUIMessageStreamResponse();

// OpenCode - SessionProcessor
export async function* stream(input: StreamInput) {
  const stream = await generateText({
    model: language,
    messages,
    tools: toolDefs,
  });
  yield* stream.fullStream;
}
```

#### 工具调用系统
两者都实现了工具调用机制：

| 特性 | Stagehand | OpenCode |
|------|-----------|----------|
| 工具定义 | LLMTool 接口 | Tool.Definition |
| 工具注册 | 动态注册 | ToolRegistry |
| 参数验证 | Zod Schema | Zod Schema |
| 执行结果 | 返回给 LLM | 返回给 LLM |

```typescript
// Stagehand 工具调用
const result = await generateText({
  model,
  messages,
  tools: {
    getWeather: {
      description: "Get weather",
      parameters: z.object({ location: z.string() }),
      execute: async (args) => { /* ... */ }
    }
  }
});

// OpenCode 工具调用
const result = await Tool.execute({
  name: "read",
  input: { path: "file.txt" },
  sessionID,
  messageID,
  agent
});
```

#### 提示词工程
两者都采用分层提示词构建模式：

```typescript
// Stagehand 系统提示词结构
const systemPrompt = `
You are Stagehand, an AI web browser automation agent.

Capabilities:
- Analyze HTML DOM structures
- Generate robust XPath selectors
- Identify interactive elements
`;

// OpenCode 系统提示词结构
const parts = [
  ...header(providerID),           // 提供商标识
  ...provider(model),               // 提供商特定指令
  instructions(),                   // 核心行为准则
  ...await environment(),          // 环境信息
  ...await custom(),               // 自定义配置
];
```

### 1.3 相同的设计理念

#### 1. 安全优先
- **Stagehand**: 通过 DOM 快照和 XPath 验证确保操作安全
- **OpenCode**: 通过权限系统（PermissionNext）控制工具访问

#### 2. 可扩展性
- 两者都支持插件/工具扩展
- 支持自定义提示词和配置

#### 3. 上下文管理
- 都实现了消息历史管理
- 都支持上下文压缩机制

---

## 二、不同之处

### 2.1 核心架构差异

#### Stagehand: 单体应用架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Stagehand V3                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │   User Code  │───▶│ new Stagehand({ model })         │  │
│  └──────────────┘    └──────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    LLMProvider                         │ │
│  │              (Factory Pattern)                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│  │  │ OpenAI   │  │Anthropic │  │AISdkClient│           │ │
│  │  └──────────┘  └──────────┘  └──────────┘           │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                               │
│                             ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Handlers                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│  │  │ActHandler│  │Extract   │  │Observe   │           │ │
│  │  │          │  │Handler   │  │Handler   │           │ │
│  │  └──────────┘  └──────────┘  └──────────┘           │ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                               │
│                             ▼                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                Inference Functions                      │ │
│  │          (act / extract / observe)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- 自包含的浏览器控制
- 内置 Playwright 集成
- 高级操作抽象（act/extract/observe）

#### OpenCode: 客户端-服务器架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                              │
│  (CLI、TUI、VSCode Extension、Web UI)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务器层                              │
│  (Hono Server - HTTP/WebSocket/API)                         │
│  - /session/* : 会话管理                                     │
│  - /message/* : 消息处理                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       核心处理层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Session    │  │    Agent     │  │   Message    │    │
│  │  会话管理     │  │  Agent 系统  │  │  消息处理     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Prompt     │  │  Processor   │  │   LLM Stream │    │
│  │  提示词工程   │  │  流处理器     │  │  LLM 流式调用│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      工具执行层                              │
│  (Tool Registry - Bash, Read, Grep, Glob, Edit, etc.)      │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- 前后端分离
- 多客户端支持
- 会话持久化

### 2.2 操作抽象对比

#### Stagehand: 领域特定操作

```typescript
// Stagehand 高级操作
await stagehand.act("click the submit button");
await stagehand.extract({
  instruction: "Extract product information",
  schema: ProductSchema
});
await stagehand.observe({
  instruction: "What actions can be performed?"
});
```

**映射到 AI SDK**：
| Stagehand 操作 | AI SDK 等价操作 |
|---------------|----------------|
| `act()` | `generateText()` + tools |
| `extract()` | `generateObject()` + schema |
| `observe()` | `generateText()` + tools |

#### OpenCode: 通用工具系统

```typescript
// OpenCode 工具调用
await Tool.execute({
  name: "edit",
  input: { path: "file.ts", oldText: "...", newText: "..." }
});

await Tool.execute({
  name: "bash",
  input: { command: "npm test" }
});
```

**内置工具**：
- `read` - 读取文件
- `edit` - 编辑文件（精确文本替换）
- `write` - 写入文件
- `bash` - 执行命令
- `grep` - 搜索文件内容
- `glob` - 查找文件
- `ask` - 向用户提问
- `task` - 启动子 Agent

### 2.3 Agent 系统差异

#### Stagehand: 无内置 Agent 系统

Stagehand 专注于浏览器自动化，不包含多 Agent 系统。功能通过 Handler 模式实现：

```typescript
// Stagehand Handler 模式
class ActHandler {
  constructor(
    private llmClient: LLMClient,
    private resolveLlmClient: (model?) => LLMClient,
  ) {}

  async act({ instruction, page, model }) {
    const llmClient = this.resolveLlmClient(model);
    const response = await actInference({
      instruction,
      domElements,
      llmClient,
    });
    return response;
  }
}
```

#### OpenCode: 完整的 Agent 系统

OpenCode 实现了专门化的多 Agent 系统：

**内置 Agent**：

| Agent | 用途 | 权限特点 |
|-------|------|---------|
| `build` | 构建和测试 | 全权限 + question + plan_enter |
| `plan` | 制定计划 | 只读（除计划文件外） |
| `general` | 通用任务 | 研究和多步骤任务 |
| `explore` | 代码探索 | 仅只读工具 |
| `compaction` | 会话压缩 | 禁用所有工具 |
| `title` | 生成标题 | 禁用所有工具 |
| `summary` | 生成摘要 | 禁用所有工具 |

```typescript
// OpenCode Agent 定义
export namespace Agent {
  export const Info = z.object({
    name: z.string(),
    description: z.string().optional(),
    mode: z.enum(["subagent", "primary", "all"]),
    native: z.boolean().optional(),
    hidden: z.boolean().optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    color: z.string().optional(),
    permission: PermissionNext.Ruleset,
    model: z.object({
      modelID: z.string(),
      providerID: z.string(),
    }).optional(),
    prompt: z.string().optional(),
    steps: z.number().int().positive().optional(),
  })
}
```

### 2.4 权限系统差异

#### Stagehand: 简单权限控制

Stagehand 的权限控制相对简单，主要通过配置限制可访问的页面和操作：

```typescript
// Stagehand 配置
const stagehand = new Stagehand({
  model: "openai/gpt-4.1-mini",
  debugDom: true,
  // 没有细粒度的权限系统
});
```

#### OpenCode: 复杂权限系统

OpenCode 实现了基于规则的权限控制系统：

```typescript
// OpenCode 权限规则
export namespace PermissionNext {
  export type Action = "allow" | "deny" | "ask";

  export interface Ruleset {
    "*": Action;                              // 默认规则
    [tool: string]: Action | Ruleset | Action[];
  }

  // 示例：plan Agent 权限
  plan: {
    permission: {
      question: "allow",         // 允许提问
      plan_exit: "allow",        // 允许退出计划模式
      edit: {
        "*": "deny",             // 禁止编辑任何文件
        ".opencode/plans/*.md": "allow",  // 只能编辑计划文件
      },
    }
  }
}
```

**权限检查流程**：
1. 检查 Agent 特定规则
2. 检查用户自定义规则
3. 检查全局默认规则
4. 合并规则并执行

### 2.5 浏览器集成差异

#### Stagehand: 深度浏览器集成

```typescript
// Stagehand 内置 Playwright
const stagehand = new Stagehand({
  model: "openai/gpt-4.1-mini",
});

// 完全控制浏览器
await stagehand.page.goto("https://example.com");
await stagehand.act("click the login button");
await stagehand.extract({ schema: LoginFormSchema });

// 可访问完整 DOM 和执行任意操作
```

**特点**：
- 内置 Playwright 浏览器控制
- 直接访问页面 DOM
- 支持 CDP（Chrome DevTools Protocol）

#### OpenCode: 无内置浏览器集成

OpenCode 专注于代码操作，不包含浏览器控制功能。如需网页交互，可通过工具实现：

```typescript
// OpenCode 通过工具实现简单网络请求
await Tool.execute({
  name: "webfetch",
  input: { url: "https://example.com" }
});

// 或使用 websearch 工具
await Tool.execute({
  name: "websearch",
  input: { query: "TypeScript best practices" }
});
```

### 2.6 消息处理差异

#### Stagehand: 简单请求-响应

```typescript
// Stagehand 简化的调用模式
const result = await stagehand.act({
  instruction: "Click the submit button"
});
// 直接返回结果
```

#### OpenCode: 完整消息系统

```typescript
// OpenCode 消息数据结构
export namespace MessageV2 {
  export const User = Base.extend({
    role: z.literal("user"),
    agent: z.string(),
    model: z.object({
      providerID: z.string(),
      modelID: z.string(),
    }),
    system: z.string().optional(),
    tools: z.record(z.string(), z.boolean()).optional(),
  });

  export const Assistant = Base.extend({
    role: z.literal("assistant"),
    modelID: z.string(),
    providerID: z.string(),
    path: z.object({
      cwd: z.string(),
      root: z.string(),
    }),
    cost: z.number(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
      reasoning: z.number(),
      cache: z.object({
        read: z.number(),
        write: z.number(),
      }),
    }),
    finish: z.string().optional(),
  });
}
```

**消息 Parts**：
- `TextPart` - 文本内容
- `FilePart` - 文件附件
- `AgentPart` - 切换 Agent
- `SubtaskPart` - 子任务
- `ToolPart` - 工具调用
- `ReasoningPart` - 推理过程

### 2.7 计划模式差异

#### Stagehand: observe() 方法

```typescript
// Stagehand 观察
const observations = await stagehand.observe({
  instruction: "What actions can be performed on this page?"
});
// 返回可执行的操作列表
```

#### OpenCode: 专门的计划模式

OpenCode 实现了完整的五阶段计划流程：

```
┌─────────────────────────────────────────┐
│ 第一阶段：初始理解                      │
│ - 启动 Explore Agent                    │
│ - 使用 AskUserQuestion 澄清需求          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 第二阶段：规划                          │
│ - 启动 Plan Agent                       │
│ - 制定实施计划                          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 第三阶段：综合                          │
│ - 收集所有 Agent 响应                   │
│ - 识别关键文件                          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 第四阶段：最终计划                      │
│ - 更新计划文件                          │
│ - 包含推荐方法和关键文件                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 第五阶段：退出计划模式                  │
│ - 调用 ExitPlanMode                     │
│ - 等待用户批准执行                      │
└─────────────────────────────────────────┘
```

**计划文件路径**：
```
/project/.opencode/plans/1704067200000-oauth2-integration.md
```

### 2.8 数据持久化差异

#### Stagehand: 会话状态

```typescript
// Stagehand 轻量级状态
const stagehand = new Stagehand({
  model: "openai/gpt-4.1-mini",
});
// 状态主要在内存中
```

#### OpenCode: 完整存储系统

```typescript
// OpenCode 会话数据结构
export const Info = z.object({
  id: Identifier.schema("session"),
  slug: z.string(),
  projectID: z.string(),
  directory: z.string(),
  parentID: Identifier.schema("session").optional(),
  summary: z.object({
    additions: z.number(),
    deletions: z.number(),
    files: z.number(),
    diffs: Snapshot.FileDiff.array().optional(),
  }).optional(),
  title: z.string(),
  version: z.string(),
  time: z.object({
    created: z.number(),
    updated: z.number(),
    compacting: z.number().optional(),
    archived: z.number().optional(),
  }),
  permission: PermissionNext.Ruleset.optional(),
  revert: z.object({
    messageID: z.string(),
    partID: z.string().optional(),
    snapshot: z.string().optional(),
    diff: z.string().optional(),
  }).optional(),
});
```

### 2.9 技术栈对比

| 组件 | Stagehand | OpenCode |
|------|-----------|----------|
| **运行时** | Node.js | Bun |
| **Web 框架** | 无（单体应用） | Hono |
| **浏览器控制** | Playwright（内置） | 无 |
| **AI SDK** | Vercel AI SDK | Vercel AI SDK |
| **数据验证** | Zod | Zod |
| **搜索** | DOM 操作 | Ripgrep |
| **版本控制** | 可选 Git | Git 集成 |
| **存储** | 内存/文件 | 文件系统 + KV |

### 2.10 快照系统差异

#### Stagehand: DOM 快照

```typescript
// Stagehand DOM 快照
const domSnapshot = await page.evaluate(() => {
  return document.documentElement.outerHTML;
});
// 用于 LLM 分析页面结构
```

#### OpenCode: 文件系统快照

```typescript
// OpenCode 快照系统
export async function track(): Promise<string> {
  const hash = await git.revparse("HEAD");
  const status = await git.status();
  const state = {
    hash,
    files: await scanFiles(Instance.directory),
  };
  return JSON.stringify(state);
}

export async function patch(snapshot: string): Promise<{
  hash: string;
  files: string[];
}> {
  const before = JSON.parse(snapshot);
  const after = await git.revparse("HEAD");
  const diff = await git.diff([`${before.hash}..${after}`]);
  return { hash: after, files: diff.split("\n") };
}
```

---

## 三、架构设计哲学对比

### Stagehand 设计哲学

1. **专注性**：专注于浏览器自动化领域
2. **简洁性**：提供简洁的高级 API（act/extract/observe）
3. **直接性**：直接控制浏览器，减少抽象层
4. **单体性**：自包含的应用，易于部署

**适用场景**：
- 网页自动化测试
- 数据抓取和提取
- 表单自动填写
- 网页交互操作

### OpenCode 设计哲学

1. **模块化**：清晰的分层架构
2. **可扩展性**：支持多客户端、多 Agent、多工具
3. **安全性**：完善的权限系统
4. **持久性**：完整的会话和存储系统

**适用场景**：
- 代码理解和重构
- 多步骤开发任务
- 团队协作开发
- 复杂项目规划

---

## 四、总结

### 核心差异汇总

| 维度 | Stagehand | OpenCode |
|------|-----------|----------|
| **定位** | 浏览器自动化工具 | AI 编码助手 |
| **架构** | 单体应用 | 客户端-服务器 |
| **核心抽象** | act/extract/observe | Agent + Tool |
| **浏览器控制** | 内置 Playwright | 无 |
| **权限系统** | 简单配置 | 复杂规则系统 |
| **Agent 系统** | 无 | 完整的多 Agent 系统 |
| **计划模式** | observe() | 五阶段计划流程 |
| **存储** | 内存为主 | 完整持久化 |
| **运行时** | Node.js | Bun |

### 选择建议

**选择 Stagehand 当需要**：
- 直接控制浏览器进行自动化操作
- 从网页提取结构化数据
- 简单的自动化测试场景

**选择 OpenCode 当需要**：
- 复杂的代码理解和重构任务
- 多步骤的开发流程
- 团队协作和代码审查
- 需要持久化的会话管理

### 可借鉴的设计

**Stagehand 可借鉴 OpenCode**：
1. 多 Agent 系统用于不同类型的浏览器任务
2. 更完善的权限控制
3. 计划模式用于复杂自动化流程

**OpenCode 可借鉴 Stagehand**：
1. 简洁的高级 API 设计
2. 领域特定的操作抽象
3. 直接的工具控制能力

---

## 相关文档

- [Stagehand LLM 文档](../llm/00-README.md)
- [OpenCode 架构文档](../opencode/00-整体架构.md)
- [Stagehand 与 Nitro-app 架构对比](../llm/01-architecture.md)
