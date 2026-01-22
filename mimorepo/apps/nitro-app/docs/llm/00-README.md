# LLM 文档索引 (LLM Documentation Index)

## 概述 (Overview)

Nitro-app 使用 `@ai-sdk/openai` (v3.0.14) 和 AI SDK (v6.0.33) 进行 LLM 操作，主要集成阿里巴巴的 **Qwen/DashScope** 作为 LLM 提供商，通过 OpenAI 兼容 API 调用。

本文档参考 Stagehand 项目的 LLM 架构设计，结合 Nitro-app 的实际实现，提供完整的 LLM 接口定义、依赖模块、主要方法和调用流程说明。

## 核心依赖 (Core Dependencies)

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| `@ai-sdk/openai` | ^3.0.14 | OpenAI 兼容提供商封装 |
| `ai` | ^6.0.33 | Vercel AI SDK 核心库 |
| `@modelcontextprotocol/sdk` | ^1.25.2 | MCP 工具协议 |
| `zod` | ^3.25.76 | Schema 验证 |

## 快速开始 (Quick Start)

### 1. 环境配置

```bash
# 设置环境变量
export DASHSCOPE_API_KEY="sk-..."
export QWEN_MODEL="qwen-max"
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

### 2. 创建 Provider

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
});
```

### 3. 调用 LLM

```typescript
import { streamText } from "ai";

const result = streamText({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: "你好！" }],
  system: "You are a helpful assistant.",
});

return result.toUIMessageStreamResponse();
```

## 架构概览 (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Next-App)                     │
│                    @ai-sdk/react + ChatInterface                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Nitro-App Backend                          │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │ API Handler  │───▶│ createOpenAI() → Qwen Provider       │  │
│  │ chat.post.ts │    │ @ai-sdk/openai wrapper               │  │
│  └──────────────┘    └──────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            AI SDK Operations (streamText/generateObject)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  MCP Tool Registry                        │  │
│  │  (readText, listTree, globFiles, grepFiles)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DashScope API (Qwen)                         │
│               https://dashscope.aliyuncs.com                    │
└─────────────────────────────────────────────────────────────────┘
```

## 与 Stagehand 架构对比 (Stagehand Comparison)

| Stagehand | Nitro-app | 说明 |
|-----------|-----------|------|
| `LLMProvider` (工厂类) | `createOpenAI()` | Provider 创建模式 |
| `LLMClient` (抽象基类) | 直接使用 AI SDK | 简化的客户端抽象 |
| `AISdkClient` | `streamText/generateObject` | AI SDK 操作封装 |
| `act()` | `generateText()` + tools | 动作执行 |
| `extract()` | `generateObject()` + schema | 数据提取 |
| `observe()` | `generateText()` + tools | 观察与规划 |

## 文档索引 (Documentation Index)

| 文档 | 描述 |
|------|------|
| [01-architecture.md](01-architecture.md) | 系统架构设计、Stagehand 对比、组件调用流程 |
| [02-interfaces.md](02-interfaces.md) | 核心接口定义、类型映射、MCP 工具类型 |
| [03-providers.md](03-providers.md) | LLM 提供商配置、Qwen/DashScope、Ollama 本地模型 |
| [04-operations.md](04-operations.md) | 核心操作：generateText、generateObject、streamText |
| [05-prompts.md](05-prompts.md) | 提示词工程模式、模板系统、Token 管理 |
| [06-mcp-integration.md](06-mcp-integration.md) | MCP 工具集成、工具注册与调用 |
| [07-api-endpoints.md](07-api-endpoints.md) | HTTP API 参考、请求/响应格式 |
| [08-browser-integration.md](08-browser-integration.md) | Playwright 类控制模式、XPath 操作 |
| [09-examples.md](09-examples.md) | 完整使用示例、最佳实践 |

## 核心文件 (Core Files)

### Nitro-App 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts) - 主流式聊天实现
- [server/lib/ollamaOpenAIClient.ts](../../server/lib/ollamaOpenAIClient.ts) - Ollama 本地客户端
- [server/lib/mcp/registry.ts](../../server/lib/mcp/registry.ts) - MCP 工具注册表
- [server/lib/prompts/](../../server/lib/prompts/) - 提示词模板

### 前端集成
- [apps/next-app/app/chat/[id]/ChatRuntime.tsx](../../../next-app/app/chat/[id]/ChatRuntime.tsx) - 聊天运行时
- [apps/next-app/components/chat-interface.tsx](../../../next-app/components/chat-interface.tsx) - 聊天界面

### 浏览器自动化
- [apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts](../../../plasmo-app/src/background/libs/StagehandXPathScanner.ts) - XPath 扫描器

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/) - Stagehand LLM 源码

## 环境变量 (Environment Variables)

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `DASHSCOPE_API_KEY` | - | 阿里云 DashScope API Key |
| `QWEN_MODEL` | `qwen-max` | Qwen 模型名称 |
| `QWEN_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | API 基础 URL |
| `LLM_BASE_URL` | `http://127.0.0.1:11434/v1` | Ollama 本地 URL |
| `LLM_MODEL` | `qwen3` | Ollama 模型名称 |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS 允许源 |

## 常用操作 (Common Operations)

### 流式聊天 (Streaming Chat)
```typescript
import { streamText } from "ai";

const result = streamText({
  model: provider.chat("qwen-max"),
  messages,
  system: "You are a helpful assistant.",
});
return result.toUIMessageStreamResponse();
```

### 结构化提取 (Structured Extraction)
```typescript
import { generateObject } from "ai";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const result = await generateObject({
  model: provider.chat("qwen-max"),
  messages,
  schema,
});
```

### 工具调用 (Tool Calling)
```typescript
// 调用 MCP 工具
const { result } = await fetch("/api/mcp/call", {
  method: "POST",
  body: JSON.stringify({
    name: "readText",
    args: { path: "file.html", limit: 100 }
  })
});
```

## 相关资源 (Related Resources)

- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [DashScope API 文档](https://help.aliyun.com/zh/dashscope/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Zod Schema 验证](https://zod.dev/)
