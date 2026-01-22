# LLM 提供商配置 (LLM Provider Configuration)

## 概述 (Overview)

本文档介绍如何在 Nitro-app 中配置和使用不同的 LLM 提供商，包括 Qwen/DashScope（主要提供商）、OpenAI 兼容提供商以及 Ollama 本地模型。

## Qwen/DashScope 提供商 (Qwen/DashScope Provider)

### 简介

Qwen/DashScope 是阿里巴巴提供的大语言模型服务，通过 OpenAI 兼容 API 进行调用，是 Nitro-app 的主要 LLM 提供商。

### 环境变量配置

```bash
# 必需配置
export DASHSCOPE_API_KEY="sk-..."  # 阿里云 DashScope API Key

# 可选配置
export QWEN_MODEL="qwen-max"  # 模型名称（默认：qwen-max）
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"  # API 基础 URL
```

### 创建 Provider

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
});
```

### 可用模型

| 模型名称 | 描述 | 适用场景 |
|---------|------|---------|
| `qwen-max` | 最强推理能力 | 复杂任务、代码生成 |
| `qwen-plus` | 平衡性能 | 日常对话、文本处理 |
| `qwen-turbo` | 快速响应 | 简单任务、实时交互 |
| `qwen-long` | 长文本处理 | 长文档分析 |
| `qwen-vl-max` | 视觉理解 | 图像理解、多模态 |

### 使用示例

```typescript
import { streamText } from "ai";

// 创建 provider
const provider = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// 使用 qwen-max 模型
const result = streamText({
  model: provider.chat("qwen-max"),
  messages: [{ role: "user", content: "你好，请介绍一下你自己" }],
  system: "You are a helpful assistant.",
});

return result.toUIMessageStreamResponse();
```

## OpenAI 兼容提供商 (OpenAI Compatible Providers)

### 使用 OpenAI 官方 API

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const result = streamText({
  model: openaiProvider.chat("gpt-4o"),
  messages,
});
```

### 使用其他兼容提供商

任何提供 OpenAI 兼容 API 的服务都可以使用：

```typescript
// 自定义 baseURL
const customProvider = createOpenAI({
  apiKey: process.env.CUSTOM_API_KEY,
  baseURL: process.env.CUSTOM_BASE_URL,
});

const result = streamText({
  model: customProvider.chat("custom-model-name"),
  messages,
});
```

### 常见兼容提供商

| 提供商 | baseURL | 说明 |
|-------|---------|------|
| OpenAI | `https://api.openai.com/v1` | 官方 API |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | Azure 托管 |
| Together AI | `https://api.together.xyz/v1` | 多模型聚合 |
| Anyscale | `https://api.endpoints.anyscale.com/v1` | Ray 托管服务 |

## Ollama 本地模型 (Ollama Local Models)

### 简介

Ollama 是一个本地运行大语言模型的工具，Nitro-app 提供了自定义客户端来调用 Ollama 服务。

### 环境变量配置

```bash
# Ollama 配置
export LLM_BASE_URL="http://127.0.0.1:11434/v1"
export LLM_API_KEY="sk-local"  # 本地模型可以使用 dummy key
export LLM_MODEL="qwen3"  # Ollama 拉取的模型名称
export LLM_TIMEOUT_MS="180000"  # 超时时间（毫秒）
export LLM_RETRIES="1"  # 重试次数
```

### 使用 Ollama 客户端

```typescript
import { OllamaOpenAIClient, getOllamaConfigFromEnv } from "~/server/lib/ollamaOpenAIClient";

// 从环境变量加载配置
const config = getOllamaConfigFromEnv();
// {
//   baseUrl: "http://127.0.0.1:11434/v1",
//   apiKey: "sk-local",
//   model: "qwen3",
//   timeoutMs: 180000,
//   retries: 1
// }

// 创建客户端
const client = new OllamaOpenAIClient(config);

// 调用聊天
const response = await client.chat(
  [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" }
  ],
  { temperature: 0.7 }
);

console.log(response);  // "Hello! How can I help you today?"
```

### Ollama 客户端实现

