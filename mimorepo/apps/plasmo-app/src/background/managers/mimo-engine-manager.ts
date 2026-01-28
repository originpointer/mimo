/**
 * MimoEngine Manager
 *
 * Manages MimoEngine Socket.IO connection lifecycle.
 * This class handles:
 * - Socket.IO connection to MimoBus
 * - Connection event handling
 * - Auto-reconnection with exponential backoff (based on Manus pattern)
 * - Engine lifecycle
 *
 * Based on Manus Chrome Extension v0.0.47 design patterns
 * Reference: .reverse/manus-reverse/sources/0.0.47_0/background.ts.js
 */

import { createMimoEngine, type MimoEngine, BusEvent } from '@mimo/engine';
import type { MimoEngineConfig } from '@mimo/types';
import type { LifecycleAware } from './lifecycle-manager';

/**
 * MimoEngine Manager
 *
 * Manages the Socket.IO connection to MimoBus server.
 * Separated from StagehandXPathManager to maintain clear separation of concerns.
 *
 * Implements LifecycleAware for proper Service Worker lifecycle management.
 */
export class MimoEngineManager implements LifecycleAware {
  private engine: MimoEngine | null = null;
  private config: Required<MimoEngineConfig>;

  // Auto-reconnect state
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isManualDisconnect = false;
  private readonly MAX_RECONNECT_DELAY = 30000;  // 30秒最大重连延迟

  constructor(config: MimoEngineConfig = {}) {
    this.config = {
      busUrl: config.busUrl ?? 'http://localhost:6007',
      namespace: config.namespace ?? '/mimo',
      clientType: config.clientType ?? 'extension',
      tabId: config.tabId ?? '',
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 1000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      debug: config.debug ?? false,
    };

    console.log('[MimoEngineManager] Initialized with config:', {
      busUrl: this.config.busUrl,
      namespace: this.config.namespace,
      clientType: this.config.clientType,
    });
  }

  /**
   * Connect to the MimoBus server
   *
   * Creates a MimoEngine instance and establishes the Socket.IO connection.
   * Implements auto-reconnect with exponential backoff on failure.
   */
  async connect(): Promise<void> {
    if (this.engine?.isConnected()) {
      console.log('[MimoEngineManager] Already connected');
      return;
    }

    console.log('[MimoEngineManager] Connecting to MimoBus...');

    try {
      // Reset manual disconnect flag
      this.isManualDisconnect = false;

      // Create engine instance
      this.engine = createMimoEngine({
        busUrl: this.config.busUrl,
        namespace: this.config.namespace,
        clientType: this.config.clientType,
        tabId: this.config.tabId,
        autoReconnect: this.config.autoReconnect,
        reconnectInterval: this.config.reconnectInterval,
        heartbeatInterval: this.config.heartbeatInterval,
        debug: this.config.debug,
      });

      // Setup event listeners
      this.setupEventListeners();

      // Connect to the bus
      await this.engine.connect();

      console.log('[MimoEngineManager] Connected successfully');
    } catch (error) {
      console.error('[MimoEngineManager] Connection failed:', error);
      this.engine = null;

      // Schedule reconnect if not manual disconnect
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   *
   * Based on Manus pattern:
   * - Starts with 1 second delay
   * - Multiplies by 1.5 after each attempt
   * - Caps at 30 seconds max delay
   */
  private scheduleReconnect(): void {
    // Don't schedule if already scheduled or manual disconnect
    if (this.reconnectTimer || this.isManualDisconnect) {
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    console.info('[MimoEngineManager] Scheduling reconnect', {
      attempt: this.reconnectAttempts + 1,
      delay: `${Math.round(delay)}ms`
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      try {
        await this.connect();
      } catch (error) {
        // connect() already schedules next reconnect
        console.warn('[MimoEngineManager] Reconnect attempt failed');
      }
    }, delay);
  }

  /**
   * Disconnect from the MimoBus server
   *
   * Sets manual disconnect flag to prevent auto-reconnect.
   */
  async disconnect(): Promise<void> {
    // Set manual disconnect flag to prevent auto-reconnect
    this.isManualDisconnect = true;

    // Cancel any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    if (!this.engine) {
      console.log('[MimoEngineManager] No engine to disconnect');
      return;
    }

    console.log('[MimoEngineManager] Disconnecting...');

    try {
      await this.engine.disconnect();
      this.engine = null;
      console.log('[MimoEngineManager] Disconnected successfully');
    } catch (error) {
      console.error('[MimoEngineManager] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Check if connected to MimoBus
   */
  isConnected(): boolean {
    return this.engine?.isConnected() ?? false;
  }

  /**
   * Get the MimoEngine instance
   *
   * Returns null if not connected.
   */
  getEngine(): MimoEngine | null {
    return this.engine;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    if (!this.engine) {
      return {
        socketId: '',
        state: 'disconnected' as const,
        lastHeartbeat: 0,
        heartbeatInterval: this.config.heartbeatInterval,
        quality: 0,
      };
    }

    return this.engine.getConnectionStatus();
  }

  /**
   * Get engine statistics
   */
  getStats() {
    if (!this.engine) {
      return {
        messagesSent: 0,
        messagesReceived: 0,
        commandsExecuted: 0,
        uptime: 0,
      };
    }

    return this.engine.getStats();
  }

  /**
   * Setup event listeners for the engine
   */
  private setupEventListeners(): void {
    if (!this.engine) {
      return;
    }

    // Connected event
    this.engine.on(BusEvent.Connected, () => {
      console.log('[MimoEngineManager] Connected to MimoBus');
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
    });

    // Disconnected event
    this.engine.on(BusEvent.Disconnected, ({ reason }) => {
      console.log('[MimoEngineManager] Disconnected from MimoBus:', reason);

      // Schedule reconnect if not manual disconnect
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    // Error event
    this.engine.on(BusEvent.Error, ({ error }) => {
      console.error('[MimoEngineManager] Error:', error);

      // Schedule reconnect if not manual disconnect
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    // Command sent event
    this.engine.on(BusEvent.CommandSent, ({ command }) => {
      if (this.config.debug) {
        console.log('[MimoEngineManager] Command sent:', command.id, command.type);
      }
    });

    // Command result event
    this.engine.on(BusEvent.CommandResult, ({ id, response }) => {
      if (this.config.debug) {
        console.log('[MimoEngineManager] Command result:', id, response.success);
      }
    });

    console.log('[MimoEngineManager] Event listeners setup complete');
  }

  /**
   * Stop the engine and cleanup resources
   *
   * Implements LifecycleAware interface for Service Worker lifecycle management.
   * Called when Service Worker is about to be suspended.
   */
  stop(): void {
    console.info('[MimoEngineManager] Stopping engine');

    // Cancel any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect the engine
    if (this.engine) {
      this.engine.disconnect();
      this.engine.removeAllListeners();
      this.engine = null;
    }
  }

  /**
   * Clean up resources
   *
   * Call this when the extension is being unloaded.
   */
  async destroy(): Promise<void> {
    console.log('[MimoEngineManager] Destroying manager');
    this.stop();
  }

  /**
   * Send a heartbeat to keep the connection alive
   *
   * Called by KeepAliveManager to ensure the connection remains active.
   * This helps maintain Service Worker activity.
   */
  async sendHeartbeat(): Promise<void> {
    if (this.engine?.isConnected()) {
      // MimoEngine internal heartbeat is handled automatically
      // This method is called by KeepAliveManager to ensure activity
      // The actual heartbeat is sent by MimoEngine's internal timer
      console.debug('[MimoEngineManager] Heartbeat check - connection active');
    }
  }
}
