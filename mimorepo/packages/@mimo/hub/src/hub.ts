/**
 * Socket.IO Hub for server command relay
 *
 * The Hub is a server-side Socket.IO namespace handler that:
 * - Receives commands from MimoBus clients
 * - Routes commands to registered handlers
 * - Sends responses back to clients
 * - Manages streaming connections for long-running commands
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ProtocolEvent,
  HubCommandType,
  HubCommandRequest,
  HubCommandResponse,
  CommandHandler,
  StreamHandler,
} from '@mimo/types';

export interface HubConfig {
  /** Socket.IO server instance */
  io: SocketIOServer;
  /** Namespace for the hub (default: '/mimo') */
  namespace?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Hub - Server-side Socket.IO command router
 *
 * The Hub receives commands from MimoBus clients and routes them
 * to registered handlers. Handlers can be registered for each
 * command type.
 */
export class Hub {
  private io: SocketIOServer;
  private namespace: string;
  private debug: boolean;
  private handlers = new Map<HubCommandType, CommandHandler>();
  private streamHandlers = new Map<HubCommandType, StreamHandler>();
  private activeStreams = new Map<string, () => void>();

  constructor(config: HubConfig) {
    this.io = config.io;
    this.namespace = config.namespace || '/mimo';
    this.debug = config.debug ?? false;
  }

  /**
   * Initialize the hub and start listening for connections
   */
  initialize(): void {
    const nsp = this.io.of(this.namespace);

    nsp.on('connection', (socket) => {
      this.logger('Client connected', { socketId: socket.id });

      // Handle command requests
      socket.on(ProtocolEvent.CommandRequest, async (request: HubCommandRequest) => {
        await this.handleCommandRequest(socket, request);
      });

      // Handle stream start
      socket.on(ProtocolEvent.StreamStart, async (request: HubCommandRequest) => {
        await this.handleStreamStart(socket, request);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.logger('Client disconnected', { socketId: socket.id, reason });
        this.cleanupStreams(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger('Socket error', { socketId: socket.id, error });
      });

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: Date.now(),
      });
    });

