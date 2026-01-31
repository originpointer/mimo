import { z } from 'zod';

/**
 * 工具标签枚举
 * 参考来源: OpenClaw TOOL_GROUPS
 */
export enum ToolTag {
    // 文件操作
    FILE_READ = 'file:read',
    FILE_WRITE = 'file:write',
    FILE_EDIT = 'file:edit',
    FILE_DELETE = 'file:delete',

    // Web操作
    WEB_SEARCH = 'web:search',
    WEB_FETCH = 'web:fetch',
    WEB_SCRAPE = 'web:scrape',

    // 浏览器操作
    BROWSER_NAVIGATE = 'browser:navigate',
    BROWSER_CLICK = 'browser:click',
    BROWSER_FILL = 'browser:fill',
    BROWSER_SCREENSHOT = 'browser:screenshot',
    BROWSER_GET_CONTENT = 'browser:get_content',

    // 运行时操作
    RUNTIME_EXEC = 'runtime:exec',
    RUNTIME_PROCESS = 'runtime:process',

    // 内存操作
    MEMORY_SAVE = 'memory:save',
    MEMORY_SEARCH = 'memory:search',
    MEMORY_GET = 'memory:get',

    // UI操作
    UI_NOTIFICATION = 'ui:notification',
    UI_CANVAS = 'ui:canvas',

    // 自动化
    AUTOMATION_CRON = 'automation:cron',
    AUTOMATION_GATEWAY = 'automation:gateway',
}

/**
 * 工具组定义
 * 参考来源: OpenClaw TOOL_GROUPS
 */
export const TOOL_GROUPS: Record<string, ToolTag[]> = {
    'group:file': [ToolTag.FILE_READ, ToolTag.FILE_WRITE, ToolTag.FILE_EDIT, ToolTag.FILE_DELETE],
    'group:web': [ToolTag.WEB_SEARCH, ToolTag.WEB_FETCH, ToolTag.WEB_SCRAPE],
    'group:browser': [
        ToolTag.BROWSER_NAVIGATE,
        ToolTag.BROWSER_CLICK,
        ToolTag.BROWSER_FILL,
        ToolTag.BROWSER_SCREENSHOT,
        ToolTag.BROWSER_GET_CONTENT
    ],
    'group:runtime': [ToolTag.RUNTIME_EXEC, ToolTag.RUNTIME_PROCESS],
    'group:memory': [ToolTag.MEMORY_SAVE, ToolTag.MEMORY_SEARCH, ToolTag.MEMORY_GET],
    'group:ui': [ToolTag.UI_NOTIFICATION, ToolTag.UI_CANVAS],
    'group:automation': [ToolTag.AUTOMATION_CRON, ToolTag.AUTOMATION_GATEWAY],
} as const;

/**
 * 工具定义接口
 * 参考来源: OpenClaw + Browser-Use + Stagehand
 */
export interface ToolDefinition<T = any> {
    /** 工具名称 (唯一标识) */
    name: string;
    /** 工具描述 */
    description: string;
    /** 参数Schema (Zod) */
    parameters: z.ZodType<T>;
    /** 执行函数 */
    execute: (params: T, context: ToolExecutionContext) => Promise<any>;
    /** 工具标签 (用于分类和推荐) */
    tags?: ToolTag[];
    /** 允许的域名 (浏览器工具专用) */
    domains?: string[];
    /** 是否异步执行 */
    async?: boolean;
    /** 超时时间 (毫秒) */
    timeout?: number;
}

/**
 * 工具调用
 */
export interface ToolCall {
    id: string;
    name: string;
    parameters: Record<string, any>;
    /** 调用结果 */
    result?: any;
    /** 是否成功 */
    success?: boolean;
    /** 错误信息 */
    error?: string;
}

/**
 * 工具集合
 */
export type ToolSet = Record<string, ToolDefinition>;

/**
 * 工具执行上下文
 * 参考来源: Browser-Use 特殊参数注入
 */
export interface ToolExecutionContext {
    /** 文件系统访问 */
    fileSystem?: FileSystem;
    /** 浏览器会话 */
    browser?: BrowserSession;
    /** LLM客户端 (用于工具内调用) */
    llm?: ILLMClient;
    /** 内存存储 */
    memory?: MemoryStore;
    /** 日志记录器 */
    logger?: Logger;
    /** 配置 */
    config?: Record<string, any>;
}

/**
 * 特殊注入参数类型
 * 参考来源: Browser-Use special_param_types
 */
export type SpecialInjectParam =
    | 'fileSystem'
    | 'browser'
    | 'llm'
    | 'memory'
    | 'logger'
    | 'config';

// 导入其他类型引用
import type { ILLMClient } from '../interfaces';
import type { FileSystem, BrowserSession, MemoryStore, Logger } from './browser';
