/**
 * Connection management for MimoBus
 */

import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { MimoBusOptions } from '@mimo/types';
import { BusEvent } from '@mimo/types';
import type EventEmitter from 'eventemitter3';
import {
  MimoBusTimeoutError,
  MimoBusConnectionError,
} from './errors.js';
import { createLogger } from './logger.js';

export interface ConnectionDependencies {
  emitter: EventEmitter;
  opts: MimoBusOptions;
  existingSocket: Socket | null;
}

/**
 * Connect to Socket.IO server
 */
export async function connect(deps: ConnectionDependencies): Promise<Socket> {
  const { emitter, opts, existingSocket } = deps;
  const logger = createLogger('MimoBus', opts);

  // Check if already connected
  if (existingSocket?.connected) {
    logger('already connected', { level: 1 });
    return existingSocket;
  }

  return new Promise<Socket>((resolve, reject) => {
    // Parse URL to extract server URL and path
    const urlObj = new URL(opts.url!);
    const serverUrl = `${urlObj.protocol}//${urlObj.host}`;
    const path = urlObj.pathname || '/socket.io/';

    logger('Connecting to Hub', { level: 1, serverUrl, path });

    const socket = io(serverUrl, {
      path,
      autoConnect: true,
      reconnection: opts.autoReconnect,
      reconnectionDelay: opts.reconnectInterval,
      timeout: opts.timeout,
    });

    const timeoutTimer = setTimeout(() => {
      socket.disconnect();
      reject(new MimoBusTimeoutError('Connection timeout', opts.timeout!));
    }, opts.timeout);

    socket.once('connect', () => {
      clearTimeout(timeoutTimer);
      emitter.emit(BusEvent.Connected);
      logger('connected to Hub', { level: 1 });
      resolve(socket);
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timeoutTimer);
      reject(new MimoBusConnectionError(error.message));
    });
  });
}

/**
 * Disconnect from Socket.IO server
 */
export function disconnect(
  socket: Socket | null,
  emitter: EventEmitter,
  opts: MimoBusOptions
): void {
  const logger = createLogger('MimoBus', opts);

  if (socket) {
    socket.disconnect();
    emitter.emit(BusEvent.Disconnected, { reason: 'manual' });
    logger('disconnected from Hub', { level: 1 });
  }
}

/**
 * Check if connected
 */
export function isConnected(socket: Socket | null): boolean {
  return socket?.connected ?? false;
}
