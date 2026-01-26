/**
 * Mimo Hub - Socket.IO Communication Hub
 *
 * This package provides:
 * - BrowserHubClient: Socket.IO client for browser extensions/pages
 * - CommandExecutor: Browser operation handlers (extension-side)
 * - CommandExecutorClient: Client wrapper for next-app (web pages)
 * - ExtensionMessageSender: Chrome extension message sender
 * - Hub: (Legacy) Server-side Socket.IO hub - DEPRECATED
 * - HubClient: (Legacy) Client-side connector - DEPRECATED
 */

// Browser Hub Client (NEW - for refactored architecture)
export {
  createBrowserHubClient,
  BrowserHubClientClass,
  type BrowserHubClientConfig,
  type BrowserHubClient,
} from './hub-client.js';

// Command Executor (NEW - browser operation handlers)
export { CommandExecutor } from './command-executor.js';
export { MimoRouter } from './mimo-router.js';

// Command Executor Client (NEW - for next-app web pages)
export {
  createCommandExecutorClient,
  CommandExecutorClientClass,
  type CommandExecutorClient,
  type CommandExecutorClientConfig,
  type NavigateOptions,
  type ClickOptions,
  type ScreenshotOptions,
} from './command-executor-client.js';

// Extension Message Sender (NEW - for next-app → plasmo-app communication)
export {
  createExtensionMessageSender,
  ExtensionMessageSenderClass,
  type ExtensionMessageSender,
  type ExtensionMessage,
  type ExtensionResponse,
  type ExtensionMessageSenderConfig,
} from './extension-message-sender.js';

// Legacy exports (DEPRECATED - kept for backward compatibility)
export * from './hub.js';
export * from './client.js';
