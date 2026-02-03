/**
 * Bion Socket Manager (Plugin)
 *
 * This replaces the old `@mimo/engine` based connection layer.
 * The plugin connects directly to the backend Socket.IO server and speaks
 * Manus-style events (`my_browser_extension_message`) using `@bion/protocol`.
 */

import { createBionPluginClient, type BionPluginClient } from '@bion/client';
import type {
  BionActivateExtensionMessage,
  BionBrowserActionMessage,
  BionBrowserActionResult,
  BionPluginMessage,
  BionTabEventMessage,
} from '@bion/protocol';
import { registerExtensionId } from '@/apis';
import type { LifecycleAware } from './lifecycle-manager';
import { BrowserActionExecutor } from './browser-action-executor';
import { DebuggerSessionManager } from './debugger-session-manager';

export interface BionSocketConfig {
  busUrl?: string;
  namespace?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  debug?: boolean;
}

async function getOrCreateClientId(): Promise<string> {
  const key = 'bionClientId';
  const existing = await chrome.storage.local.get(key);
  if (typeof existing?.[key] === 'string' && existing[key].length > 0) return existing[key];

  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await chrome.storage.local.set({ [key]: id });
  return id;
}

export class BionSocketManager implements LifecycleAware {
  private client: BionPluginClient | null = null;
  private config: Required<BionSocketConfig>;
  private debuggerSessions = new DebuggerSessionManager();
  private actionExecutor = new BrowserActionExecutor(this.debuggerSessions, (m: BionPluginMessage) => this.client?.emit(m));

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isManualDisconnect = false;
  private readonly MAX_RECONNECT_DELAY = 30000;

  constructor(config: BionSocketConfig = {}) {
    this.config = {
      busUrl: config.busUrl ?? 'http://localhost:6007',
      namespace: config.namespace ?? '/mimo',
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 1000,
      debug: config.debug ?? false,
    };

    console.log('[BionSocketManager] Initialized with config:', {
      busUrl: this.config.busUrl,
      namespace: this.config.namespace,
    });
  }

  /**
   * Connect to the backend Socket.IO server and register handlers.
   */
  async connect(): Promise<void> {
    if (this.client?.socket.connected) {
      console.log('[BionSocketManager] Already connected');
      return;
    }

    console.log('[BionSocketManager] Connecting...', {
      busUrl: this.config.busUrl,
      namespace: this.config.namespace,
    });

    try {
      this.isManualDisconnect = false;

      const clientId = await getOrCreateClientId();

      this.client = createBionPluginClient({
        url: this.config.busUrl,
        namespace: this.config.namespace,
        autoConnect: false,
        // MV3 service worker environment: avoid XHR polling.
        transports: ['websocket'],
        auth: { clientType: 'extension' },
      });

      // On connect: announce plugin activation (Manus-style)
      this.client.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        const activate: BionActivateExtensionMessage = {
          type: 'activate_extension',
          id: `${Date.now()}`,
          clientId,
          ua: navigator.userAgent,
          version: chrome.runtime.getManifest().version,
          browserName: 'Bion',
          allowOtherClient: true,
          skipAuthorization: true,
        };
        this.client?.emit(activate);
        if (this.config.debug) console.log('[BionSocketManager] activate_extension sent', activate);

        // Also register (HTTP) extensionId <-> clientId binding for server-side lookup/persistence.
        try {
          const extensionId = chrome.runtime?.id;
          const extensionName = chrome.runtime.getManifest?.().name;
          if (extensionId && extensionName) {
            registerExtensionId(extensionId, extensionName, {
              clientId,
              ua: activate.ua,
              version: activate.version,
              browserName: activate.browserName,
              allowOtherClient: activate.allowOtherClient,
            }).catch((e) => {
              if (this.config.debug) console.warn('[BionSocketManager] registerExtensionId failed', e);
            });
          } else if (this.config.debug) {
            console.warn('[BionSocketManager] extensionId/extensionName not available for registration');
          }
        } catch (e) {
          if (this.config.debug) console.warn('[BionSocketManager] registerExtensionId threw', e);
        }
      });

