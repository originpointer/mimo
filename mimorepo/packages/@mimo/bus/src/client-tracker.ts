/**
 * Client Tracker - Track connected browser clients
 *
 * Manages connected browser extension/page clients and their metadata.
 */

import type { Socket } from 'socket.io';

export interface BrowserClient {
  /** Socket.IO socket instance */
  socket: Socket;
  /** Browser tab ID (optional, for multi-tab scenarios) */
  tabId?: string;
  /** Client type: extension or page */
  clientType: 'extension' | 'page';
  /** When the client connected */
  connectedAt: number;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Socket ID */
  socketId: string;
}

export interface ClientTracker {
  /** Register a new client */
  register(socket: Socket, metadata: Partial<BrowserClient>): void;
  /** Unregister a client */
  unregister(socketId: string): void;
  /** Get target client for command routing */
  getTargetClient(targetTabId?: string): BrowserClient | null;
  /** Get all connected clients */
  getAllClients(): BrowserClient[];
  /** Get client by socket ID */
  getClient(socketId: string): BrowserClient | undefined;
  /** Update client heartbeat */
  updateHeartbeat(socketId: string): void;
  /** Get client count */
  getClientCount(): number;
}

/**
 * Create a client tracker instance
 */
export function createClientTracker(): ClientTracker {
  const clients = new Map<string, BrowserClient>();

  const register = (socket: Socket, metadata: Partial<BrowserClient>): void => {
    const client: BrowserClient = {
      socket,
      tabId: metadata.tabId,
      clientType: metadata.clientType ?? 'extension',
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      socketId: socket.id,
    };

    clients.set(socket.id, client);
    console.log('[ClientTracker] Client registered', {
      socketId: socket.id,
      clientType: client.clientType,
      tabId: client.tabId,
    });
  };

  const unregister = (socketId: string): void => {
    const client = clients.get(socketId);
    if (client) {
      console.log('[ClientTracker] Client unregistered', {
        socketId,
        clientType: client.clientType,
        tabId: client.tabId,
      });
      clients.delete(socketId);
    }
  };

  const getTargetClient = (targetTabId?: string): BrowserClient | null => {
    // If no tabId specified, return first available client
    if (!targetTabId) {
      const firstClient = clients.values().next().value;
      return firstClient ?? null;
    }

    // Find client with matching tabId
    for (const client of clients.values()) {
      if (client.tabId === targetTabId) {
        return client;
      }
    }

    // No matching client found, return first available as fallback
    const firstClient = clients.values().next().value;
    return firstClient ?? null;
  };

  const getAllClients = (): BrowserClient[] => {
    return Array.from(clients.values());
  };

  const getClient = (socketId: string): BrowserClient | undefined => {
    return clients.get(socketId);
  };

  const updateHeartbeat = (socketId: string): void => {
    const client = clients.get(socketId);
    if (client) {
      client.lastHeartbeat = Date.now();
    }
  };

  const getClientCount = (): number => {
    return clients.size;
  };

  return {
    register,
    unregister,
    getTargetClient,
    getAllClients,
    getClient,
    updateHeartbeat,
    getClientCount,
  };
}
