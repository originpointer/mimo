/**
 * MimoBus Server - Socket.IO Server Implementation
 *
 * This module provides a Socket.IO server that runs in the Nitro server
 * and receives connections from browser clients (extensions/pages).
 *
 * Architecture:
 *   Nitro Server → MimoBus Server → Socket.IO → Browser Extension
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import type { Server as HTTPServer } from 'http';
import type { Socket } from 'socket.io';

export interface MimoBusServerConfig {
  /** Port to listen on (default: 6007) */
  port?: number;
  /** Socket.IO path (default: /socket.io/) */
  path?: string;
  /** CORS configuration */
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    credentials?: boolean;
  };
  /** Enable debug logging */
  debug?: boolean;
}

export interface MimoBusServer {
  /** Socket.IO server instance */
  io: SocketIOServer;
  /** HTTP server instance */
  httpServer: HTTPServer;
  /** Server configuration */
  config: MimoBusServerConfig;
  /** Start the server */
  start(): Promise<void>;
  /** Stop the server */
  stop(): Promise<void>;
  /** Get the /mimo namespace */
  getMimoNamespace(): SocketIOServer;
  /** Log debug message */
  log(message: string, data?: unknown): void;
}

/**
 * Create a MimoBus Socket.IO server
 */
export function createMimoBusServer(config: MimoBusServerConfig = {}): MimoBusServer {
  const serverConfig: MimoBusServerConfig = {
    port: config.port ?? 6007,
    path: config.path ?? '/socket.io/',
    cors: config.cors ?? { origin: '*' },
    debug: config.debug ?? false,
  };

  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: serverConfig.cors,
    path: serverConfig.path,
  });

  const log = (message: string, data?: unknown) => {
    if (serverConfig.debug) {
      console.log(`[MimoBusServer] ${message}`, data ?? '');
    }
  };

  const start = async (): Promise<void> => {
    return new Promise((resolve) => {
      httpServer.listen(serverConfig.port, () => {
        log('Server listening', { port: serverConfig.port });
        resolve();
      });
    });
  };

  const stop = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Force close all socket connections first
      io.close(() => {
        // Close all existing connections forcefully
        httpServer.closeAllConnections();

        // Then close the HTTP server with a timeout
        const timeout = setTimeout(() => {
          httpServer.destroy();
          log('Server forcefully closed (timeout)');
          resolve();
        }, 5000); // 5 second timeout

        httpServer.close(() => {
          clearTimeout(timeout);
          log('Server stopped');
          resolve();
        });
      });
    });
  };

  const getMimoNamespace = (): SocketIOServer => {
    return io.of('/mimo');
  };

  return {
    io,
    httpServer,
    config: serverConfig,
    start,
    stop,
    getMimoNamespace,
    log,
  };
}
