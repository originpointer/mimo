/**
 * Mimo Hub - Socket.IO Communication Hub
 *
 * This package provides:
 * - BrowserHubClient: Socket.IO client for browser extensions/pages
 * - CommandExecutor: Browser operation handlers
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

// Legacy exports (DEPRECATED - kept for backward compatibility)
export * from './hub.js';
export * from './client.js';
