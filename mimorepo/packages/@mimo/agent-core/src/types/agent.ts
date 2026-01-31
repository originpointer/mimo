/**
 * Agent状态
 */
export enum AgentStatus {
    IDLE = 'idle',
    THINKING = 'thinking',
    RUNNING = 'running',
    WAITING = 'waiting',
    STOPPED = 'stopped',
    ERROR = 'error',
}

/**
 * Agent配置
 */
export interface AgentConfig {
    /** Agent唯一标识 */
    id: string;
    /** Agent名称 */
    name: string;
    /** 使用的模型 */
    model: string;
    /** 系统提示 */
    systemPrompt?: string;
    /** 允许的工具列表 (空表示全部) */
    allowedTools?: string[];
    /** 最大历史记录数 */
    maxHistoryItems?: number;
    /** 是否启用缓存 */
    enableCache?: boolean;
    /** 温度 */
    temperature?: number;
    /** 最大token数 */
    maxTokens?: number;
    /** 超时时间 (毫秒) */
    timeout?: number;
}

/**
 * Agent执行结果
 */
export interface AgentResult {
    /** Agent ID */
    agentId: string;
    /** 是否成功 */
    success: boolean;
    /** 执行的动作列表 */
    actions: AgentAction[];
    /** 最终输出 */
    output?: string;
    /** 结构化数据 */
    data?: any;
    /** Token使用 */
    usage?: TokenUsage;
    /** 错误信息 */
    error?: string;
    /** 执行时间 (毫秒) */
    duration?: number;
}

/**
 * Agent动作
 */
export interface AgentAction {
    /** 动作类型 */
    type: string;
    /** 动作描述 */
    description: string;
    /** 动作参数 */
    params?: any;
    /** 执行结果 */
    result?: any;
    /** 时间戳 */
    timestamp: number;
    /** 截图URL (浏览器操作) */
    screenshotUrl?: string;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
    /** 步骤ID */
    id: string;
    /** 步骤标题 */
    title: string;
    /** 步骤描述 */
    description?: string;
    /** 分配的角色 */
    role: string;
    /** 任务内容 */
    task: string;
    /** 依赖的步骤ID列表 */
    dependencies?: string[];
    /** 上下文数据 */
    context?: any;
}

/**
 * 工作流结果
 */
export interface WorkflowResult {
    /** 是否成功 */
    success: boolean;
    /** 执行的步骤结果 */
    stepResults: Map<string, AgentResult>;
    /** 聚合输出 */
    output?: any;
    /** 总耗时 */
    duration?: number;
}

// 导入TokenUsage
import type { TokenUsage } from './llm';
