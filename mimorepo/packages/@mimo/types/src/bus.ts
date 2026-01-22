/**
 * Bus configuration types
 */

/**
 * MimoBus options
 */
export interface MimoBusOptions {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  timeout?: number;
  debug?: boolean;
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
