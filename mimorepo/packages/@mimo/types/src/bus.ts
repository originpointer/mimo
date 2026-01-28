/**
 * Bus configuration types
 */

/**
 * MimoBus options
 */
export interface MimoBusOptions {
  url?: string;
  port?: number; // Server mode: port to listen on
  autoReconnect?: boolean;
  reconnectInterval?: number;
  timeout?: number;
  debug?: boolean;
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Heartbeat timeout in milliseconds (default: 90000) */
  heartbeatTimeout?: number;
  /** Enable heartbeat monitoring (default: true) */
  enableHeartbeat?: boolean;
  /** Callback when heartbeat fails */
  onHeartbeatFail?: (socketId: string) => void;
  /** Callback when client is marked stale */
  onClientStale?: (socketId: string, lastHeartbeat: number) => void;
  /** Log level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' (default: 'info') */
  logLevel?: string;
  /** Directory for log files (default: './logs') */
  logDir?: string;
  /** Enable connection statistics tracking (default: true) */
  enableConnectionStats?: boolean;
}

/**
 * Tab information
 */
export interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
}
