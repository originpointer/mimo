/**
 * Agent系统错误基类
 */
export class AgentError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AgentError';
    }
}

/**
 * LLM相关错误
 */
export class LLMError extends AgentError {
    constructor(message: string, code: string, statusCode?: number, details?: any) {
        super(message, code, statusCode || 500, details);
        this.name = 'LLMError';
    }
}

export class LLMRateLimitError extends LLMError {
    constructor(details?: any) {
        super('Rate limit exceeded', 'RATE_LIMIT', 429, details);
        this.name = 'LLMRateLimitError';
    }
}

export class LLMTimeoutError extends LLMError {
    constructor(details?: any) {
        super('Request timeout', 'TIMEOUT', 408, details);
        this.name = 'LLMTimeoutError';
    }
}

/**
 * 工具相关错误
 */
export class ToolError extends AgentError {
    constructor(message: string, code: string, statusCode: number, details?: any) {
        super(message, code, statusCode, details);
        this.name = 'ToolError';
    }
}

export class ToolNotFoundError extends ToolError {
    constructor(toolName: string) {
        super(`Tool not found: ${toolName}`, 'TOOL_NOT_FOUND', 404, { toolName });
        this.name = 'ToolNotFoundError';
    }
}

export class ToolExecutionError extends ToolError {
    constructor(toolName: string, originalError: Error) {
        super(
            `Tool execution failed: ${toolName}`,
            'TOOL_EXECUTION_ERROR',
            500,
            { toolName, originalError: originalError.message }
        );
        this.name = 'ToolExecutionError';
    }
}

export class ToolPermissionError extends ToolError {
    constructor(toolName: string, reason: string) {
        super(
            `Tool permission denied: ${toolName} - ${reason}`,
            'TOOL_PERMISSION_DENIED',
            403,
            { toolName, reason }
        );
        this.name = 'ToolPermissionError';
    }
}

/**
 * 缓存相关错误
 */
export class CacheError extends AgentError {
    constructor(message: string, code?: string, statusCode?: number, details?: any) {
        super(message, code || 'CACHE_ERROR', statusCode || 500, details);
        this.name = 'CacheError';
    }
}

/**
 * Agent相关错误
 */
export class AgentExecutionError extends AgentError {
    constructor(agentId: string, message: string, details?: any) {
        super(message, 'AGENT_EXECUTION_ERROR', 500, { agentId, ...details });
        this.name = 'AgentExecutionError';
    }
}

/**
 * Socket.IO相关错误
 */
export class SocketError extends AgentError {
    constructor(message: string, code?: string, statusCode?: number, details?: any) {
        super(message, code || 'SOCKET_ERROR', statusCode || 500, details);
        this.name = 'SocketError';
    }
}

export class SocketConnectionError extends SocketError {
    constructor(details?: any) {
        super('Socket connection failed', 'SOCKET_CONNECTION_ERROR', 503, details);
        this.name = 'SocketConnectionError';
    }
}