    this.logger('Hub initialized', { namespace: this.namespace });
  }

  /**
   * Register a handler for a command type
   *
   * Handlers are called when a command of the registered type is received.
   * The handler should return the response data or throw an error.
   *
   * @param type - The command type to handle
   * @param handler - The handler function
   */
  onCommand(type: HubCommandType, handler: CommandHandler): void {
    this.handlers.set(type, handler);
    this.logger('Handler registered', { type });
  }

  /**
   * Register a stream handler for a command type
   *
   * Stream handlers are used for commands that produce streaming responses
   * (e.g., LLM agent execution). The handler receives an emit function to
   * send stream events.
   *
   * @param type - The command type to handle
   * @param handler - The stream handler function
   */
  onStream(type: HubCommandType, handler: StreamHandler): void {
    this.streamHandlers.set(type, handler);
    this.logger('Stream handler registered', { type });
  }

  /**
   * Unregister a handler for a command type
   *
   * @param type - The command type to unregister
   */
  offCommand(type: HubCommandType): void {
    this.handlers.delete(type);
    this.streamHandlers.delete(type);
    this.logger('Handler unregistered', { type });
  }

  /**
   * Get the namespace for this hub
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Handle incoming command request
   */
  private async handleCommandRequest(socket: Socket, request: HubCommandRequest): Promise<void> {
    const startTime = Date.now();

    // Add detailed logging for navigate commands
    if (request.type === HubCommandType.BrowserNavigate) {
      console.log('[Hub] ==================== BROWSER NAVIGATE ====================');
      console.log('[Hub] Command ID:', request.id);
      console.log('[Hub] Timestamp:', new Date(request.timestamp).toISOString());
      console.log('[Hub] Payload:', JSON.stringify(request.payload, null, 2));
      console.log('[Hub] Options:', JSON.stringify(request.options, null, 2));
      console.log('[Hub] Socket ID:', socket.id);
      console.log('[Hub] ==========================================================');
    }

    this.logger('Command received', { socketId: socket.id, type: request.type, id: request.id });

    try {
      const handler = this.handlers.get(request.type);

      if (!handler) {
        throw new Error(`No handler registered for command type: ${request.type}`);
      }

      // Execute the handler
      const data = await handler(request);

      // Send success response
      const response: HubCommandResponse = {
        id: request.id,
        success: true,
        data,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };

      socket.emit(ProtocolEvent.CommandResponse, response);

      if (request.type === HubCommandType.BrowserNavigate) {
        console.log('[Hub] ==================== NAVIGATE RESPONSE ====================');
        console.log('[Hub] Command ID:', request.id);
        console.log('[Hub] Duration:', response.duration, 'ms');
        console.log('[Hub] Response Data:', JSON.stringify(data, null, 2));
        console.log('[Hub] ==========================================================');
      }

      this.logger('Response sent', { socketId: socket.id, id: request.id, duration: response.duration });
    } catch (error) {
      // Send error response
      const response: HubCommandResponse = {
        id: request.id,
        success: false,
        error: {
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };

      socket.emit(ProtocolEvent.CommandResponse, response);
      this.logger('Error response sent', { socketId: socket.id, id: request.id, error: response.error });
    }
  }

  /**
   * Handle incoming stream start request
   */
  private async handleStreamStart(socket: Socket, request: HubCommandRequest): Promise<void> {
    this.logger('Stream started', { socketId: socket.id, type: request.type, id: request.id });

    const handler = this.streamHandlers.get(request.type);

    if (!handler) {
      // Send error if no handler registered
      socket.emit(`${ProtocolEvent.StreamError}.${request.id}`, {
        id: request.id,
        error: `No stream handler registered for command type: ${request.type}`,
      });
      socket.emit(`${ProtocolEvent.StreamEnd}.${request.id}`, { id: request.id });
      return;
    }

    // Create emit function for the handler
    const emit = (event: { type: 'data' | 'error' | 'end'; data?: unknown; error?: string }) => {
      switch (event.type) {
        case 'data':
          socket.emit(`${ProtocolEvent.StreamData}.${request.id}`, { id: request.id, data: event.data });
          break;
        case 'error':
          socket.emit(`${ProtocolEvent.StreamError}.${request.id}`, { id: request.id, error: event.error });
          break;
        case 'end':
          socket.emit(`${ProtocolEvent.StreamEnd}.${request.id}`, { id: request.id });
          break;
      }
    };

    // Store handlers for cleanup
    const dataHandler = () => {};
    const errorHandler = () => {};
    const endHandler = () => {};

    // Store cleanup function
    const cleanup = () => {
      socket.removeListener(`${ProtocolEvent.StreamData}.${request.id}`, dataHandler);
      socket.removeListener(`${ProtocolEvent.StreamError}.${request.id}`, errorHandler);
      socket.removeListener(`${ProtocolEvent.StreamEnd}.${request.id}`, endHandler);
      this.activeStreams.delete(`${socket.id}:${request.id}`);
    };

    this.activeStreams.set(`${socket.id}:${request.id}`, cleanup);

    try {
      await handler(request, emit);
    } catch (error) {
      emit({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      emit({ type: 'end' });
      cleanup();
    }
  }

  /**
   * Cleanup streams for a disconnected socket
   */
  private cleanupStreams(socketId: string): void {
    for (const [key, cleanup] of this.activeStreams) {
      if (key.startsWith(`${socketId}:`)) {
        cleanup();
        this.activeStreams.delete(key);
      }
    }
  }

  /**
   * Logger
   */
  private logger(message: string, data: Record<string, unknown>): void {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    const prefix = `[Hub ${timestamp}]`;
    console.log(prefix, message, data);
  }

  /**
   * Destroy the hub
   */
  destroy(): void {
    this.handlers.clear();
    this.streamHandlers.clear();
    for (const cleanup of this.activeStreams.values()) {
      cleanup();
    }
    this.activeStreams.clear();
    this.logger('Hub destroyed', { namespace: this.namespace });
  }
}
