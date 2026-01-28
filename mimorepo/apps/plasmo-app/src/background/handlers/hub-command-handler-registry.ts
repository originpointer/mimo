/**
 * Hub Command Handler Registry
 *
 * Manages routing for HubCommandType messages.
 * This registry handles the new Hub protocol messages and integrates with CommandExecutor.
 */

import { MessageHandler } from '@mimo/engine';
import type { HubCommandRequest, HubCommandType } from '@mimo/types';

/**
 * Hub Command Handler Registry
 *
 * Routes HubCommandType messages to CommandExecutor via MessageHandler.
 */
export class HubCommandHandlerRegistry {
  /**
   * Handle a Hub command message
   *
   * @param message - The Chrome runtime message
   * @param sender - The message sender
   * @param sendResponse - Response callback
   * @returns true if the message was handled, false otherwise
   */
  handle(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean {
    // Skip non-Hub command messages
    if (!message.type || typeof message.type !== 'string') {
      return false;
    }

    // Check if this is a HubCommandType (validation happens in MessageHandler)
    const hubCommandTypes = Object.values(HubCommandType);
    if (!hubCommandTypes.includes(message.type as HubCommandType)) {
      return false;
    }

    console.log('[HubCommandHandlerRegistry] Processing Hub command:', message.type);

    // Construct HubCommandRequest
    const request: HubCommandRequest = {
      id: message.id || `chrome_${Date.now()}`,
      type: message.type as HubCommandType,
      payload: message.payload || {},
      options: message.options,
      timestamp: message.timestamp || Date.now(),
    };

    // Route and execute command via MessageHandler
    MessageHandler.routeCommand(request)
      .then((result: unknown) => {
        // Transform CommandExecutor response to ExtensionResponse format
        const response = MessageHandler['transformToExtensionResponse'](result);
        sendResponse(response);
        console.log('[HubCommandHandlerRegistry] Command response sent:', response);
      })
      .catch((error: unknown) => {
        console.error('[HubCommandHandlerRegistry] Error processing message:', error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    // Return true to indicate async response
    return true;
  }
}
