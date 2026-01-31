import { z } from 'zod';

/**
 * Token使用统计
 * 参考来源: Browser-Use token tracking
 */
export interface TokenUsage {
    /** 输入token数 */
    promptTokens: number;
    /** 完成token数 */
    completionTokens: number;
    /** 总token数 */
    totalTokens: number;
    /** Anthropic缓存读取token (可选) */
    cachedReadTokens?: number;
    /** Anthropic缓存创建token (可选) */
    cachedCreationTokens?: number;
    /** 推理token数 (o1/o3系列) */
    reasoningTokens?: number;
}

/**
 * LLM提供商枚举
 */
export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
    GOOGLE = 'google',
    XAI = 'xAI',
    COHERE = 'cohere',
}

/**
 * 模型能力标识
 */
export interface ModelCapability {
    /** 是否支持缓存 (Anthropic 4.5+) */
    supportsCaching: boolean;
    /** 是否需要大prompt触发缓存 (>=4096 tokens) */
    requiresLargePrompt?: boolean;
    /** 是否支持推理模式 (o1/o3) */
    supportsThinking: boolean;
    /** 最大上下文长度 */
    maxContext: number;
    /** 是否支持结构化输出 */
    supportsStructuredOutput: boolean;
    /** 是否支持流式响应 */
    supportsStreaming: boolean;
}

/**
 * 模型定价信息
 */
export interface ModelPricing {
    provider: LLMProvider;
    inputCostPerToken: number;
    outputCostPerToken: number;
    cacheReadCostPerToken?: number;
    cacheWriteCostPerToken?: number;
    reasoningCostPerToken?: number;
}

/**
 * 聊天完成选项
 */
export interface ChatCompletionOptions<T = any> {
    /** 模型名称 */
    model: string;
    /** 消息列表 */
    messages: import('./message').BaseMessage[];
    /** 温度 (0-1) */
    temperature?: number;
    /** 最大输出token数 */
    maxTokens?: number;
    /** 停止序列 */
    stopSequences?: string[];
    /** 工具定义 */
    tools?: import('./tool').ToolSet;
    /** 工具选择策略 */
    toolChoice?: 'auto' | 'required' | 'none';
    /** 结构化输出Schema */
    responseModel?: z.ZodType<T>;
    /** 是否流式响应 */
    stream?: boolean;
    /** 提供商特定选项 */
    providerOptions?: Record<string, any>;
}

/**
 * 聊天完成响应
 */
export interface ChatCompletionResponse<T = any> {
    /** 生成的内容 */
    content: string;
    /** Token使用统计 */
    usage: TokenUsage;
    /** 工具调用列表 */
    toolCalls?: import('./tool').ToolCall[];
    /** 结构化输出数据 */
    structuredData?: T;
    /** 推理内容 (o1/o3系列) */
    reasoning?: string;
    /** 模型ID */
    model: string;
    /** 完成原因 */
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}
