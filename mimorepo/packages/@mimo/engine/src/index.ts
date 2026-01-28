/**
 * @mimo/engine
 *
 * Engine for processing messages from hub and connecting to bus.
 *
 * This package:
 * - Receives commands from the hub via Chrome runtime messaging
 * - Connects to MimoBus as a Socket.IO client
 * - Routes commands between bus and CommandExecutor
 * - Maintains heartbeat connection with bus
 */

export { MessageHandler } from './message-handler.js';

// New exports
export { MimoEngine } from './mimo-engine.js';
export { createMimoEngine, createMimoEngineAndConnect } from './factory.js';
export { ReconnectionManager } from './reconnection-manager.js';

// Re-export types for convenience
export type { CommandHandler, HubCommandRequest, HubCommandResponse } from '@mimo/types';
export { HubCommandType, ProtocolEvent, BusEvent } from '@mimo/types';
export type { MimoEngine, MimoEngineConfig, ConnectionStatus } from '@mimo/types';
