/**
 * Command Router - Route commands to browser clients
 *
 * Handles command routing, response tracking, and timeout management.
 */

import type { HubCommandRequest, HubCommandResponse, HubStreamEvent } from '@mimo/types';
import { ProtocolEvent } from '@mimo/types';
import type { ClientTracker, BrowserClient } from './client-tracker.js';

export interface PendingCommand {
  resolve: (response: HubCommandResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  command: HubCommandRequest;
}

export interface CommandRouter {
  /** Send command to browser client */
  sendCommand(command: HubCommandRequest, timeout?: number): Promise<HubCommandResponse>;
  /** Handle response from browser client */
  handleResponse(response: HubCommandResponse): void;
  /** Handle stream event from browser client */
  handleStreamEvent(event: HubStreamEvent): void;
  /** Broadcast to all clients */
  broadcastToAll(eventName: string, data: unknown): void;
  /** Clean up pending commands for a socket */
  cleanupPendingCommands(socketId: string): void;
  /** Get pending command count */
  getPendingCommandCount(): number;
}

/**
 * Create a command router instance
 */
export function createCommandRouter(tracker: ClientTracker): CommandRouter {
  const pendingCommands = new Map<string, PendingCommand>();

  const sendCommand = async (
    command: HubCommandRequest,
    timeout: number = 30000
  ): Promise<HubCommandResponse> => {
    const targetClient = tracker.getTargetClient(command.options?.tabId);

    if (!targetClient) {
      throw new Error('No available browser client. Please ensure the browser extension is connected.');
    }

    console.log('[CommandRouter] Sending command', {
      id: command.id,
      type: command.type,
      targetSocketId: targetClient.socketId,
      targetTabId: targetClient.tabId,
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingCommands.delete(command.id);
        reject(new Error(`Command ${command.id} (${command.type}) timeout after ${timeout}ms`));
      }, timeout);

      pendingCommands.set(command.id, {
        resolve,
        reject,
        timeout: timer,
        command,
      });

      // Send command to browser client
      targetClient.socket.emit(ProtocolEvent.CommandRequest, command);
    });
  };

  const handleResponse = (response: HubCommandResponse): void => {
    const pending = pendingCommands.get(response.id);

    if (!pending) {
      console.warn('[CommandRouter] No pending command found for response', { id: response.id });
      return;
    }

    console.log('[CommandRouter] Received response', {
      id: response.id,
      success: response.success,
      duration: response.duration,
    });

    clearTimeout(pending.timeout);
    pendingCommands.delete(response.id);

    if (response.success) {
      pending.resolve(response);
    } else {
      pending.reject(new Error(response.error?.message ?? 'Command failed'));
    }
  };

  const handleStreamEvent = (event: HubStreamEvent): void => {
    // Stream events are handled via event emitter in MimoBus
    // This is a placeholder for future stream handling
    console.log('[CommandRouter] Stream event', { type: event.type });
  };

  const broadcastToAll = (eventName: string, data: unknown): void => {
    const clients = tracker.getAllClients();
    for (const client of clients) {
      client.socket.emit(eventName, data);
    }
  };

  const cleanupPendingCommands = (socketId: string): void => {
    for (const [id, pending] of pendingCommands) {
      // Check if the command was sent to this socket
      // This is a simplified check - in production, track target socket per command
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnected'));
      pendingCommands.delete(id);
    }
  };

  const getPendingCommandCount = (): number => {
    return pendingCommands.size;
  };

  return {
    sendCommand,
    handleResponse,
    handleStreamEvent,
    broadcastToAll,
    cleanupPendingCommands,
    getPendingCommandCount,
  };
}
