/**
 * LLM客户端接口
 * 参考来源: Browser-Use BaseChatModel + Stagehand LLMClient
 *
 * 设计原则:
 * 1. 支持结构化输出 (通过responseModel或tools)
 * 2. 支持流式响应 (通过stream方法)
 * 3. 统一的Token使用追踪
 * 4. 提供商能力查询
 */
export interface ILLMClient {
    /** 提供商标识 */
    readonly provider: import('../types').LLMProvider;

    /** 模型名称 */
    readonly model: string;

    /** 模型能力 */
    readonly capabilities: import('../types').ModelCapability;

    /**
     * 非流式完成
     * @param options 完成选项
     * @returns 完成响应
     */
    complete<T = any>(
        options: import('../types').ChatCompletionOptions
    ): Promise<import('../types').ChatCompletionResponse<T>>;

    /**
     * 流式完成
     * @param options 完成选项
     * @returns 异步迭代器
     */
    stream<T = any>(
        options: import('../types').ChatCompletionOptions
    ): AsyncIterable<import('../types').ChatCompletionResponse<T>>;

    /**
     * 检查模型是否支持某功能
     * @param capability 功能标识
     * @returns 是否支持
     */
    supports(capability: keyof import('../types').ModelCapability): boolean;
}
