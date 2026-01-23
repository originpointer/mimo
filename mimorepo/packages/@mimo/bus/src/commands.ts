/**
 * Command sending functionality
 */

import type { Socket } from 'socket.io-client';
import type { HubCommandRequest, HubCommandResponse, MimoBusOptions } from '@mimo/types';
import { ProtocolEvent, BusEvent } from '@mimo/types';
import type EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { MimoBusNotConnectedError, MimoBusTimeoutError, MimoBusCommandError } from './errors.js';
import { createLogger } from './logger.js';

export interface PendingCommand {
  resolve: (response: HubCommandResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface CommandSendOptions {
  socket: Socket | null;
  pendingCommands: Map<string, PendingCommand>;
  emitter: EventEmitter;
  opts: MimoBusOptions;
}

/**
 * Send command and wait for response
 */
export async function send<T = unknown>(
  command: HubCommandRequest,
  options: CommandSendOptions
): Promise<HubCommandResponse<T>> {
  const { socket, pendingCommands, emitter, opts } = options;
  const logger = createLogger('MimoBus', opts);

  if (!socket?.connected) {
    throw new MimoBusNotConnectedError();
  }

  const commandId = command.id || uuidv4();
  command.id = commandId;
  command.timestamp = command.timestamp || Date.now();

  logger('sending command', { level: 2, command: command.type, id: commandId });

  return new Promise<HubCommandResponse<T>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(commandId);
      reject(new MimoBusTimeoutError(
        `Command ${commandId} timeout`,
        command.options?.timeout ?? opts.timeout!
      ));
    }, command.options?.timeout ?? opts.timeout);

    pendingCommands.set(commandId, {
      resolve: resolve as any,
      reject,
      timeout,
    });

    socket.emit(ProtocolEvent.CommandRequest, command);
    emitter.emit(BusEvent.CommandSent, { command });
  });
}

/**
 * Resolve a pending command with response
 */
export function resolvePendingCommand(
  pendingCommands: Map<string, PendingCommand>,
  response: HubCommandResponse,
  emitter: EventEmitter
): void {
  const pending = pendingCommands.get(response.id);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingCommands.delete(response.id);

    if (response.success) {
      pending.resolve(response);
      emitter.emit(BusEvent.CommandResult, { id: response.id, response });
    } else {
      pending.reject(new MimoBusCommandError(
        response.error?.message ?? 'Command failed',
        response.id,
        {} as HubCommandRequest
      ));
    }
  }
}
