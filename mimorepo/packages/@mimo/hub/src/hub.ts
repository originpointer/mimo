/**
 * Socket.IO Hub for server command relay
 */

import type { Server as SocketIOServer } from 'socket.io';

export interface HubConfig {
  /** Socket.IO server instance */
  io: SocketIOServer;
  /** Namespace for the hub (default: '/mimo') */
  namespace?: string;
}

export class Hub {
  private io: SocketIOServer;
  private namespace: string;

  constructor(config: HubConfig) {
    this.io = config.io;
    this.namespace = config.namespace || '/mimo';
  }

  /**
   * Initialize the hub and start listening for connections
   */
  initialize(): void {
    const nsp = this.io.of(this.namespace);

    nsp.on('connection', (socket) => {
      console.log(`[Hub] Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[Hub] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Get the namespace for this hub
   */
  getNamespace(): string {
    return this.namespace;
  }
}