```typescript
// server/lib/ollamaOpenAIClient.ts
export class OllamaOpenAIClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly model: string
  private readonly timeoutMs: number
  private readonly retries: number

  constructor(opts: OllamaOpenAIClientOptions) {
    this.baseUrl = opts.baseUrl
    this.apiKey = opts.apiKey
    this.model = opts.model
    this.timeoutMs = opts.timeoutMs ?? 180_000
    this.retries = opts.retries ?? 1
  }

  public async chat(
    messages: OpenAIChatMessage[],
    params?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`
    const payload: OpenAIChatCompletionsRequest = {
      model: this.model,
      messages,
      temperature: params?.temperature,
      max_tokens: params?.maxTokens
    }

    let lastErr: unknown = null
    for (let i = 0; i <= this.retries; i++) {
      try {
        const resp = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${this.apiKey || "sk-local"}`
            },
            body: JSON.stringify(payload)
          },
          this.timeoutMs
        )

        const json = await resp.json() as OpenAIChatCompletionsResponse
        if (!resp.ok) {
          throw new Error(json?.error?.message || `HTTP ${resp.status}`)
        }

        const content = json?.choices?.[0]?.message?.content
        if (!content) throw new Error("Empty LLM response")
        return content
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }
}

export function getOllamaConfigFromEnv(): OllamaOpenAIClientOptions {
  const baseUrl = process.env.LLM_BASE_URL || "http://127.0.0.1:11434/v1"
  const apiKey = process.env.LLM_API_KEY || "sk-local"
  const model = process.env.LLM_MODEL || "qwen3"
  const timeoutMs = process.env.LLM_TIMEOUT_MS ? Number(process.env.LLM_TIMEOUT_MS) : 180_000
  const retries = process.env.LLM_RETRIES ? Number(process.env.LLM_RETRIES) : 1
  return { baseUrl, apiKey, model, timeoutMs, retries }
}
```

## 提供商工厂模式 (Provider Factory Pattern)

### 参考 Stagehand 的工厂模式

```typescript
// Stagehand 的提供商工厂
class LLMProvider {
  getClient(modelName: AvailableModel, options?: ClientOptions): LLMClient {
    const provider = this.getModelProvider(modelName);

    switch (provider) {
      case "openai":
        return new OpenAIClient(options);
      case "anthropic":
        return new AnthropicClient(options);
      case "google":
        return new GoogleClient(options);
      case "aisdk":
        return new AISdkClient(options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

### Nitro-app 简化实现

```typescript
// 简化的提供商创建函数
import { createOpenAI } from "@ai-sdk/openai";

type ProviderType = "qwen" | "openai" | "ollama";

function createLLMProvider(type: ProviderType) {
  switch (type) {
    case "qwen":
      return createOpenAI({
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      });

    case "openai":
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

    case "ollama":
      // Ollama 使用自定义客户端
      const config = getOllamaConfigFromEnv();
      return new OllamaOpenAIClient(config);

    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

// 使用
const provider = createLLMProvider("qwen");
const result = streamText({
  model: provider.chat("qwen-max"),
  messages,
});
```

## 环境变量配置总结

### 完整环境变量列表

| 变量 | 用途 | 默认值 | 提供商 |
|------|------|--------|--------|
| `DASHSCOPE_API_KEY` | 阿里云 API Key | - | Qwen |
| `QWEN_MODEL` | Qwen 模型名称 | `qwen-max` | Qwen |
| `QWEN_BASE_URL` | Qwen API URL | DashScope URL | Qwen |
| `OPENAI_API_KEY` | OpenAI API Key | - | OpenAI |
| `OPENAI_BASE_URL` | OpenAI API URL | `https://api.openai.com/v1` | OpenAI |
| `LLM_BASE_URL` | 本地 LLM URL | `http://127.0.0.1:11434/v1` | Ollama |
| `LLM_API_KEY` | 本地 LLM Key | `sk-local` | Ollama |
| `LLM_MODEL` | 本地模型名称 | `qwen3` | Ollama |
| `LLM_TIMEOUT_MS` | 请求超时时间 | `180000` | Ollama |
| `LLM_RETRIES` | 重试次数 | `1` | Ollama |

### .env 文件示例

```bash
# Qwen/DashScope (主要提供商)
DASHSCOPE_API_KEY=sk-...
QWEN_MODEL=qwen-max
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# OpenAI (可选)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# Ollama (可选)
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=sk-local
LLM_MODEL=qwen3
LLM_TIMEOUT_MS=180000
LLM_RETRIES=1
```

## 提供商选择策略 (Provider Selection Strategy)

### 根据任务选择提供商

| 任务类型 | 推荐提供商 | 推荐模型 | 原因 |
|---------|-----------|---------|------|
| 复杂推理 | Qwen | `qwen-max` | 最强推理能力 |
| 代码生成 | Qwen | `qwen-max` | 代码理解能力强 |
| 实时聊天 | Qwen | `qwen-turbo` | 快速响应 |
| 长文档分析 | Qwen | `qwen-long` | 支持长上下文 |
| 隐私数据 | Ollama | `qwen3` | 本地处理 |
| 多模态 | Qwen | `qwen-vl-max` | 图像理解 |

### 成本优化

```typescript
// 根据任务复杂度动态选择模型
function selectModel(taskComplexity: "low" | "medium" | "high"): string {
  switch (taskComplexity) {
    case "low":
      return "qwen-turbo";  // 最便宜
    case "medium":
      return "qwen-plus";
    case "high":
      return "qwen-max";  // 最强
  }
}

const model = selectModel("high");
const result = streamText({
  model: provider.chat(model),
  messages,
});
```

## 相关文件 (Related Files)

### Nitro-App 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts) - Qwen provider 使用
- [server/lib/ollamaOpenAIClient.ts](../../server/lib/ollamaOpenAIClient.ts) - Ollama 客户端实现

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMProvider.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/LLMProvider.ts)
- [.refer/.sources/stagehand/packages/core/lib/v3/llm/OpenAIClient.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/llm/OpenAIClient.ts)
