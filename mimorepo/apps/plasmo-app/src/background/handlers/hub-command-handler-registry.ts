/**
 * Hub Command Handler Registry
 *
 * Manages routing for HubCommandType messages.
 * This registry handles the new Hub protocol messages and integrates with CommandExecutor.
 */

/**
 * Hub Command Handler Registry
 *
 * NOTE: HubCommandType support is intentionally disabled in bion mode.
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
    // Bion mode: do not handle hub commands at all.
    // Returning false allows other listeners (if any) to handle.
    void message;
    void sendResponse;
    return false;
  }
}
