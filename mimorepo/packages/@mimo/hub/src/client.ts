/**
 * Mimo Hub Client
 *
 * 客户端 Socket.IO 连接器，用于连接到 Mimo Hub 服务器
 * 封装连接管理、事件处理和状态管理逻辑
 */

import { io, Socket } from 'socket.io-client';

export interface HubClientConfig {
  /** 服务器 URL */
  url?: string;
  /** 端口 */
  port?: string;
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 是否自动重连 */
  reconnection?: boolean;
  /** 重连延迟（毫秒） */
  reconnectionDelay?: number;
  /** 重连尝试次数 */
  reconnectionAttempts?: number;
  /** 静默模式，减少控制台输出 */
  silent?: boolean;
}

export interface HubClientState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export type ConnectionStateListener = (state: HubClientState) => void;
export type MessageListener = (data: unknown) => void;
export type ErrorListener = (error: Error) => void;

/**
 * Mimo Hub 客户端类
 *
 * @example
 * ```typescript
 * const client = new HubClient({ port: '6007' });
 *
 * client.onStateChange((state) => {
 *   console.log('Connection state:', state);
 * });
 *
 * client.onMessage((data) => {
 *   console.log('Received:', data);
 * });
 *
 * await client.connect();
 *
 * // 发送命令
 * client.sendCommand('mimo.command', { action: 'test' });
 *
 * // 断开连接
 * client.disconnect();
 * ```
 */
export class HubClient {
  private socket: Socket | null = null;
  private config: Required<HubClientConfig>;
  private state: HubClientState;
  private stateListeners: Set<ConnectionStateListener>;
  private messageListeners: Set<MessageListener>;
  private errorListeners: Set<ErrorListener>;

  constructor(config: HubClientConfig = {}) {
    const port = config.port || process.env.NEXT_PUBLIC_MIMO_HUB_PORT || '6007';
    const url = config.url || process.env.NEXT_PUBLIC_MIMO_HUB_URL || `http://localhost:${port}`;

    this.config = {
      url,
      port,
      autoConnect: config.autoConnect ?? true,
      reconnection: config.reconnection ?? true,
      reconnectionDelay: config.reconnectionDelay ?? 2000,
      reconnectionAttempts: config.reconnectionAttempts ?? 2,
      silent: config.silent ?? true,
    };

    this.state = {
      isConnected: false,
      isConnecting: false,
      error: null,
    };

    this.stateListeners = new Set();
    this.messageListeners = new Set();
    this.errorListeners = new Set();
  }

  /**
   * 连接到服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.log('Already connected');
        resolve();
        return;
      }

      if (typeof window === 'undefined') {
        const error = new Error('Cannot connect in server-side environment');
        this.updateState({ isConnecting: false, error });
        reject(error);
        return;
      }

      this.updateState({ isConnecting: true, error: null });

      // 创建 Socket.IO 连接
      this.socket = io(this.config.url, {
        autoConnect: this.config.autoConnect,
        reconnection: this.config.reconnection,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionAttempts: this.config.reconnectionAttempts,
      });

      // 连接成功
      this.socket.on('connect', () => {
        this.log(`Connected: ${this.socket!.id}`);
        this.updateState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        resolve();
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        this.logError('Connection error:', error);
        this.updateState({
          isConnected: false,
          isConnecting: false,
          error: error as Error,
        });
        reject(error);
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        this.log(`Disconnected: ${reason}`);
        this.updateState({ isConnected: false });
      });

      // 重连尝试
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        this.log(`Reconnection attempt: ${attemptNumber}`);
        this.updateState({ isConnecting: true });
      });

      // 重连成功
      this.socket.on('reconnect', (attemptNumber) => {
        this.log(`Reconnected after ${attemptNumber} attempts`);
        this.updateState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      });

      // 接收消息
      this.socket.on('message', (data) => {
        this.notifyMessageListeners(data);
      });

      // 接收 mimo 响应
      this.socket.on('mimo.response', (data) => {
        this.notifyMessageListeners(data);
      });

      // 连接成功通知
      this.socket.on('connected', (data) => {
        this.log('Server welcome:', data);
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.log('Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.updateState({
        isConnected: false,
        isConnecting: false,
      });
    }
  }

  /**
   * 发送命令到服务器
   */
  sendCommand(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      throw new Error('Socket is not connected');
    }
    this.socket.emit(event, data);
  }

  /**
   * 发送 Mimo 命令
   */
  sendMimoCommand(command: string, params: Record<string, unknown> = {}): void {
    this.sendCommand('mimo.command', {
      id: crypto.randomUUID(),
      command,
      params,
      timestamp: Date.now(),
    });
  }

  /**
   * 加入房间
   */
  joinRoom(room: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      this.socket.emit('mimo.joinRoom', room, (response: { success: boolean; room: string }) => {
        if (response.success) {
          this.log(`Joined room: ${room}`);
          resolve();
        } else {
          reject(new Error(`Failed to join room: ${room}`));
        }
      });
    });
  }

  /**
   * 离开房间
   */
  leaveRoom(room: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      this.socket.emit('mimo.leaveRoom', room, (response: { success: boolean; room: string }) => {
        if (response.success) {
          this.log(`Left room: ${room}`);
          resolve();
        } else {
          reject(new Error(`Failed to leave room: ${room}`));
        }
      });
    });
  }

  /**
   * 获取当前连接状态
   */
  getState(): HubClientState {
    return { ...this.state };
  }

  /**
   * 获取 Socket 实例（高级用法）
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 监听连接状态变化
   */
  onStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * 监听消息
   */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * 监听错误
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * 添加一次性事件监听器
   */
  once(event: string, listener: (...args: unknown[]) => void): void {
    this.socket?.once(event, listener);
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.socket?.on(event, listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener?: (...args: unknown[]) => void): void {
    if (listener) {
      this.socket?.off(event, listener);
    } else {
      this.socket?.off(event);
    }
  }

  private updateState(updates: Partial<HubClientState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateListeners();
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('[HubClient] State listener error:', error);
      }
    });
  }

  private notifyMessageListeners(data: unknown): void {
    this.messageListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('[HubClient] Message listener error:', error);
      }
    });
  }

  private log(...args: unknown[]): void {
    if (!this.config.silent) {
      console.log('[HubClient]', ...args);
    }
  }

  private logError(...args: unknown[]): void {
    if (!this.config.silent) {
      console.error('[HubClient]', ...args);
    }
  }
}
