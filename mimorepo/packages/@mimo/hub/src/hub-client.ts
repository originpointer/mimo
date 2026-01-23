/**
 * BrowserHubClient - Socket.IO Client for Browser Extensions/Pages
 *
 * This module provides a Socket.IO client that runs in browser extensions
 * or pages and connects to the MimoBus server in Nitro.
 *
 * Refactored Architecture:
 *   Browser Extension → BrowserHubClient → Socket.IO → MimoBus Server
 */

import { io, Socket } from 'socket.io-client';
import {
  ProtocolEvent,
  HubCommandRequest,
  HubCommandResponse,
  CommandHandler,
  StreamHandler,
  HubCommandType,
} from '@mimo/types';

export interface BrowserHubClientConfig {
  /** Server URL (default: http://localhost:6007) */
  url?: string;
  /** Namespace (default: /mimo) */
  namespace?: string;
  /** Auto reconnect (default: true) */
  autoReconnect?: boolean;
  /** Tab ID for routing */
  tabId?: string;
  /** Client type: extension or page */
  clientType?: 'extension' | 'page';
  /** Enable debug logging */
  debug?: boolean;
}

export interface BrowserHubClient {
  /** Connect to the server */
  connect(): Promise<void>;
  /** Disconnect from the server */
  disconnect(): void;
  /** Check if connected */
  isConnected(): boolean;
  /** Register a command handler */
  registerHandler(type: HubCommandType | string, handler: CommandHandler): void;
  /** Register a stream handler */
  registerStreamHandler(type: HubCommandType | string, handler: StreamHandler): void;
  /** Unregister a handler */
  unregisterHandler(type: HubCommandType | string): void;
  /** Get socket ID */
  getSocketId(): string | undefined;
  /** Emit event to server */
  emit(event: string, data: unknown): void;
}

/**
 * Create a browser hub client
 */
