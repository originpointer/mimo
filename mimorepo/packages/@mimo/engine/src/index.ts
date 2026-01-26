/**
 * @mimo/engine
 *
 * Engine for processing messages from hub.
 *
 * This package receives commands from the hub and processes them.
 * Currently, it logs all received messages to the console.
 */

export { MessageHandler } from './message-handler.js';

// Re-export types for convenience
export type { CommandHandler, HubCommandRequest, HubCommandResponse } from '@mimo/types';
export { HubCommandType } from '@mimo/types';
