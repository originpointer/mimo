/**
 * Extension Message Sender - Chrome Extension 消息发送器
 *
 * 此模块提供从 next-app 页面向 plasmo-app (Chrome 扩展) 发送消息的功能。
 * 使用 chrome.runtime.sendMessage API 实现，遵循 next-app→plasmo-app 通信协议。
 *
 * @see /apps/plasmo-app/docs/next-app到plasmo-app通信协议文档.md
 */

import type { HubCommandRequest } from '@mimo/types';

/**
 * Chrome Runtime API 类型定义
 */
type ChromeRuntimeLite = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback?: (response: unknown) => void
  ) => void;
  lastError?: { message?: string };
};

/**
 * 消息格式
 */
export interface ExtensionMessage {
  /** 消息类型 (HubCommandType 或自定义类型) */
  type: string;
  /** 消息负载 */
  payload?: any;
  /** 消息 ID (可选，自动生成) */
  id?: string;
  /** 时间戳 (可选，自动生成) */
  timestamp?: number;
  /** 选项 (可选) */
  options?: Record<string, any>;
}

/**
 * 响应格式
 */
export interface ExtensionResponse<T = any> {
  /** 是否成功 */
  ok: boolean;
  /** 响应数据 (成功时) */
  data?: T;
  /** 错误信息 (失败时) */
  error?: string;
}

/**
 * 扩展消息发送器配置
 */
export interface ExtensionMessageSenderConfig {
  /** Chrome 扩展 ID */
  extensionId: string;
  /** 请求超时时间 (毫秒，默认 30000) */
  timeout?: number;
  /** 启用调试日志 */
  debug?: boolean;
}

/**
 * 扩展消息发送器接口
 */
export interface ExtensionMessageSender {
  /** 发送消息到扩展 */
  send<T = any>(message: ExtensionMessage): Promise<ExtensionResponse<T>>;
  /** 发送 HubCommandRequest */
  sendCommand<T = any>(request: HubCommandRequest): Promise<ExtensionResponse<T>>;
  /** 检查 Chrome Runtime 是否可用 */
  isAvailable(): boolean;
  /** 获取当前扩展 ID */
  getExtensionId(): string;
}

/**
 * 创建扩展消息发送器
 *
 * @param config - 配置选项
 * @returns 扩展消息发送器实例
 *
 * @example
 * ```typescript
 * const sender = createExtensionMessageSender({
 *   extensionId: 'abcdefghijklmnop',
 *   timeout: 30000,
 *   debug: true
 * });
 *
 * // 发送消息
 * const response = await sender.send({
 *   type: 'browser.navigate',
 *   payload: { url: 'https://example.com' }
 * });
 *
 * if (response.ok) {
 *   console.log('Success:', response.data);
 * } else {
 *   console.error('Error:', response.error);
 * }
 * ```
 */
export function createExtensionMessageSender(
  config: ExtensionMessageSenderConfig
): ExtensionMessageSender {
  const senderConfig: Required<ExtensionMessageSenderConfig> = {
    extensionId: config.extensionId.trim(),
    timeout: config.timeout ?? 30000,
    debug: config.debug ?? false,
  };

  /**
   * 获取 Chrome Runtime API
   */
  const getRuntime = (): ChromeRuntimeLite | null => {
    const runtime = (globalThis as any)?.chrome?.runtime as ChromeRuntimeLite | undefined;
    return runtime && typeof runtime.sendMessage === 'function' ? runtime : null;
  };

  /**
   * 日志输出
   */
  const log = (message: string, data?: unknown): void => {
    if (senderConfig.debug) {
      console.log(`[ExtensionMessageSender] ${message}`, data ?? '');
    }
  };

  /**
   * 检查 Chrome Runtime 是否可用
   */
  const isAvailable = (): boolean => {
    return getRuntime() !== null;
  };

  /**
   * 获取当前扩展 ID
   */
  const getExtensionId = (): string => {
    return senderConfig.extensionId;
  };

  /**
   * 发送消息到扩展
   */
  const send = async <T = any>(message: ExtensionMessage): Promise<ExtensionResponse<T>> => {
    if (!senderConfig.extensionId) {
      throw new Error('extensionId 为空，无法连接扩展');
    }

    const runtime = getRuntime();
    if (!runtime) {
      throw new Error('chrome.runtime 不可用：请确认扩展已安装且允许外部消息');
    }

    // 构造完整的消息
    const fullMessage: ExtensionMessage = {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp || Date.now(),
      options: message.options,
    };

    log('Sending message', {
      extensionId: senderConfig.extensionId,
      message: fullMessage,
    });

    return new Promise<ExtensionResponse<T>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`请求超时 (${senderConfig.timeout}ms)`));
      }, senderConfig.timeout);

      runtime.sendMessage(senderConfig.extensionId, fullMessage, (response: unknown) => {
        clearTimeout(timeoutId);

        // 检查 Chrome API 错误
        const error = runtime.lastError;
        if (error?.message) {
          log('Chrome API error', error);
          reject(new Error(error.message));
          return;
        }

        log('Response received', response);

        // 解析响应
        const resp = response as ExtensionResponse<T> | undefined;
        if (!resp) {
          resolve({ ok: false, error: '未收到响应' });
          return;
        }

        resolve(resp);
      });
    });
  };

  /**
   * 发送 HubCommandRequest
   */
  const sendCommand = async <T = any>(request: HubCommandRequest): Promise<ExtensionResponse<T>> => {
    return send<T>({
      id: request.id,
      type: request.type,
      payload: request.payload,
      timestamp: request.timestamp,
      options: request.options,
    });
  };

  return {
    send,
    sendCommand,
    isAvailable,
    getExtensionId,
  };
}

/**
 * ExtensionMessageSender 类 (类版本，用于兼容性)
 */
export class ExtensionMessageSenderClass implements ExtensionMessageSender {
  private sender: ExtensionMessageSender;

  constructor(config: ExtensionMessageSenderConfig) {
    this.sender = createExtensionMessageSender(config);
  }

  send<T = any>(message: ExtensionMessage): Promise<ExtensionResponse<T>> {
    return this.sender.send(message);
  }

  sendCommand<T = any>(request: HubCommandRequest): Promise<ExtensionResponse<T>> {
    return this.sender.sendCommand(request);
  }

  isAvailable(): boolean {
    return this.sender.isAvailable();
  }

  getExtensionId(): string {
    return this.sender.getExtensionId();
  }
}
