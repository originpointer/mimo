/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
    /** 缓存键 */
    key: string;
    /** 缓存值 */
    value: T;
    /** 创建时间 */
    createdAt: number;
    /** 过期时间 (可选) */
    expiresAt?: number;
    /** 访问次数 */
    hits?: number;
    /** 元数据 */
    metadata?: Record<string, any>;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
    /** TTL (毫秒) */
    ttl?: number;
    /** 是否自动刷新 */
    autoRefresh?: boolean;
    /** 序列化函数 */
    serialize?: (value: any) => string;
    /** 反序列化函数 */
    deserialize?: (data: string) => any;
}

/**
 * 缓存统计
 */
export interface CacheStats {
    /** 总条目数 */
    totalEntries: number;
    /** 内存使用 (字节) */
    memoryUsage: number;
    /** 命中率 */
    hitRate: number;
    /** 总请求数 */
    totalRequests: number;
    /** 缓存命中数 */
    hits: number;
}

/**
 * Agent缓存条目
 * 参考来源: Stagehand AgentCache
 */
export interface CachedAgentExecution {
    version: 1;
    instruction: string;
    startUrl: string;
    options: AgentExecutionOptions;
    configSignature: string;
    steps: AgentReplayStep[];
    result: AgentResult;
    timestamp: number;
}

/**
 * Agent回放步骤
 */
export interface AgentReplayStep {
    action: AgentAction;
    selector?: string;
    result?: any;
}

/**
 * Agent执行选项
 */
export interface AgentExecutionOptions {
    instruction: string;
    startUrl?: string;
    model: string;
    tools: string[];
}

// 导入AgentResult和AgentAction
import type { AgentResult, AgentAction } from './agent';
