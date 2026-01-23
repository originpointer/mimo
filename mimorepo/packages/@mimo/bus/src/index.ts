/**
 * MimoBus - Core Communication Class for Mimo
 *
 * MimoBus is responsible for Socket.IO communication with the frontend.
 * All browser operations are sent as commands through MimoBus and results are received back.
 *
 * Architecture:
 *   Mimo (Nitro Server) → MimoBus → Socket.IO → Next App → Plasmo Extension
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { CommandType, StreamEventType, MimoErrorCode, BusEvent, CoreEvent } from '@mimo/types';
import type {
  MimoBusOptions,
  MimoCommand,
  MimoResponse,
  MimoStreamEvent,
  BusEventPayloads,
} from '@mimo/types';

// Re-export types from @mimo/types
export { CommandType, StreamEventType, BusEvent, CoreEvent };
export type {
  MimoBusOptions,
  MimoCommand,
  MimoResponse,
  MimoStreamEvent,
  BusEventPayloads,
  TabInfo,
} from '@mimo/types';

/**
 * MimoBus errors
 */
export class MimoBusError extends Error {
  constructor(
    message: string,
    public code: MimoErrorCode,
    public command?: MimoCommand
  ) {
    super(message);
    this.name = 'MimoBusError';
  }
}

export class MimoBusConnectionError extends MimoBusError {
  constructor(message: string) {
    super(message, MimoErrorCode.ConnectionFailed);
    this.name = 'MimoBusConnectionError';
  }
}

export class MimoBusTimeoutError extends MimoBusError {
  constructor(message: string, public timeout: number) {
    super(message, MimoErrorCode.ConnectionTimeout);
    this.name = 'MimoBusTimeoutError';
  }
}

export class MimoBusNotConnectedError extends MimoBusError {
  constructor() {
    super('Not connected to MimoBus server', MimoErrorCode.NotConnected);
    this.name = 'MimoBusNotConnectedError';
  }
}

export class MimoBusCommandError extends MimoBusError {
  constructor(message: string, commandId: string, command: MimoCommand) {
    super(message, MimoErrorCode.CommandFailed, command);
    this.name = 'MimoBusCommandError';
    this.commandId = commandId;
  }

  commandId: string;
}

/**
 * MimoBus - Socket.IO communication core
 */
export class MimoBus extends EventEmitter {
  private socket: Socket | null = null;
  private pendingCommands = new Map<string, {
    resolve: (response: MimoResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private streamControllers = new Map<string, {
    controller: ReadableStreamDefaultController<MimoStreamEvent>;
    cleanup: () => void;
  }>();

  constructor(private opts: MimoBusOptions = {}) {
    super();
    this.opts = {
      url: opts.url ?? 'ws://localhost:3000/socket.io/',
      autoReconnect: opts.autoReconnect ?? true,
      reconnectInterval: opts.reconnectInterval ?? 1000,
      timeout: opts.timeout ?? 30000,
      debug: opts.debug ?? false,
    };
  }

  /**
   * Connect to Socket.IO server
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      this.logger('already connected', { level: 1 });
      return;
    }

    return new Promise<void>((resolve, reject) => {
      // Parse URL to extract server URL and path
      // Socket.IO client needs server URL without path, and path as separate option
      const urlObj = new URL(this.opts.url!);
      const serverUrl = `${urlObj.protocol}//${urlObj.host}`;
      const path = urlObj.pathname || '/socket.io/';

      this.logger('Connecting to Socket.IO server', { level: 1, serverUrl, path });

      this.socket = io(serverUrl, {
        path,
        autoConnect: true,
        reconnection: this.opts.autoReconnect,
        reconnectionDelay: this.opts.reconnectInterval,
        timeout: this.opts.timeout,
      });

      const timeout = setTimeout(() => {
        this.socket?.disconnect();
        reject(new MimoBusTimeoutError('Connection timeout', this.opts.timeout!));
      }, this.opts.timeout);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        this.setupEventHandlers();
        this.emit(BusEvent.Connected);
        this.logger('connected to Socket.IO server', { level: 1 });
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new MimoBusConnectionError(error.message));
      });
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.emit(BusEvent.Disconnected, { reason: 'manual' });
      this.logger('disconnected from Socket.IO server', { level: 1 });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Send command and wait for response
   */
  async send<T = any>(command: MimoCommand): Promise<MimoResponse<T>> {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    const commandId = command.id || uuidv4();
    command.id = commandId;
    command.timestamp = command.timestamp || Date.now();

    this.logger('sending command', { level: 2, command: command.type, id: commandId });

    return new Promise<MimoResponse<T>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new MimoBusTimeoutError(
          `Command ${commandId} timeout`,
          this.opts.timeout!
        ));
      }, command.options?.timeout ?? this.opts.timeout);

