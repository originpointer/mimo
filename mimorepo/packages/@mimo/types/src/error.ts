/**
 * Error types
 */

/**
 * Mimo error codes
 */
export enum MimoErrorCode {
  ConnectionFailed = 'MIMO_CONNECTION_FAILED',
  ConnectionTimeout = 'MIMO_CONNECTION_TIMEOUT',
  NotConnected = 'MIMO_NOT_CONNECTED',
  CommandTimeout = 'MIMO_COMMAND_TIMEOUT',
  CommandFailed = 'MIMO_COMMAND_FAILED',
  InvalidResponse = 'MIMO_INVALID_RESPONSE',
}
