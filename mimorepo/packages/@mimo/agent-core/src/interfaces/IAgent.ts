/**
 * Agent接口
 * 参考来源: MetaGPT Role + Stagehand Agent
 *
 * 设计原则:
 * 1. 简单任务通过execute完成
 * 2. 复杂任务通过runWorkflow完成
 * 3. 支持状态查询
 * 4. 支持中断控制
 */
export interface IAgent {
    /** Agent唯一标识 */
    readonly id: string;

    /** Agent配置 */
    readonly config: import('../types').AgentConfig;

    /** 当前状态 */
    readonly status: import('../types').AgentStatus;

    /**
     * 执行单次任务
     * @param task 任务描述
     * @param context 上下文数据
     * @returns 执行结果
     */
    execute(task: string, context?: any): Promise<import('../types').AgentResult>;

    /**
     * 执行工作流
     * @param steps 工作流步骤
     * @returns 工作流结果
     */
    runWorkflow(steps: import('../types').WorkflowStep[]): Promise<import('../types').WorkflowResult>;

    /**
     * 中断执行
     */
    abort(): Promise<void>;

    /**
     * 重置Agent状态
     */
    reset(): void;

    /**
     * 获取执行历史
     * @returns 历史记录
     */
    getHistory(): import('../types').BaseMessage[];
}
