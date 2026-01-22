# OpenCode 源码分析文档

本目录包含对 OpenCode 项目源码的详细分析，说明其如何通过用户输入理解需求、制定计划并生成目标代码的完整流程。

## 文档目录

### [00-整体架构.md](./00-整体架构.md)
OpenCode 的整体架构设计，包括分层架构、核心目录结构、主要流程概览和关键设计模式。

### [01-Agent系统.md](./01-Agent系统.md)
Agent 系统的核心实现，包括内置 Agent 类型、Agent 配置、权限系统和自定义 Agent 方法。

### [02-用户输入处理流程.md](./02-用户输入处理流程.md)
从用户输入到 AI 响应的完整处理流程，包括 HTTP 请求入口、会话管理、消息构建和上下文组装。

### [03-计划制定流程.md](./03-计划制定流程.md)
计划模式（Plan Mode）的工作原理，包括五阶段工作流、工具限制、计划文件管理和从计划到执行的转换。

### [04-代码生成流程.md](./04-代码生成流程.md)
代码生成的详细流程，包括流式响应处理、工具执行、文件修改、快照系统和错误处理机制。

## 核心源码位置

```
packages/opencode/src/
├── agent/              # Agent 系统
│   ├── agent.ts        # Agent 核心类
│   └── prompt/         # Agent 提示词模板
├── session/            # 会话管理
│   ├── index.ts        # 会话 CRUD
│   ├── message-v2.ts   # 消息数据结构
│   ├── processor.ts    # 消息流处理器
│   ├── prompt.ts       # 提示词构建
│   ├── system.ts       # 系统提示词
│   └── llm.ts          # LLM 调用封装
├── server/             # HTTP 服务器
│   └── server.ts       # Hono 路由
├── tool/               # 工具系统
│   ├── registry.ts     # 工具注册表
│   ├── read.ts         # 读取工具
│   ├── edit.ts         # 编辑工具
│   └── bash.ts         # 命令执行工具
├── provider/           # LLM 提供商
├── permission/         # 权限系统
├── snapshot/           # 文件快照
└── project/            # 项目管理
```

## 快速导航

### 我想了解...

**OpenCode 的整体架构？**
→ 阅读 [00-整体架构.md](./00-整体架构.md)

**Agent 系统如何工作？**
→ 阅读 [01-Agent系统.md](./01-Agent系统.md)

**用户输入如何被处理？**
→ 阅读 [02-用户输入处理流程.md](./02-用户输入处理流程.md)

**计划模式是如何实现的？**
→ 阅读 [03-计划制定流程.md](./03-计划制定流程.md)

**代码是如何被生成的？**
→ 阅读 [04-代码生成流程.md](./04-代码生成流程.md)

## 关键概念

### Agent
专门化的 AI 代理，每个都有独立的配置、权限规则和系统提示词。内置 Agent 包括 `build`、`plan`、`general`、`explore` 等。

### Session
会话是用户与 AI 交互的容器，包含消息历史、配置和状态。每个会话有唯一 ID 和可配置的权限规则。

### Message
消息是会话中的基本单位，分为用户消息和助手消息。每条消息包含多个 Part（文本、工具调用、文件等）。

### Plan Mode
计划模式是一个只读分析阶段，允许 AI 在执行前探索代码库并制定详细计划。

### Tool
工具是 AI 可以调用的函数，包括文件操作（Read、Edit、Write）、搜索（Grep、Glob）、命令执行（Bash）等。

### Permission
权限系统控制每个 Agent 可以使用哪些工具，支持 allow/deny/ask 三种操作。

## 技术栈

- **运行时**: Bun + TypeScript ESM
- **Web 框架**: Hono
- **AI SDK**: Vercel AI SDK
- **数据验证**: Zod
- **搜索**: Ripgrep
- **版本控制**: Git

## 相关资源

- [OpenCode GitHub](https://github.com/openai/opencode)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [AGENTS.md 规范](../llm/AGENTS.md)
