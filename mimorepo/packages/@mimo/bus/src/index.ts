/**
 * MimoBus - Socket.IO Server for Nitro → Browser Communication
 *
 * REFACTORED: MimoBus is now a Socket.IO server that runs in the Nitro server
 * and receives connections from browser clients (extensions/pages).
 *
 * New Architecture:
 *   Nitro Server → MimoBus Server → Socket.IO → Browser Extension
 *
 * @module
 */

// Error classes
export {
  MimoBusError,
  MimoBusConnectionError,
  MimoBusTimeoutError,
  MimoBusNotConnectedError,
  MimoBusCommandError,
} from './errors.js';

// Main MimoBus class (now uses Socket.IO server)
export { MimoBus } from './mimobus.js';

// Server components
export { createMimoBusServer, type MimoBusServer, type MimoBusServerConfig } from './server.js';
export { createClientTracker, type ClientTracker, type BrowserClient } from './client-tracker.js';
export { createCommandRouter, type CommandRouter, type PendingCommand } from './command-router.js';
