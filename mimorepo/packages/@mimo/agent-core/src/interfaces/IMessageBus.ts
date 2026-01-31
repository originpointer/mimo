/**
 * 消息类型
 */
export type MessageType =
    | import('../types').SocketEventType
    | import('../types').FrontendMessageType;

/**
 * 消息处理器
 */
export type MessageHandler<T = any> = (message: T) => void | Promise<void>;

/**
 * 消息总线接口
 * 参考来源: Manus.im Socket.IO消息系统
 *
 * 设计原则:
 * 1. 支持发布-订阅模式
 * 2. 支持请求-响应模式
 * 3. 支持消息过滤
 * 4. 支持多端通信
 */
export interface IMessageBus {
    /**
     * 发布消息
     * @param type 消息类型
     * @param message 消息内容
     */
    publish<T = any>(type: MessageType, message: T): void;

    /**
     * 订阅消息
     * @param type 消息类型
     * @param handler 消息处理器
     * @returns 取消订阅函数
     */
    subscribe<T = any>(
        type: MessageType,
        handler: MessageHandler<T>
    ): () => void;

    /**
     * 发送请求并等待响应
     * @param type 消息类型
     * @param message 请求消息
     * @param timeout 超时时间
     * @returns 响应消息
     */
    request<TRequest = any, TResponse = any>(
        type: MessageType,
        message: TRequest,
        timeout?: number
    ): Promise<TResponse>;

    /**
     * 响应请求
     * @param type 消息类型
     * @param handler 响应处理器
     */
    respond<TRequest = any, TResponse = any>(
        type: MessageType,
        handler: (request: TRequest) => TResponse | Promise<TResponse>
    ): void;

    /**
     * 广播消息到所有客户端
     * @param type 消息类型
     * @param message 消息内容
     * @param exclude 排除的客户端ID列表
     */
    broadcast<T = any>(
        type: MessageType,
        message: T,
        exclude?: string[]
    ): void;
}
