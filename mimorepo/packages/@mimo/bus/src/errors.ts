/**
 * MimoBus Error Classes
 */

import type { HubCommandRequest } from '@mimo/types';
import { MimoErrorCode } from '@mimo/types';

/**
 * Base MimoBus error
 */
export class MimoBusError extends Error {
  constructor(
    message: string,
    public code: MimoErrorCode,
    public command?: HubCommandRequest
  ) {
    super(message);
    this.name = 'MimoBusError';
  }
}

/**
 * Connection error
 */
export class MimoBusConnectionError extends MimoBusError {
  constructor(message: string) {
    super(message, MimoErrorCode.ConnectionFailed);
    this.name = 'MimoBusConnectionError';
  }
}

/**
 * Timeout error
 */
export class MimoBusTimeoutError extends MimoBusError {
  constructor(message: string, public timeout: number) {
    super(message, MimoErrorCode.ConnectionTimeout);
    this.name = 'MimoBusTimeoutError';
  }
}

/**
 * Not connected error
 */
export class MimoBusNotConnectedError extends MimoBusError {
  constructor() {
    super('Not connected to MimoBus server', MimoErrorCode.NotConnected);
    this.name = 'MimoBusNotConnectedError';
  }
}

/**
 * Command error
 */
export class MimoBusCommandError extends MimoBusError {
  commandId: string;

  constructor(message: string, commandId: string, command: HubCommandRequest) {
    super(message, MimoErrorCode.CommandFailed, command);
    this.name = 'MimoBusCommandError';
    this.commandId = commandId;
  }
}
