import { LLMProvider, ModelCapability, ModelPricing } from '../types';

/**
 * 模型配置映射
 */
export const MODEL_CONFIGS: Record<string, {
    provider: LLMProvider;
    capabilities: ModelCapability;
    pricing: ModelPricing;
}> = {
    // Anthropic Claude
    'claude-sonnet-4-5': {
        provider: LLMProvider.ANTHROPIC,
        capabilities: {
            supportsCaching: true,
            requiresLargePrompt: true,
            supportsThinking: true,
            maxContext: 200000,
            supportsStructuredOutput: true,
            supportsStreaming: true,
        },
        pricing: {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.000003,
            outputCostPerToken: 0.000015,
            cacheReadCostPerToken: 0.0000003,
            cacheWriteCostPerToken: 0.00000375,
        },
    },
    'claude-haiku-4-5': {
        provider: LLMProvider.ANTHROPIC,
        capabilities: {
            supportsCaching: true,
            requiresLargePrompt: true,
            supportsThinking: false,
            maxContext: 200000,
            supportsStructuredOutput: true,
            supportsStreaming: true,
        },
        pricing: {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.0000008,
            outputCostPerToken: 0.000004,
            cacheReadCostPerToken: 0.00000008,
            cacheWriteCostPerToken: 0.000001,
        },
    },

    // OpenAI GPT
    'gpt-4o': {
        provider: LLMProvider.OPENAI,
        capabilities: {
            supportsCaching: false,
            supportsThinking: false,
            maxContext: 128000,
            supportsStructuredOutput: true,
            supportsStreaming: true,
        },
        pricing: {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.000005,
            outputCostPerToken: 0.000015,
        },
    },
    'gpt-4o-mini': {
        provider: LLMProvider.OPENAI,
        capabilities: {
            supportsCaching: false,
            supportsThinking: false,
            maxContext: 128000,
            supportsStructuredOutput: true,
            supportsStreaming: true,
        },
        pricing: {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.00000015,
            outputCostPerToken: 0.0000006,
        },
    },

    // OpenAI o1系列
    'o1-mini': {
        provider: LLMProvider.OPENAI,
        capabilities: {
            supportsCaching: false,
            supportsThinking: true,
            maxContext: 128000,
            supportsStructuredOutput: true,
            supportsStreaming: false,
        },
        pricing: {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.0000015,
            outputCostPerToken: 0.000006,
            reasoningCostPerToken: 0.000003,
        },
    },
} as const;

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
    // 消息历史
    MAX_HISTORY_ITEMS: 50,
    MAX_CONTENT_SIZE: 60000,

    // 缓存
    DEFAULT_CACHE_TTL: 3600000, // 1小时
    MAX_CACHE_SIZE: 100,

    // 工具
    DEFAULT_TOOL_TIMEOUT: 30000, // 30秒
    MAX_TOOL_EXECUTIONS: 10,

    // Agent
    DEFAULT_AGENT_TIMEOUT: 300000, // 5分钟
    MAX_WORKFLOW_STEPS: 20,

    // Socket
    PING_INTERVAL: 25000,
    PING_TIMEOUT: 20000,
    MAX_PAYLOAD: 2097152, // 2MB
} as const;
