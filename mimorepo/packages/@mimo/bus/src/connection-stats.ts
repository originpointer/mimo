/**
 * Connection Stats Tracker - Track per-socketId connection statistics
 *
 * Monitors connection duration, heartbeat patterns, command activity,
 * and errors for stability analysis.
 */

import type { BrowserClient } from './client-tracker.js';

/**
 * Connection statistics for a single socket
 */
export interface ConnectionStats {
  /** Socket ID */
  socketId: string;
  /** Client type: extension or page */
  clientType: 'extension' | 'page';
  /** Browser tab ID (optional) */
  tabId?: string;
  /** When the client connected (timestamp) */
  connectedAt: number;
  /** When the client disconnected (timestamp) */
  disconnectedAt?: number;
  /** Connection duration in milliseconds */
  duration?: number;
  /** Total number of heartbeats received */
  heartbeatCount: number;
  /** Track last 100 heartbeat intervals for analysis */
  heartbeatIntervals: number[];
  /** Average heartbeat interval in milliseconds */
  avgHeartbeatInterval: number;
  /** Number of commands sent to this client */
  commandsSent: number;
  /** Number of command responses received */
  commandsReceived: number;
  /** Number of errors encountered */
  errors: number;
  /** Disconnect reason (if applicable) */
  disconnectReason?: string;
}

/**
 * Summary statistics across all connections
 */
export interface ConnectionSummary {
  /** Total number of connections (including disconnected) */
  totalConnections: number;
  /** Currently active connections */
  activeConnections: number;
  /** Total number of disconnections */
  totalDisconnections: number;
  /** Average connection duration in milliseconds */
  avgConnectionDuration: number;
  /** Average heartbeat interval across all clients */
  avgHeartbeatInterval: number;
  /** Total commands sent */
  totalCommandsSent: number;
  /** Total commands received */
  totalCommandsReceived: number;
  /** Total errors */
  totalErrors: number;
}

/**
 * Connection stats tracker interface
 */
export interface ConnectionStatsTracker {
  /** Track a new client connection */
  trackConnection(socketId: string, client: BrowserClient): void;
  /** Track client disconnection */
  trackDisconnection(socketId: string, reason?: string): void;
  /** Track heartbeat event */
  trackHeartbeat(socketId: string, interval: number): void;
  /** Track command sent */
  trackCommandSent(socketId: string): void;
  /** Track command received */
  trackCommandReceived(socketId: string): void;
  /** Track error */
  trackError(socketId: string, error: Error): void;
  /** Get stats for a specific socket */
  getStats(socketId: string): ConnectionStats | undefined;
  /** Get all connection stats (including disconnected) */
  getAllStats(): ConnectionStats[];
  /** Get summary statistics */
  getSummary(): ConnectionSummary;
  /** Remove old disconnected stats (cleanup) */
  cleanup(maxAge?: number): void;
}

/**
 * Create connection stats tracker
 *
 * @param options - Tracker options
 * @returns ConnectionStatsTracker instance
 */
export function createConnectionStatsTracker(options: {
  /** Keep last N heartbeat intervals per connection (default: 100) */
  maxHeartbeatIntervals?: number;
  /** Cleanup interval in milliseconds (default: 3600000 = 1 hour) */
  cleanupInterval?: number;
} = {}): ConnectionStatsTracker {
  const maxHeartbeatIntervals = options.maxHeartbeatIntervals ?? 100;

  // Store all connection stats (including disconnected)
  const allStats = new Map<string, ConnectionStats>();

  const trackConnection = (socketId: string, client: BrowserClient): void => {
    const stats: ConnectionStats = {
      socketId,
      clientType: client.clientType,
      tabId: client.tabId,
      connectedAt: client.connectedAt,
      heartbeatCount: 0,
      heartbeatIntervals: [],
      avgHeartbeatInterval: 0,
      commandsSent: 0,
      commandsReceived: 0,
      errors: 0,
    };

    allStats.set(socketId, stats);
  };

  const trackDisconnection = (socketId: string, reason?: string): void => {
    const stats = allStats.get(socketId);
    if (stats) {
      stats.disconnectedAt = Date.now();
      stats.disconnectReason = reason;
      stats.duration = stats.disconnectedAt - stats.connectedAt;
    }
  };

  const trackHeartbeat = (socketId: string, interval: number): void => {
    const stats = allStats.get(socketId);
    if (stats) {
      stats.heartbeatCount++;
      stats.heartbeatIntervals.push(interval);

      // Keep only last N intervals
      if (stats.heartbeatIntervals.length > maxHeartbeatIntervals) {
        stats.heartbeatIntervals.shift();
      }

      // Update average
      const sum = stats.heartbeatIntervals.reduce((a, b) => a + b, 0);
      stats.avgHeartbeatInterval = sum / stats.heartbeatIntervals.length;
    }
  };

  const trackCommandSent = (socketId: string): void => {
    const stats = allStats.get(socketId);
    if (stats) {
      stats.commandsSent++;
    }
  };

  const trackCommandReceived = (socketId: string): void => {
    const stats = allStats.get(socketId);
    if (stats) {
      stats.commandsReceived++;
    }
  };

  const trackError = (socketId: string, error: Error): void => {
    const stats = allStats.get(socketId);
    if (stats) {
      stats.errors++;
    }
  };

  const getStats = (socketId: string): ConnectionStats | undefined => {
    return allStats.get(socketId);
  };

  const getAllStats = (): ConnectionStats[] => {
    return Array.from(allStats.values());
  };

  const getSummary = (): ConnectionSummary => {
    const stats = Array.from(allStats.values());
    const active = stats.filter(s => !s.disconnectedAt);
    const disconnected = stats.filter(s => s.disconnectedAt);

    // Calculate average connection duration (only for disconnected)
    const durations = disconnected
      .map(s => s.duration)
      .filter((d): d is number => d !== undefined);

    const avgConnectionDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Calculate average heartbeat interval
    const activeAvgHeartbeat = active
      .filter(s => s.heartbeatIntervals.length > 0)
      .map(s => s.avgHeartbeatInterval);

    const avgHeartbeatInterval = activeAvgHeartbeat.length > 0
      ? activeAvgHeartbeat.reduce((a, b) => a + b, 0) / activeAvgHeartbeat.length
      : 0;

    return {
      totalConnections: stats.length,
      activeConnections: active.length,
      totalDisconnections: disconnected.length,
      avgConnectionDuration,
      avgHeartbeatInterval,
      totalCommandsSent: stats.reduce((sum, s) => sum + s.commandsSent, 0),
      totalCommandsReceived: stats.reduce((sum, s) => sum + s.commandsReceived, 0),
      totalErrors: stats.reduce((sum, s) => sum + s.errors, 0),
    };
  };

  const cleanup = (maxAge: number = 7 * 24 * 60 * 60 * 1000): void => {
    const cutoff = Date.now() - maxAge;
    for (const [socketId, stats] of allStats.entries()) {
      // Only remove disconnected stats older than maxAge
      if (stats.disconnectedAt && stats.disconnectedAt < cutoff) {
        allStats.delete(socketId);
      }
    }
  };

  return {
    trackConnection,
    trackDisconnection,
    trackHeartbeat,
    trackCommandSent,
    trackCommandReceived,
    trackError,
    getStats,
    getAllStats,
    getSummary,
    cleanup,
  };
}
