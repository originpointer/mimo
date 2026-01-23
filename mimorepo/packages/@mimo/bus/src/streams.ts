/**
 * Stream handling functionality
 */

import type { Socket } from 'socket.io-client';
import type { HubCommandRequest, HubStreamEvent, MimoBusOptions } from '@mimo/types';
import { ProtocolEvent } from '@mimo/types';
import { v4 as uuidv4 } from 'uuid';
import { MimoBusNotConnectedError } from './errors.js';
import { createLogger } from './logger.js';

export interface StreamController {
  controller: ReadableStreamDefaultController<HubStreamEvent>;
  cleanup: () => void;
}

export interface StreamSendOptions {
  socket: Socket | null;
  streamControllers: Map<string, StreamController>;
  opts: MimoBusOptions;
}

/**
 * Send command and receive stream response
 */
export async function sendWithStream<T = unknown>(
  command: HubCommandRequest,
  options: StreamSendOptions
): Promise<AsyncGenerator<HubStreamEvent<T>>> {
  const { socket, streamControllers, opts } = options;
  const logger = createLogger('MimoBus', opts);

  if (!socket?.connected) {
    throw new MimoBusNotConnectedError();
  }

  const commandId = command.id || uuidv4();
  command.id = commandId;
  command.timestamp = command.timestamp || Date.now();

  logger('sending stream command', { level: 2, command: command.type, id: commandId });

  const stream = new ReadableStream<HubStreamEvent<T>>({
    start: (controller) => {
      const cleanup = () => {
        socket.off(`${ProtocolEvent.StreamData}.${commandId}`, dataHandler);
        socket.off(`${ProtocolEvent.StreamError}.${commandId}`, errorHandler);
        socket.off(`${ProtocolEvent.StreamEnd}.${commandId}`, endHandler);
      };

      const dataHandler = (data: T) => {
        controller.enqueue({ id: commandId, type: 'data', data });
      };

      const errorHandler = (error: string) => {
        controller.enqueue({ id: commandId, type: 'error', error });
        cleanup();
      };

      const endHandler = () => {
        controller.enqueue({ id: commandId, type: 'end' });
        controller.close();
        cleanup();
      };

      socket.on(`${ProtocolEvent.StreamData}.${commandId}`, dataHandler);
      socket.on(`${ProtocolEvent.StreamError}.${commandId}`, errorHandler);
      socket.on(`${ProtocolEvent.StreamEnd}.${commandId}`, endHandler);

      streamControllers.set(commandId, { controller, cleanup });

      // Send the command
      socket.emit(ProtocolEvent.StreamStart, command);
    },
    cancel: () => {
      const controller = streamControllers.get(commandId);
      if (controller) {
        controller.cleanup();
        streamControllers.delete(commandId);
      }
    },
  });

  const reader = stream.getReader();
  const iterator: AsyncGenerator<HubStreamEvent<T>> = {
    async next(): Promise<IteratorResult<HubStreamEvent<T>>> {
      const { done, value } = await reader.read();
      return done ? { done: true, value: undefined as any } : { done: false, value };
    },
    async return(): Promise<IteratorResult<any>> {
      reader.releaseLock();
      return { done: true, value: undefined };
    },
    async throw(err: unknown): Promise<IteratorResult<any>> {
      reader.releaseLock();
      throw err;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  } as AsyncGenerator<HubStreamEvent<T>>;

  return iterator;
}
