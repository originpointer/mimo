/**
 * Message Router
 *
 * Unified entry point for all Chrome runtime messages.
 * Routes messages to the appropriate handler registry based on message type.
 */

import type { LegacyHandlerRegistry } from './handlers/legacy-handler-registry';
import type { HubCommandHandlerRegistry } from './handlers/hub-command-handler-registry';
import { LegacyMessageType } from './handlers/types';

/**
 * Message Router Configuration
 */
export interface MessageRouterConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Slow message threshold in milliseconds */
  slowMessageThreshold?: number;
}

/**
 * Message detection result
 */
type MessageTypeDetection = 'legacy' | 'hub' | 'unknown';

/**
 * Route result
 */
interface RouteResult {
  handled: boolean;
  messageType: MessageTypeDetection;
}

/**
 * Message Router
 *
 * Single entry point for all chrome.runtime messages.
 * Detects message type and routes to the appropriate handler registry.
 */
export class MessageRouter {
  private config: Required<MessageRouterConfig>;

  constructor(
    private legacyRegistry: LegacyHandlerRegistry,
    private hubRegistry: HubCommandHandlerRegistry,
    config: MessageRouterConfig = {}
  ) {
    this.config = {
      debug: config.debug ?? false,
      slowMessageThreshold: config.slowMessageThreshold ?? 1000,
    };

    if (this.config.debug) {
      console.log('[MessageRouter] Initialized with debug mode');
    }
  }

  /**
   * Route a message to the appropriate handler
   *
   * @param message - The Chrome runtime message
   * @param sender - The message sender
   * @param sendResponse - Response callback
   * @returns true if the message was handled, false otherwise
   */
  route(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean {
    const startTime = Date.now();

    // Detect message type
    const messageType = this.detectMessageType(message);

    if (this.config.debug) {
      console.log('[MessageRouter] Routing message:', {
        messageType,
        messageTypeValue: message.type,
        senderId: sender.id,
        senderUrl: sender.url,
      });
    }

    let handled = false;

    // Route to appropriate registry
    switch (messageType) {
      case 'legacy':
        handled = this.legacyRegistry.handle(message, sender, sendResponse);
        break;

      case 'hub':
        handled = this.hubRegistry.handle(message, sender, sendResponse);
        break;

      case 'unknown':
        // Message not handled by any registry
        // Return false to let other listeners handle it
        if (this.config.debug) {
          console.log('[MessageRouter] Unknown message type, passing through:', message.type);
        }
        return false;
    }

    // Log slow messages
    const duration = Date.now() - startTime;
    if (duration > this.config.slowMessageThreshold) {
      console.warn(`[MessageRouter] Slow message detected:`, {
        messageType,
        duration: `${duration}ms`,
        type: message.type,
      });
    }

    return handled;
  }

  /**
   * Detect the type of a message
   *
   * @param message - The message to detect
   * @returns The detected message type
   */
  private detectMessageType(message: any): MessageTypeDetection {
    // Check for legacy message types
    if (message.type && Object.values(LegacyMessageType).includes(message.type)) {
      return 'legacy';
    }

    // Unknown message type
    return 'unknown';
  }

  /**
   * Get statistics about the router
   *
   * @returns Router statistics
   */
  getStats() {
    return {
      debug: this.config.debug,
      slowMessageThreshold: this.config.slowMessageThreshold,
    };
  }
}
