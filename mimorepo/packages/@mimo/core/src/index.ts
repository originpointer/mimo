/**
 * @mimo/lib/core
 *
 * Mimo - Core class for browser automation
 *
 * This is the main entry point for the Mimo Library.
 * All browser automation operations start here.
 */

export { Mimo } from './mimo.js';

/**
 * Mimo errors
 */
export class MimoError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MimoError';
  }
}

export class MimoInitError extends MimoError {
  constructor(message: string) {
    super(message, 'MIMO_INIT_ERROR');
    this.name = 'MimoInitError';
  }
}

export class MimoTimeoutError extends MimoError {
  constructor(message: string, public timeout: number) {
    super(message, 'MIMO_TIMEOUT');
    this.name = 'MimoTimeoutError';
  }
}

export class MimoNotConnectedError extends MimoError {
  constructor() {
    super('Not connected to MimoBus', 'MIMO_NOT_CONNECTED');
    this.name = 'MimoNotConnectedError';
  }
}

export class MimoCommandError extends MimoError {
  constructor(message: string, public commandId: string, public command: any) {
    super(message, 'MIMO_COMMAND_ERROR');
    this.name = 'MimoCommandError';
  }
}