      this.client.socket.on('disconnect', (reason) => {
        if (this.config.debug) console.log('[BionSocketManager] disconnected', reason);
        if (!this.isManualDisconnect && this.config.autoReconnect) this.scheduleReconnect();
      });

      this.client.socket.on('connect_error', (err) => {
        console.warn('[BionSocketManager] connect_error', {
          busUrl: this.config.busUrl,
          namespace: this.config.namespace,
          message: err instanceof Error ? err.message : String(err),
        });
        if (!this.isManualDisconnect && this.config.autoReconnect) this.scheduleReconnect();
      });

      // Handle browser_action commands (ack required)
      this.client.onBrowserAction(async (msg: BionBrowserActionMessage): Promise<BionBrowserActionResult> => {
        const result = await this.actionExecutor.execute(msg);
        return {
          sessionId: msg.sessionId,
          clientId: msg.clientId,
          ...result,
        };
      });

      await this.client.connect();
      console.log('[BionSocketManager] Connected successfully');
    } catch (error) {
      console.error('[BionSocketManager] Connection failed:', {
        busUrl: this.config.busUrl,
        namespace: this.config.namespace,
        message: error instanceof Error ? error.message : String(error),
      });
      this.client = null;
      if (!this.isManualDisconnect && this.config.autoReconnect) this.scheduleReconnect();

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
    if (this.reconnectTimer || this.isManualDisconnect || !this.config.autoReconnect) {
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    console.info('[BionSocketManager] Scheduling reconnect', {
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
        console.warn('[BionSocketManager] Reconnect attempt failed');
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

    if (!this.client) {
      console.log('[BionSocketManager] No client to disconnect');
      return;
    }

    console.log('[BionSocketManager] Disconnecting...');

    try {
      this.client.disconnect();
      this.client = null;
      console.log('[BionSocketManager] Disconnected successfully');
    } catch (error) {
      console.error('[BionSocketManager] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Check if connected to MimoBus
   */
  isConnected(): boolean {
    return this.client?.socket.connected ?? false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    if (!this.client) {
      return {
        socketId: '',
        state: 'disconnected' as const,
        lastHeartbeat: 0,
        heartbeatInterval: 30000,
        quality: 0,
      };
    }

    return {
      socketId: this.client.socket.id ?? '',
      state: this.client.socket.connected ? ('connected' as const) : ('disconnected' as const),
      lastHeartbeat: Date.now(),
      heartbeatInterval: 30000,
      quality: 1,
    };
  }

  /**
   * Get engine statistics
   */
  getStats() {
    if (!this.client) {
      return {
        messagesSent: 0,
        messagesReceived: 0,
        commandsExecuted: 0,
        uptime: 0,
      };
    }

    return {
      messagesSent: 0,
      messagesReceived: 0,
      commandsExecuted: 0,
      uptime: 0,
    };
  }

  /**
   * Stop the engine and cleanup resources
   *
   * Implements LifecycleAware interface for Service Worker lifecycle management.
   * Called when Service Worker is about to be suspended.
   */
  stop(): void {
    console.info('[BionSocketManager] Stopping');

    // Cancel any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Clean up resources
   *
   * Call this when the extension is being unloaded.
   */
  async destroy(): Promise<void> {
    console.log('[BionSocketManager] Destroying manager');
    this.stop();
  }

  /**
   * Send a heartbeat to keep the connection alive
   *
   * Called by KeepAliveManager to ensure the connection remains active.
   * This helps maintain Service Worker activity.
   */
  async sendHeartbeat(): Promise<void> {
    // Socket.IO maintains its own ping/pong; KeepAliveManager can call this
    // to force activity, but we don't need to emit anything here.
    if (this.client?.socket.connected) {
      console.debug('[BionSocketManager] Heartbeat check - connection active');
    }
  }

  /**
   * Send a tab event to the server
   *
   * Used by TabEventsHandler to send tab/window events to the digital twin system.
   */
  sendTabEvent(message: BionTabEventMessage): void {
    if (!this.client?.socket.connected) {
      console.debug('[BionSocketManager] Cannot send tab event - not connected');
      return;
    }
    this.client?.emit(message);
    if (this.config.debug) {
      console.debug('[BionSocketManager] Tab event sent:', message.eventType);
    }
  }
}
