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
import type { HubCommandRequest, HubCommandResponse, HubStreamEvent, MimoBusOptions, HeartbeatPing, HeartbeatPong } from '@mimo/types';
import { BusEvent } from '@mimo/types';
import { ProtocolEvent, BusEvent as BusEventEnum } from '@mimo/types';
import { createMimoBusServer, type MimoBusServer } from './server.js';
import { createClientTracker, type ClientTracker, type BrowserClient } from './client-tracker.js';
import { createCommandRouter, type CommandRouter } from './command-router.js';
import { createHeartbeatMonitor, type HeartbeatMonitor } from './heartbeat-monitor.js';
import { MimoBusNotConnectedError, MimoBusTimeoutError } from './errors.js';
import { createLogger } from './logger.js';
import { createConnectionStatsTracker, type ConnectionStats, type ConnectionStatsTracker } from './connection-stats.js';
import { v4 as uuidv4 } from 'uuid';
import type pino from 'pino';

export class MimoBus extends EventEmitter {
  private server: MimoBusServer;
  private clientTracker: ClientTracker;
  private commandRouter: CommandRouter;
  private heartbeatMonitor: HeartbeatMonitor;
  private connectionStats: ConnectionStatsTracker;
  private logger: pino.Logger;
  private opts: MimoBusOptions;
  private isConnectedFlag = false;
  private statsLoggingInterval: NodeJS.Timeout | null = null;

  constructor(opts: MimoBusOptions = {}) {
    super();
    this.opts = {
      url: opts.url, // Keep for compatibility, but not used in server mode
      port: opts.port ?? 6007,
      autoReconnect: opts.autoReconnect ?? true,
      reconnectInterval: opts.reconnectInterval ?? 1000,
      timeout: opts.timeout ?? 30000,
      debug: opts.debug ?? false,
      enableHeartbeat: opts.enableHeartbeat ?? true,
      heartbeatInterval: opts.heartbeatInterval ?? 30000,
      heartbeatTimeout: opts.heartbeatTimeout ?? 90000,
      onHeartbeatFail: opts.onHeartbeatFail ?? (() => {}),
      onClientStale: opts.onClientStale ?? (() => {}),
      logLevel: opts.logLevel ?? 'info',
      logDir: opts.logDir ?? '/Users/sodaabe/codes/coding/mimo/mimorepo/apps/nitro-app/.data/logs',
      enableConnectionStats: opts.enableConnectionStats ?? true,
    };

    // Create logger
    this.logger = createLogger({
      level: this.opts.logLevel,
      logDir: this.opts.logDir,
      prettyPrint: this.opts.debug,
    });

    // Create Socket.IO server
    this.server = createMimoBusServer({
      port: this.opts.port,
      debug: this.opts.debug,
    });

    // Create client tracker
    this.clientTracker = createClientTracker();

    // Create command router
    this.commandRouter = createCommandRouter(this.clientTracker);

    // Create connection stats tracker
    this.connectionStats = createConnectionStatsTracker();

    // Create heartbeat monitor
    this.heartbeatMonitor = createHeartbeatMonitor(this.clientTracker, {
      enabled: this.opts.enableHeartbeat!,
      checkInterval: Math.min(this.opts.heartbeatInterval! / 3, 10000), // Check at least every 10s
      staleThreshold: this.opts.heartbeatTimeout!,
      onClientStale: (client) => {
        this.opts.onClientStale!(client.socketId, client.lastHeartbeat);
        this.emit(BusEvent.Error, {
          socketId: client.socketId,
          error: `Client stale: no heartbeat for ${Date.now() - client.lastHeartbeat}ms`,
        });
      },
      onClientTimeout: (client) => {
        this.logger.warn({ socketId: client.socketId }, 'Client timeout - disconnecting');
        this.clientTracker.unregister(client.socketId);
        this.commandRouter.cleanupPendingCommands(client.socketId);
      },
    });

    this.logger.info({ port: this.opts.port }, 'MimoBus initialized');
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

    // Start heartbeat monitor
    this.heartbeatMonitor.start();

    // Start periodic stats logging
    this.startStatsLogging();

    this.isConnectedFlag = true;
    this.logger.info({ port: this.opts.port, event: 'server:start' }, 'Server started and listening for connections');
    this.emit(BusEventEnum.Connected, { port: this.opts.port });
  }