      this.pendingCommands.set(commandId, {
        resolve: resolve as any,
        reject,
        timeout,
      });

      this.socket!.emit('mimo.command', command);
      this.emit(BusEvent.CommandSent, { command });
    });
  }

  /**
   * Send command and receive stream response
   */
  async sendWithStream<T = any>(
    command: MimoCommand
  ): Promise<AsyncGenerator<MimoStreamEvent<T>>> {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    const commandId = command.id || uuidv4();
    command.id = commandId;
    command.timestamp = command.timestamp || Date.now();

    this.logger('sending stream command', { level: 2, command: command.type, id: commandId });

    const stream = new ReadableStream<MimoStreamEvent<T>>({
      start: (controller) => {
        const cleanup = () => {
          this.socket?.off(`stream.${commandId}.data`, dataHandler);
          this.socket?.off(`stream.${commandId}.error`, errorHandler);
          this.socket?.off(`stream.${commandId}.end`, endHandler);
        };

        const dataHandler = (data: T) => {
          controller.enqueue({ type: StreamEventType.Data, data, id: commandId });
        };

        const errorHandler = (error: string) => {
          controller.enqueue({ type: StreamEventType.Error, error, id: commandId });
          cleanup();
        };

        const endHandler = () => {
          controller.enqueue({ type: StreamEventType.End, id: commandId });
          controller.close();
          cleanup();
        };

        this.socket!.on(`stream.${commandId}.data`, dataHandler);
        this.socket!.on(`stream.${commandId}.error`, errorHandler);
        this.socket!.on(`stream.${commandId}.end`, endHandler);

        this.streamControllers.set(commandId, { controller, cleanup });

        // Send the command
        this.socket!.emit('mimo.stream.start', command);
      },
      cancel: () => {
        const controller = this.streamControllers.get(commandId);
        if (controller) {
          controller.cleanup();
          this.streamControllers.delete(commandId);
        }
      },
    });

    const reader = stream.getReader();
    const iterator = {
      async next(): Promise<IteratorResult<MimoStreamEvent<T>>> {
        const { done, value } = await reader.read();
        return done ? { done: true, value: undefined as any } : { done: false, value };
      },
      async return(): Promise<IteratorResult<any>> {
        reader.releaseLock();
        return { done: true, value: undefined };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    return iterator as AsyncGenerator<MimoStreamEvent<T>>;
  }

  /**
   * Send command without waiting for response (fire-and-forget)
   */
  sendWithoutWaiting(command: MimoCommand): void {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    command.id = command.id || uuidv4();
    command.timestamp = command.timestamp || Date.now();

    this.socket!.emit('mimo.command', command);
    this.emit(BusEvent.CommandSent, { command });
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new MimoBusTimeoutError('Join room timeout', this.opts.timeout!));
      }, this.opts.timeout);

      this.socket!.emit('mimo.joinRoom', roomId, (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.logger('joined room', { level: 2, roomId });
          resolve();
        }
      });
    });
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new MimoBusTimeoutError('Leave room timeout', this.opts.timeout!));
      }, this.opts.timeout);

      this.socket!.emit('mimo.leaveRoom', roomId, (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.logger('left room', { level: 2, roomId });
          resolve();
        }
      });
    });
  }

  /**
   * Broadcast to all clients
   */
  broadcast(event: string, data: any): void {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    this.socket!.emit('mimo.broadcast', { event, data });
  }

  /**
   * Broadcast to a specific room
   */
  broadcastToRoom(roomId: string, event: string, data: any): void {
    if (!this.isConnected()) {
      throw new MimoBusNotConnectedError();
    }

    this.socket!.emit('mimo.broadcastToRoom', { roomId, event, data });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Command response handler
    this.socket.on('mimo.response', (response: MimoResponse) => {
      const pending = this.pendingCommands.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(response.id);

        if (response.success) {
          pending.resolve(response);
          this.emit(BusEvent.CommandResult, { id: response.id, response });
        } else {
          pending.reject(new MimoBusCommandError(
            response.error?.message ?? 'Command failed',
            response.id,
            {} as MimoCommand
          ));
        }
      }

      this.logger('received response', { level: 2, id: response.id, success: response.success });
    });

    // Stream data handler
    this.socket.on('mimo.stream.data', ({ id, data }: { id: string; data: any }) => {
      const controller = this.streamControllers.get(id);
      if (controller) {
        controller.controller.enqueue({ type: StreamEventType.Data, data, id });
        this.emit(BusEvent.StreamData, { id, data });
      }
    });

    // Stream error handler
    this.socket.on('mimo.stream.error', ({ id, error }: { id: string; error: string }) => {
      const controller = this.streamControllers.get(id);
      if (controller) {
        controller.controller.enqueue({ type: StreamEventType.Error, error, id });
        this.emit(BusEvent.StreamError, { id, error });
      }
    });

    // Stream end handler
    this.socket.on('mimo.stream.end', ({ id }: { id: string }) => {
      const controller = this.streamControllers.get(id);
      if (controller) {
        controller.controller.enqueue({ type: StreamEventType.End, id });
        controller.controller.close();
        controller.cleanup();
        this.streamControllers.delete(id);
        this.emit(BusEvent.StreamEnd, { id });
      }
    });

    // Screenshot handler
    this.socket.on('mimo.screenshot', ({ buffer, tabId }: { buffer: Buffer; tabId: string }) => {
      this.emit(BusEvent.Screenshot, { buffer: buffer as Uint8Array, tabId });
    });

    // DOM changed handler
    this.socket.on('mimo.dom.changed', ({ changes }: { changes: any[] }) => {
      this.emit(BusEvent.DomChanged, { changes });
    });

    // Tab changed handler
    this.socket.on('mimo.tab.changed', ({ tab }: { tab: any }) => {
      this.emit(BusEvent.TabChanged, { tab });
    });

    // Tab closed handler
    this.socket.on('mimo.tab.closed', ({ tabId }: { tabId: string }) => {
      this.emit(BusEvent.TabClosed, { tabId });
    });

    // Disconnect handler
    this.socket.on('disconnect', (reason) => {
      this.emit(BusEvent.Disconnected, { reason });
      this.logger('disconnected', { level: 1, reason });
    });

    // Error handler
    this.socket.on('error', (error) => {
      this.emit(BusEvent.Error, { error });
      this.logger('socket error', { level: 0, error });
    });
  }

  /**
   * Logger
   */
  private logger(message: string, { level = 1, ...data }: any): void {
    if (!this.opts.debug || level < (this.opts.debug ? 1 : 2)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[MimoBus ${timestamp}]`;

    switch (level) {
      case 0:
        console.error(prefix, message, data);
        break;
      case 1:
        console.log(prefix, message, data);
        break;
      case 2:
        console.debug(prefix, message, data);
        break;
    }
  }

  /**
   * Destroy MimoBus instance
   */
  destroy(): void {
    this.removeAllListeners();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear all pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new MimoBusNotConnectedError());
    }
    this.pendingCommands.clear();

    // Clear all stream controllers
    for (const [id, controller] of this.streamControllers) {
      controller.cleanup();
      controller.controller.close();
    }
    this.streamControllers.clear();
  }
}
