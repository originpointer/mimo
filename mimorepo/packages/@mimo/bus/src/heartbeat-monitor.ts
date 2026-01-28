/**
 * Heartbeat Monitor - Server-side heartbeat monitoring and stale client detection
 *
 * Periodically checks connected clients for heartbeat activity
 * and triggers callbacks when clients become stale or timeout.
 */

import type { ClientTracker, BrowserClient } from './client-tracker.js';

export interface HeartbeatMonitorConfig {
  /** Check interval in milliseconds (default: 10000) */
  checkInterval?: number;
  /** Stale threshold in milliseconds (default: 90000) */
  staleThreshold?: number;
  /** Enable monitoring (default: true) */
  enabled?: boolean;
  /** Callback when client is marked stale */
  onClientStale?: (client: BrowserClient) => void;
  /** Callback when client times out and should disconnect */
  onClientTimeout?: (client: BrowserClient) => void;
}

export interface HeartbeatMonitor {
  /** Start monitoring */
  start(): void;
  /** Stop monitoring */
  stop(): void;
  /** Force check all clients */
  check(): void;
  /** Get stale clients */
  getStaleClients(): BrowserClient[];
  /** Get monitoring status */
  getStatus(): {
    enabled: boolean;
    active: boolean;
    staleCount: number;
    totalClients: number;
  };
}

/**
 * Create heartbeat monitor
 *
 * @param tracker - ClientTracker instance to monitor
 * @param config - Monitor configuration
 * @returns HeartbeatMonitor instance
 *
 * @example
 * ```typescript
 * const monitor = createHeartbeatMonitor(tracker, {
 *   checkInterval: 10000,
 *   staleThreshold: 90000,
 *   enabled: true,
 *   onClientStale: (client) => {
 *     console.warn(`Stale client: ${client.socketId}`);
 *   },
 *   onClientTimeout: (client) => {
 *     console.error(`Timeout client: ${client.socketId}`);
 *     client.socket.disconnect();
 *   },
 * });
 *
 * monitor.start();
 * ```
 */
export function createHeartbeatMonitor(
  tracker: ClientTracker,
  config: HeartbeatMonitorConfig = {}
): HeartbeatMonitor {
  const monitorConfig: Required<HeartbeatMonitorConfig> = {
    checkInterval: config.checkInterval ?? 10000, // Check every 10s
    staleThreshold: config.staleThreshold ?? 90000, // 90s without heartbeat = stale
    enabled: config.enabled ?? true,
    onClientStale: config.onClientStale ?? (() => {}),
    onClientTimeout: config.onClientTimeout ?? (() => {}),
  };

  let timer: NodeJS.Timeout | undefined;
  let active = false;

  const start = (): void => {
    if (!monitorConfig.enabled || active) {
      return;
    }

    active = true;
    timer = setInterval(check, monitorConfig.checkInterval);
    console.log('[HeartbeatMonitor] Started', {
      interval: monitorConfig.checkInterval,
      threshold: monitorConfig.staleThreshold,
    });
  };

  const stop = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    active = false;
    console.log('[HeartbeatMonitor] Stopped');
  };

  const check = (): void => {
    const now = Date.now();
    const clients = tracker.getAllClients();
    let staleCount = 0;

    for (const client of clients) {
      const timeSinceHeartbeat = now - client.lastHeartbeat;

      if (timeSinceHeartbeat > monitorConfig.staleThreshold) {
        staleCount++;
        console.warn('[HeartbeatMonitor] Stale client detected', {
          socketId: client.socketId,
          timeSinceHeartbeat,
          clientType: client.clientType,
        });

        monitorConfig.onClientStale(client);

        // If very stale (> 2x threshold), disconnect
        if (timeSinceHeartbeat > monitorConfig.staleThreshold * 2) {
          console.error('[HeartbeatMonitor] Client timeout - disconnecting', {
            socketId: client.socketId,
            timeSinceHeartbeat,
          });
          monitorConfig.onClientTimeout(client);
          client.socket.disconnect();
        }
      }
    }

    if (staleCount > 0) {
      console.log('[HeartbeatMonitor] Stale clients', { count: staleCount });
    }
  };

  const getStaleClients = (): BrowserClient[] => {
    const now = Date.now();
    const clients = tracker.getAllClients();
    return clients.filter(
      client => now - client.lastHeartbeat > monitorConfig.staleThreshold
    );
  };

  const getStatus = () => ({
    enabled: monitorConfig.enabled,
    active,
    staleCount: getStaleClients().length,
    totalClients: tracker.getClientCount(),
  });

  return {
    start,
    stop,
    check,
    getStaleClients,
    getStatus,
  };
}
