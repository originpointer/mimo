/**
 * MimoBus - Socket.IO Server for Browser Client Communication
 *
 * MimoBus is a Socket.IO server that runs in the Nitro server
 * and receives connections from browser clients (extensions/pages).
 *
 * Refactored Architecture:
 *   Nitro Server → MimoBus Server → Socket.IO → Browser Extension
 */

import EventEmitter from 'eventemitter3';
import type { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { HubCommandRequest, HubCommandResponse, HubStreamEvent, MimoBusOptions, BusEvent } from '@mimo/types';
import { ProtocolEvent, BusEvent as BusEventEnum } from '@mimo/types';
import { createMimoBusServer, type MimoBusServer } from './server.js';
import { createClientTracker, type ClientTracker, type BrowserClient } from './client-tracker.js';
import { createCommandRouter, type CommandRouter } from './command-router.js';
import { MimoBusNotConnectedError, MimoBusTimeoutError } from './errors.js';
import { v4 as uuidv4 } from 'uuid';

export class MimoBus extends EventEmitter {
  private server: MimoBusServer;
  private clientTracker: ClientTracker;
  private commandRouter: CommandRouter;
  private opts: MimoBusOptions;
  private isConnectedFlag = false;

  constructor(opts: MimoBusOptions = {}) {
    super();
    this.opts = {
      url: opts.url, // Keep for compatibility, but not used in server mode
      port: opts.port ?? 6007,
      autoReconnect: opts.autoReconnect ?? true,
      reconnectInterval: opts.reconnectInterval ?? 1000,
      timeout: opts.timeout ?? 30000,
      debug: opts.debug ?? false,
    };

    // Create Socket.IO server
    this.server = createMimoBusServer({
      port: this.opts.port,
      debug: this.opts.debug,
    });

    // Create client tracker
    this.clientTracker = createClientTracker();

    // Create command router
    this.commandRouter = createCommandRouter(this.clientTracker);

    this.log('MimoBus initialized', { port: this.opts.port });
  }

  /**
   * Start the Socket.IO server and setup connection handlers
   */
  async connect(): Promise<void> {
    await this.server.start();

    const mimoNamespace = this.server.getMimoNamespace();

    // Setup connection handler
    mimoNamespace.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);
    });

    this.isConnectedFlag = true;
    this.log('Server started and listening for connections');
    this.emit(BusEventEnum.Connected, { port: this.opts.port });
  }

  /**
   * Disconnect from Socket.IO server (stop the server)
   */
  async disconnect(): Promise<void> {
    await this.server.stop();
    this.isConnectedFlag = false;
    this.log('Server stopped');
    this.emit(BusEventEnum.Disconnected);
  }

  /**
   * Check if server is running
   */
  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  /**
   * Send command to browser client and wait for response
   *
   * @param command - The command to send to the browser client
   * @returns Promise that resolves with the command response
   */
  async send<T = unknown>(command: HubCommandRequest): Promise<HubCommandResponse<T>> {
    if (!this.isConnectedFlag) {
      throw new MimoBusNotConnectedError();
    }

    // Generate command ID if not provided
    const commandId = command.id || uuidv4();
    command.id = commandId;
    command.timestamp = command.timestamp || Date.now();

    this.log('Sending command', {
      id: commandId,
      type: command.type,
      tabId: command.options?.tabId,
    });

    this.emit(BusEventEnum.CommandSent, { command });

    try {
      const response = await this.commandRouter.sendCommand(
        command,
        command.options?.timeout ?? this.opts.timeout!
      );

      this.emit(BusEventEnum.CommandResult, { id: commandId, response });

      return response as HubCommandResponse<T>;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new MimoBusTimeoutError(
          `Command ${commandId} timeout`,
          command.options?.timeout ?? this.opts.timeout!
        );
      }
      throw error;
    }
  }

  /**
   * Send command and receive stream response
   *
   * @param command - The command to send to the browser client
   * @returns AsyncGenerator that yields stream events
   */
  async sendWithStream<T = unknown>(
    command: HubCommandRequest
  ): Promise<AsyncGenerator<HubStreamEvent<T>>> {
    if (!this.isConnectedFlag) {
      throw new MimoBusNotConnectedError();
    }

    const commandId = command.id || uuidv4();
    command.id = commandId;
    command.timestamp = command.timestamp || Date.now();

    this.log('Sending stream command', { id: commandId, type: command.type });

    const targetClient = this.clientTracker.getTargetClient(command.options?.tabId);

    if (!targetClient) {
      throw new Error('No available browser client for stream command');
    }

    // Create async generator for stream events
    const streamController = this.createStreamController(commandId, targetClient);

    // Emit stream start event
    targetClient.socket.emit(ProtocolEvent.StreamStart, command);

    return streamController;
  }

  /**
   * Get connected clients info
   */
  getClients(): BrowserClient[] {
    return this.clientTracker.getAllClients();
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clientTracker.getClientCount();
  }

  /**
   * Destroy MimoBus instance
   */
  destroy(): void {
    this.removeAllListeners();

    // Stop server
    this.server.stop();

    // Clear pending commands
    for (const client of this.clientTracker.getAllClients()) {
      this.commandRouter.cleanupPendingCommands(client.socketId);
    }

    this.isConnectedFlag = false;
    this.log('MimoBus destroyed');
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: Socket): void {
    const auth = socket.handshake.auth;
    const clientType = auth.clientType || 'extension';
    const tabId = auth.tabId;

    // Register client
    this.clientTracker.register(socket, {
      clientType,
      tabId,
    });

    this.log('Client connected', {
      socketId: socket.id,
      clientType,
      tabId,
    });

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now(),
    });

    // Handle command responses
    socket.on(ProtocolEvent.CommandResponse, (response: HubCommandResponse) => {
      this.commandRouter.handleResponse(response);
    });

    // Handle stream events
    socket.on(`${ProtocolEvent.StreamData}.*`, (data: HubStreamEvent) => {
      this.commandRouter.handleStreamEvent(data);
      this.emit(BusEventEnum.StreamData, data);
    });

    socket.on(`${ProtocolEvent.StreamError}.*`, (data: HubStreamEvent) => {
      this.commandRouter.handleStreamEvent(data);
      this.emit(BusEventEnum.StreamError, data);
    });

    socket.on(`${ProtocolEvent.StreamEnd}.*`, (data: HubStreamEvent) => {
      this.commandRouter.handleStreamEvent(data);
      this.emit(BusEventEnum.StreamEnd, data);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.log('Client disconnected', { socketId: socket.id, reason });
      this.clientTracker.unregister(socket.id);
      this.commandRouter.cleanupPendingCommands(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      this.log('Socket error', { socketId: socket.id, error });
      this.emit(BusEventEnum.Error, { socketId: socket.id, error });
    });
  }

  /**
   * Create stream controller for streaming responses
   */
  private createStreamController<T>(
    commandId: string,
    client: BrowserClient
  ): AsyncGenerator<HubStreamEvent<T>> {
    const streamId = commandId;
    const events: HubStreamEvent<T>[] = [];
    let done = false;
    let resolveEnd: (() => void) | null = null;

    // Setup event listeners for this stream
    const dataHandler = (data: HubStreamEvent<T>) => {
      if (data.id === streamId) {
        events.push(data);
        if (resolveEnd) resolveEnd();
      }
    };

    const endHandler = (data: HubStreamEvent<T>) => {
      if (data.id === streamId) {
        done = true;
        if (resolveEnd) resolveEnd();
      }
    };

    const errorHandler = (data: HubStreamEvent<T>) => {
      if (data.id === streamId) {
        events.push(data);
        done = true;
        if (resolveEnd) resolveEnd();
      }
    };

    // Register handlers
    this.on(BusEventEnum.StreamData, dataHandler);
    this.on(BusEventEnum.StreamEnd, endHandler);
    this.on(BusEventEnum.StreamError, errorHandler);

    // Create async generator
    const generator = (async function* () {
      while (!done || events.length > 0) {
        if (events.length === 0) {
          await new Promise<void>((resolve) => {
            resolveEnd = resolve;
          });
        }
        while (events.length > 0) {
          yield events.shift()!;
        }
      }

      // Cleanup
      MimoBus.prototype.removeListener.call(MimoBus.prototype, BusEventEnum.StreamData, dataHandler);
      MimoBus.prototype.removeListener.call(MimoBus.prototype, BusEventEnum.StreamEnd, endHandler);
      MimoBus.prototype.removeListener.call(MimoBus.prototype, BusEventEnum.StreamError, errorHandler);
    })();

    return generator;
  }

  /**
   * Logger
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.opts.debug) {
      console.log(`[MimoBus] ${message}`, data ?? '');
    }
  }
}
