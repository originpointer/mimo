/**
 * Socket.IO event handlers
 */

import type { Socket } from 'socket.io-client';
import type { HubCommandResponse, MimoBusOptions } from '@mimo/types';
import { ProtocolEvent, BusEvent } from '@mimo/types';
import type EventEmitter from 'eventemitter3';
import type { PendingCommand } from './commands.js';
import { resolvePendingCommand } from './commands.js';
import type { StreamController } from './streams.js';
import { createLogger } from './logger.js';

export interface HandlerDependencies {
  socket: Socket;
  pendingCommands: Map<string, PendingCommand>;
  streamControllers: Map<string, StreamController>;
  emitter: EventEmitter;
  opts: MimoBusOptions;
}

/**
 * Setup Socket.IO event handlers
 */
export function setupEventHandlers(deps: HandlerDependencies): void {
  const { socket, pendingCommands, streamControllers, emitter, opts } = deps;
  const logger = createLogger('MimoBus', opts);

  // Command response handler
  socket.on(ProtocolEvent.CommandResponse, (response: HubCommandResponse) => {
    resolvePendingCommand(pendingCommands, response, emitter);
    logger('received response', { level: 2, id: response.id, success: response.success });
  });

  // Stream data handler
  socket.on(ProtocolEvent.StreamData, ({ id, data }: { id: string; data: unknown }) => {
    const controller = streamControllers.get(id);
    if (controller) {
      controller.controller.enqueue({ id, type: 'data', data });
      emitter.emit(BusEvent.StreamData, { id, data });
    }
  });

  // Stream error handler
  socket.on(ProtocolEvent.StreamError, ({ id, error }: { id: string; error: string }) => {
    const controller = streamControllers.get(id);
    if (controller) {
      controller.controller.enqueue({ id, type: 'error', error });
      emitter.emit(BusEvent.StreamError, { id, error });
    }
  });

  // Stream end handler
  socket.on(ProtocolEvent.StreamEnd, ({ id }: { id: string }) => {
    const controller = streamControllers.get(id);
    if (controller) {
      controller.controller.enqueue({ id, type: 'end' });
      controller.controller.close();
      controller.cleanup();
      streamControllers.delete(id);
      emitter.emit(BusEvent.StreamEnd, { id });
    }
  });

  // Disconnect handler
  socket.on('disconnect', (reason) => {
    emitter.emit(BusEvent.Disconnected, { reason });
    logger('disconnected', { level: 1, reason });
  });

  // Error handler
  socket.on('error', (error) => {
    emitter.emit(BusEvent.Error, { error });
    logger('socket error', { level: 0, error });
  });
}