  /**
   * Disconnect from Socket.IO server (stop the server)
   */
  async disconnect(): Promise<void> {
    this.stopStatsLogging();
    this.heartbeatMonitor.stop();
    await this.server.stop();
    this.isConnectedFlag = false;
    this.logger.info({ event: 'server:stop' }, 'Server stopped');
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

    const targetClient = this.clientTracker.getTargetClient(command.options?.tabId);
    if (targetClient) {
      this.connectionStats.trackCommandSent(targetClient.socketId);
    }

    this.logger.info({ id: commandId, type: command.type, tabId: command.options?.tabId, event: 'command:sent' }, 'Sending command');
    this.emit(BusEventEnum.CommandSent, { command });

    try {
      const response = await this.commandRouter.sendCommand(
        command,
        command.options?.timeout ?? this.opts.timeout!
      );

      if (targetClient) {
        this.connectionStats.trackCommandReceived(targetClient.socketId);
      }

      this.emit(BusEventEnum.CommandResult, { id: commandId, response });

      return response as HubCommandResponse<T>;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        if (targetClient) {
          this.connectionStats.trackError(targetClient.socketId, error);
        }
        this.logger.warn({ id: commandId, timeout: command.options?.timeout ?? this.opts.timeout!, event: 'command:timeout' }, 'Command timeout');
        throw new MimoBusTimeoutError(
          `Command ${commandId} timeout`,
          command.options?.timeout ?? this.opts.timeout!
        );
      }
      if (targetClient) {
        this.connectionStats.trackError(targetClient.socketId, error as Error);
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

    this.logger.info({ id: commandId, type: command.type, event: 'command:sent' }, 'Sending stream command');

    const targetClient = this.clientTracker.getTargetClient(command.options?.tabId);

    if (!targetClient) {
      throw new Error('No available browser client for stream command');
    }

    // Track command sent
    this.connectionStats.trackCommandSent(targetClient.socketId);

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

    // Stop stats logging
    this.stopStatsLogging();

    // Stop heartbeat monitor
    this.heartbeatMonitor.stop();

    // Stop server
    this.server.stop();

    // Clear pending commands
    for (const client of this.clientTracker.getAllClients()) {
      this.commandRouter.cleanupPendingCommands(client.socketId);
    }

    this.isConnectedFlag = false;
    this.logger.info({ event: 'server:destroy' }, 'MimoBus destroyed');
  }

  /**
   * Get heartbeat monitor status
   */
  getHeartbeatStatus() {
    return this.heartbeatMonitor.getStatus();
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

    // Track connection in stats
    const client = this.clientTracker.getClient(socket.id);
    if (client) {
      this.connectionStats.trackConnection(socket.id, client);
    }

    this.logger.info({ socketId: socket.id, clientType, tabId, event: 'client:connect' }, 'Client connected');

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now(),
    });

    // Handle heartbeat ping
    socket.on(ProtocolEvent.HeartbeatPing, (ping: HeartbeatPing) => {
      this.clientTracker.updateHeartbeat(socket.id);

      const rtt = Date.now() - ping.timestamp;

      // Track heartbeat in stats
      this.connectionStats.trackHeartbeat(socket.id, rtt);

      // Send pong
      socket.emit(ProtocolEvent.HeartbeatPong, {
        serverTimestamp: Date.now(),
        clientTimestamp: ping.timestamp,
        rtt,
      } as HeartbeatPong);

      this.logger.debug({ socketId: socket.id, rtt, event: 'heartbeat' }, 'Heartbeat received');
    });

    // Handle client going away
    socket.on(ProtocolEvent.ClientGoingAway, (data) => {
      this.logger.info({ socketId: socket.id, event: 'client:disconnect', reason: 'going_away' }, 'Client going away');
      this.connectionStats.trackDisconnection(socket.id, 'going_away');
      this.clientTracker.unregister(socket.id);
      this.commandRouter.cleanupPendingCommands(socket.id);
    });

    // Handle command responses
    socket.on(ProtocolEvent.CommandResponse, (response: HubCommandResponse) => {
      this.connectionStats.trackCommandReceived(socket.id);
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
      this.logger.info({ socketId: socket.id, reason, event: 'client:disconnect' }, 'Client disconnected');
      this.connectionStats.trackDisconnection(socket.id, reason);
      this.clientTracker.unregister(socket.id);
      this.commandRouter.cleanupPendingCommands(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      this.logger.error({ socketId: socket.id, error, event: 'error' }, 'Socket error');
      this.connectionStats.trackError(socket.id, error as Error);
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
   * Get connection statistics for all clients (including disconnected)
   */
  getConnectionStats(): ConnectionStats[] {
    return this.connectionStats.getAllStats();
  }

  /**
   * Get connection statistics summary
   */
  getStatsSummary() {
    return this.connectionStats.getSummary();
  }

  /**
   * Get statistics for a specific socket
   */
  getSocketStats(socketId: string): ConnectionStats | undefined {
    return this.connectionStats.getStats(socketId);
  }

  /**
   * Start periodic stats logging
   */
  private startStatsLogging(): void {
    if (this.statsLoggingInterval) {
      return; // Already started
    }

    // Log stats every 60 seconds
    this.statsLoggingInterval = setInterval(() => {
      const summary = this.connectionStats.getSummary();
      this.logger.info({
        event: 'stats:summary',
        ...summary,
      }, 'Connection stats summary');

      // Cleanup old stats (older than 7 days)
      this.connectionStats.cleanup();
    }, 60000);
  }

  /**
   * Stop periodic stats logging
   */
  private stopStatsLogging(): void {
    if (this.statsLoggingInterval) {
      clearInterval(this.statsLoggingInterval);
      this.statsLoggingInterval = null;
    }
  }
}
