/**
 * 消息角色
 */
export enum MessageRole {
    SYSTEM = 'system',
    USER = 'user',
    ASSISTANT = 'assistant',
    TOOL = 'tool',
}

/** Alias for MessageRole for compatibility */
export { MessageRole as Role };

/**
 * 消息内容类型
 * 参考来源: Manus.im 消息格式
 */
export enum MessageContentType {
    TEXT = 'text',
    IMAGE = 'image',
    AUDIO = 'audio',
    FILE = 'file',
    THINKING = 'thinking',  // 推理内容
}

/**
 * 消息内容块
 */
export interface MessageContent {
    type: MessageContentType;
    value: string;
    /** 附件元数据 */
    metadata?: {
        mimeType?: string;
        filename?: string;
        size?: number;
        url?: string;
    };
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
    role: MessageRole;
    content: string | MessageContent[];
    /** 工具调用ID (工具角色消息) */
    toolCallId?: string;
    /** 工具调用列表 (助手角色消息) */
    toolCalls?: import('./tool').ToolCall[];
    /** 时间戳 */
    timestamp?: number;
    /** 元数据 */
    metadata?: Record<string, any>;
}

/**
 * 用户消息
 * 参考来源: Manus.im user_message
 */
export interface UserMessage extends BaseMessage {
    role: MessageRole.USER;
    content: string | MessageContent[];
    /** 消息ID */
    id?: string;
    /** 会话ID */
    sessionId?: string;
    /** 消息类型 */
    messageType?: 'text' | 'multimodal';
    /** 附件 */
    attachments?: Attachment[];
}

/**
 * 助手消息
 */
export interface AssistantMessage extends BaseMessage {
    role: MessageRole.ASSISTANT;
    content: string | MessageContent[];
    toolCalls?: import('./tool').ToolCall[];
}

/**
 * 工具结果消息
 */
export interface ToolResultMessage extends BaseMessage {
    role: MessageRole.TOOL;
    content: string;
    toolCallId: string;
    /** 工具执行结果 */
    result?: any;
    /** 是否执行成功 */
    success?: boolean;
    /** 错误信息 */
    error?: string;
}

/**
 * 附件类型
 * 参考来源: Manus.im attachments
 */
export interface Attachment {
    id: string;
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
}
