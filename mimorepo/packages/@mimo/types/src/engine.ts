/**
 * MimoEngine configuration types
 */

import type { HubCommandRequest, HubCommandResponse, ConnectionStatus } from './protocol.js';

/**
 * Event listener function type
 */
export type EventListener = (...args: any[]) => void;

/**
 * MimoEngine configuration options
 */
export interface MimoEngineConfig {
  /** Bus server URL (default: http://localhost:6007) */
  busUrl?: string;
  /** Namespace (default: /mimo) */
  namespace?: string;
  /** Client type for identification */
  clientType?: 'extension' | 'page' | 'engine';
  /** Tab ID for routing */
  tabId?: string;
  /** Auto reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnection interval in milliseconds */
  reconnectInterval?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * MimoEngine interface
 */
export interface MimoEngine {
  /** Connect to the bus */
  connect(): Promise<void>;
  /** Disconnect from the bus */
  disconnect(): Promise<void>;
  /** Check connection status */
  isConnected(): boolean;
  /** Send command to bus */
  send<T = unknown>(command: HubCommandRequest): Promise<HubCommandResponse<T>>;
  /** Register command handler (receive from bus) */
  registerHandler(type: string, handler: (request: HubCommandRequest) => Promise<unknown>): void;
  /** Get connection status */
  getConnectionStatus(): ConnectionStatus;
  /** Get engine statistics */
  getStats(): {
    messagesSent: number;
    messagesReceived: number;
    commandsExecuted: number;
    uptime: number;
  };
  /** Add event listener */
  on(event: string, listener: EventListener): void;
  /** Remove event listener */
  off(event: string, listener: EventListener): void;
  /** Remove all event listeners */
  removeAllListeners(event?: string): void;
  /** Emit event */
  emit(event: string, ...args: any[]): boolean;
}
