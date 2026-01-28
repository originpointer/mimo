/**
 * MimoEngine - Socket.IO client for @mimo/bus connection
 *
 * Manages bidirectional communication with MimoBus server,
 * heartbeat mechanism, and command routing.
 */

import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  MimoEngineConfig,
  MimoEngine as IMimoEngine,
} from '@mimo/types';
import {
  ProtocolEvent,
  HubCommandRequest,
  HubCommandResponse,
  HeartbeatPing,
  ConnectionStatus,
  BusEvent,
} from '@mimo/types';
import { MessageHandler } from './message-handler.js';

export class MimoEngine extends EventEmitter implements IMimoEngine {
  private socket: Socket;
  private config: Required<MimoEngineConfig>;
  private connectionStatus: ConnectionStatus;
  private heartbeatTimer?: NodeJS.Timeout;
  private heartbeatMissedCount = 0;
  private commandHandlers = new Map<string, (request: HubCommandRequest) => Promise<unknown>>();
  private pendingCommands = new Map<string, {
    resolve: (response: HubCommandResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  // Statistics
  private stats = {
    messagesSent: 0,
    messagesReceived: 0,
    commandsExecuted: 0,
    connectedAt: 0,
  };

  constructor(config: MimoEngineConfig = {}) {
    super();

    this.config = {
      busUrl: config.busUrl ?? 'http://localhost:6007',
      namespace: config.namespace ?? '/mimo',
      clientType: config.clientType ?? 'engine',
      tabId: config.tabId ?? '',
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 1000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      debug: config.debug ?? false,
    };

    this.connectionStatus = {
      socketId: '',
      state: 'disconnected',
      lastHeartbeat: 0,
      heartbeatInterval: this.config.heartbeatInterval,
      quality: 1.0,
    };

    this.socket = io(`${this.config.busUrl}${this.config.namespace}`, {
      autoConnect: false,
      reconnection: this.config.autoReconnect,
      reconnectionDelay: this.config.reconnectInterval,
      transports: ['websocket'], // Force WebSocket only (no xhr-polling for service worker compatibility)
      auth: {
        clientType: this.config.clientType,
        tabId: this.config.tabId,
      },
    });

    this.setupSocketHandlers();
  }

  /**
   * Connect to the MimoBus server
   */
  async connect(): Promise<void> {
    if (this.connectionStatus.state === 'connected') {
      this.log('Already connected');
      return;
    }

    this.connectionStatus.state = 'connecting';
    this.log('Connecting to bus', { url: this.config.busUrl });

    return new Promise((resolve, reject) => {
      const onConnect = () => {
        this.connectionStatus.socketId = this.socket.id || '';
        this.connectionStatus.state = 'connected';
        this.stats.connectedAt = Date.now();

        this.startHeartbeat();
        this.emit(BusEvent.Connected);
        this.log('Connected', { socketId: this.socket.id });

        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        this.connectionStatus.state = 'disconnected';
        this.emit(BusEvent.Error, { error });
        this.log('Connection error', error);

        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        reject(error);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
      this.socket.connect();
    });
  }

  /**
   * Disconnect from the MimoBus server
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    // Notify server we're going away
    this.socket.emit(ProtocolEvent.ClientGoingAway, {
      socketId: this.socket.id,
      timestamp: Date.now(),
    });

    this.socket.disconnect();

    this.connectionStatus.state = 'disconnected';
    this.connectionStatus.lastHeartbeat = 0;
    this.emit(BusEvent.Disconnected, { reason: 'client_initiated' });

    // Clean up pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Disconnected'));
    }
    this.pendingCommands.clear();

    this.log('Disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionStatus.state === 'connected' && this.socket.connected;
  }

  /**
   * Send command to bus
   */
  async send<T = unknown>(command: HubCommandRequest): Promise<HubCommandResponse<T>> {
    if (!this.isConnected()) {
      throw new Error('Not connected to MimoBus');
    }

    const commandId = command.id || uuidv4();
    command.id = commandId;
    command.timestamp = command.timestamp || Date.now();

    this.log('Sending command', { id: commandId, type: command.type });
    this.emit(BusEvent.CommandSent, { command });
    this.stats.messagesSent++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Command ${commandId} timeout`));
      }, 30000);

      this.pendingCommands.set(commandId, { resolve, reject, timeout });
      this.socket.emit(ProtocolEvent.CommandRequest, command);
    });
  }

  /**
   * Register command handler (for receiving commands from bus)
   */
  registerHandler(
    type: string,
    handler: (request: HubCommandRequest) => Promise<unknown>
  ): void {
    this.commandHandlers.set(type, handler);
    this.log('Handler registered', { type });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.stats.connectedAt > 0 ? Date.now() - this.stats.connectedAt : 0,
    };
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    // Handle command responses
    this.socket.on(ProtocolEvent.CommandResponse, (response: HubCommandResponse) => {
      this.stats.messagesReceived++;
      const pending = this.pendingCommands.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(response.id);
        pending.resolve(response);
        this.emit(BusEvent.CommandResult, { id: response.id, response });
        this.log('Command response received', { id: response.id });
      }
    });

    // Handle incoming command requests (from bus to engine)
    this.socket.on(ProtocolEvent.CommandRequest, async (request: HubCommandRequest) => {
      this.stats.messagesReceived++;
      this.log('Command request received', { id: request.id, type: request.type });

      // Route to MessageHandler (which routes to CommandExecutor)
      try {
        const result = await MessageHandler.routeCommand(request);
        this.stats.commandsExecuted++;

        // Send response back
        const response: HubCommandResponse = {
          id: request.id,
          success: true,
          data: result,
          timestamp: Date.now(),
        };

        this.socket.emit(ProtocolEvent.CommandResponse, response);
        this.log('Command executed', { id: request.id });
      } catch (error) {
        const response: HubCommandResponse = {
          id: request.id,
          success: false,
          error: {
            code: 'COMMAND_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
        };

        this.socket.emit(ProtocolEvent.CommandResponse, response);
        this.log('Command error', { id: request.id, error });
      }
    });

    // Handle heartbeat pong
    this.socket.on(ProtocolEvent.HeartbeatPong, (pong: HeartbeatPong) => {
      this.connectionStatus.lastHeartbeat = Date.now();
      this.heartbeatMissedCount = 0;

      // Calculate connection quality based on RTT
      const rtt = pong.rtt;
      this.connectionStatus.quality = Math.max(0, 1 - (rtt / 1000)); // Degraded after 1s RTT

      this.log('Heartbeat acknowledged', { rtt, quality: this.connectionStatus.quality });
    });

    // Handle disconnect
    this.socket.on('disconnect', (reason) => {
      this.stopHeartbeat();
      this.connectionStatus.state = 'disconnected';
      this.emit(BusEvent.Disconnected, { reason });
      this.log('Disconnected', { reason });
    });

    // Handle reconnect
    this.socket.on('reconnect', () => {
      this.connectionStatus.socketId = this.socket.id || '';
      this.connectionStatus.state = 'connected';
      this.startHeartbeat();
      this.emit(BusEvent.Connected);
      this.log('Reconnected', { socketId: this.socket.id });
    });

    // Handle errors
    this.socket.on('error', (error) => {
      this.emit(BusEvent.Error, { error });
      this.log('Socket error', error);
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.socket.connected) {
        return;
      }

      const ping: HeartbeatPing = {
        socketId: this.socket.id || '',
        timestamp: Date.now(),
        status: 'active',
      };

      this.socket.emit(ProtocolEvent.HeartbeatPing, ping);
      this.heartbeatMissedCount++;

      this.log('Heartbeat sent', { missedCount: this.heartbeatMissedCount });

      // Check for heartbeat timeout (3x interval)
      const maxMissed = Math.floor(90000 / this.config.heartbeatInterval);
      if (this.heartbeatMissedCount > maxMissed) {
        this.log('Heartbeat timeout - reconnecting');
        this.socket.disconnect();
        this.socket.connect();
      }
    }, this.config.heartbeatInterval);

    this.log('Heartbeat started', { interval: this.config.heartbeatInterval });
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      this.log('Heartbeat stopped');
    }
  }

  /**
   * Logger
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[MimoEngine] ${message}`, data ?? '');
    }
  }

  /**
   * Destroy engine instance
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.commandHandlers.clear();
  }
}