export function createBrowserHubClient(config: BrowserHubClientConfig = {}): BrowserHubClient {
  const clientConfig: Required<BrowserHubClientConfig> = {
    url: config.url ?? 'http://localhost:6007',
    namespace: config.namespace ?? '/mimo',
    autoReconnect: config.autoReconnect ?? true,
    tabId: config.tabId ?? '',
    clientType: config.clientType ?? 'extension',
    debug: config.debug ?? false,
  };

  const handlers = new Map<string, CommandHandler>();
  const streamHandlers = new Map<string, StreamHandler>();

  const socket: Socket = io(`${clientConfig.url}${clientConfig.namespace}`, {
    autoConnect: false,
    reconnection: clientConfig.autoReconnect,
    auth: {
      tabId: clientConfig.tabId,
      clientType: clientConfig.clientType,
    },
  });

  const log = (message: string, data?: unknown): void => {
    if (clientConfig.debug) {
      console.log(`[BrowserHubClient] ${message}`, data ?? '');
    }
  };

  const connect = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      socket.once('connect', () => {
        log('Connected to server', { socketId: socket.id });
        resolve();
      });

      socket.once('connect_error', (error) => {
        log('Connection error', error);
        reject(error);
      });

      socket.connect();
    });
  };

  const disconnect = (): void => {
    socket.disconnect();
    log('Disconnected');
  };

  const isConnected = (): boolean => {
    return socket.connected;
  };

  const registerHandler = (type: HubCommandType | string, handler: CommandHandler): void => {
    handlers.set(type, handler);
    log('Handler registered', { type });
  };

  const registerStreamHandler = (type: HubCommandType | string, handler: StreamHandler): void => {
    streamHandlers.set(type, handler);
    log('Stream handler registered', { type });
  };

  const unregisterHandler = (type: HubCommandType | string): void => {
    handlers.delete(type);
    streamHandlers.delete(type);
    log('Handler unregistered', { type });
  };

  const getSocketId = (): string | undefined => {
    return socket.id;
  };

  const emit = (event: string, data: unknown): void => {
    socket.emit(event, data);
  };

  // Handle incoming command requests
  socket.on(ProtocolEvent.CommandRequest, async (request: HubCommandRequest) => {
    await handleCommand(request);
  });

  // Handle incoming stream requests
  socket.on(ProtocolEvent.StreamStart, async (request: HubCommandRequest) => {
    await handleStream(request);
  });

  // Handle welcome message
  socket.on('connected', (data) => {
    log('Welcome message', data);
  });

  /**
   * Handle command request
   */
  async function handleCommand(request: HubCommandRequest): Promise<void> {
    const startTime = Date.now();

    log('Command received', {
      id: request.id,
      type: request.type,
    });

    const handler = handlers.get(request.type);

    const response: HubCommandResponse = {
      id: request.id,
      success: false,
      timestamp: Date.now(),
      duration: 0,
    };

    if (handler) {
      try {
        response.data = await handler(request);
        response.success = true;
      } catch (error) {
        response.success = false;
        response.error = {
          code: error instanceof Error ? error.name : 'COMMAND_ERROR',
          message: error instanceof Error ? error.message : String(error),
        };
        log('Command error', {
          id: request.id,
          error: response.error,
        });
      }
    } else {
      response.error = {
        code: 'NO_HANDLER',
        message: `No handler registered for command type: ${request.type}`,
      };
      log('No handler found', { type: request.type });
    }

    response.duration = Date.now() - startTime;

    socket.emit(ProtocolEvent.CommandResponse, response);

    log('Response sent', {
      id: request.id,
      success: response.success,
      duration: response.duration,
    });
  }

  /**
   * Handle stream request
   */
  async function handleStream(request: HubCommandRequest): Promise<void> {
    log('Stream started', {
      id: request.id,
      type: request.type,
    });

    const handler = streamHandlers.get(request.type);

    if (!handler) {
      // Send error if no handler registered
      socket.emit(`${ProtocolEvent.StreamError}.${request.id}`, {
        id: request.id,
        error: `No stream handler registered for command type: ${request.type}`,
      });
      socket.emit(`${ProtocolEvent.StreamEnd}.${request.id}`, { id: request.id });
      log('No stream handler found', { type: request.type });
      return;
    }

    // Create emit function for the handler
    const emit = (event: { type: 'data' | 'error' | 'end'; data?: unknown; error?: string }) => {
      switch (event.type) {
        case 'data':
          socket.emit(`${ProtocolEvent.StreamData}.${request.id}`, {
            id: request.id,
            data: event.data,
          });
          break;
        case 'error':
          socket.emit(`${ProtocolEvent.StreamError}.${request.id}`, {
            id: request.id,
            error: event.error,
          });
          break;
        case 'end':
          socket.emit(`${ProtocolEvent.StreamEnd}.${request.id}`, { id: request.id });
          break;
      }
    };

    try {
      await handler(request, emit);
    } catch (error) {
      log('Stream error', {
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      });
      emit({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      emit({ type: 'end' });
      log('Stream ended', { id: request.id });
    }
  }

  return {
    connect,
    disconnect,
    isConnected,
    registerHandler,
    registerStreamHandler,
    unregisterHandler,
    getSocketId,
    emit,
  };
}

/**
 * BrowserHubClient class (for backwards compatibility)
 */
export class BrowserHubClientClass implements BrowserHubClient {
  private client: BrowserHubClient;

  constructor(config: BrowserHubClientConfig = {}) {
    this.client = createBrowserHubClient(config);
  }

  connect(): Promise<void> {
    return this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  registerHandler(type: HubCommandType | string, handler: CommandHandler): void {
    this.client.registerHandler(type, handler);
  }

  registerStreamHandler(type: HubCommandType | string, handler: StreamHandler): void {
    this.client.registerStreamHandler(type, handler);
  }

  unregisterHandler(type: HubCommandType | string): void {
    this.client.unregisterHandler(type);
  }

  getSocketId(): string | undefined {
    return this.client.getSocketId();
  }

  emit(event: string, data: unknown): void {
    this.client.emit(event, data);
  }
}

// Note: BrowserHubClient is an interface, use BrowserHubClientClass if you need a class
// export { BrowserHubClientClass };
