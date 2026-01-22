/**
 * MimoBus Types
 * Defines the command and response types for MimoBus communication
 */

/**
 * Command types that can be sent through MimoBus
 */
export type CommandType =
  // Page operations
  | "page.init"
  | "page.goto"
  | "page.reload"
  | "page.goBack"
  | "page.goForward"
  | "page.getUrl"
  | "page.getTitle"
  | "page.getContent"
  // Element interactions
  | "page.click"
  | "page.fill"
  | "page.select"
  | "page.hover"
  // DOM operations
  | "dom.observe"
  | "dom.locator"
  | "dom.deepLocator"
  | "dom.mark"
  | "dom.unmark"
  | "dom.unmarkAll"
  // Screenshot and execution
  | "page.screenshot"
  | "page.evaluate"
  | "page.waitFor"
  // Browser operations
  | "browser.getTabs"
  | "browser.getActiveTab"
  | "browser.switchTab"
  | "browser.newTab"
  | "browser.closeTab"
  // Stream operations
  | "stream.start"
  | "stream.chunk"
  | "stream.end";

/**
 * MimoBus command structure
 */
export interface MimoCommand {
  id: string;
  type: CommandType;
  payload: any;
  options?: {
    timeout?: number;
    tabId?: string;
    frameId?: string;
  };
  timestamp: number;
}

/**
 * MimoBus response structure
 */
export interface MimoResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: number;
  duration?: number;
}

/**
 * MimoBus stream event structure
 */
export interface MimoStreamEvent<T = any> {
  type: "data" | "error" | "end";
  data?: T;
  error?: string;
  id: string;
}

/**
 * MimoBus options
 */
export interface MimoBusOptions {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  timeout?: number;
  debug?: boolean;
}

/**
 * Tab information
 */
export interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
}

/**
 * Error codes
 */
export const MimoErrorCode = {
  CONNECTION_FAILED: 'MIMO_CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'MIMO_CONNECTION_TIMEOUT',
  NOT_CONNECTED: 'MIMO_NOT_CONNECTED',
  COMMAND_TIMEOUT: 'MIMO_COMMAND_TIMEOUT',
  COMMAND_FAILED: 'MIMO_COMMAND_FAILED',
  INVALID_RESPONSE: 'MIMO_INVALID_RESPONSE',
} as const;

export type MimoErrorCode = typeof MimoErrorCode[keyof typeof MimoErrorCode];

/**
 * MimoBus errors
 */
export class MimoBusError extends Error {
  constructor(
    message: string,
    public code: MimoErrorCode,
    public command?: MimoCommand
  ) {
    super(message);
    this.name = 'MimoBusError';
  }
}

export class MimoBusConnectionError extends MimoBusError {
  constructor(message: string) {
    super(message, MimoErrorCode.CONNECTION_FAILED);
    this.name = 'MimoBusConnectionError';
  }
}

export class MimoBusTimeoutError extends MimoBusError {
  constructor(message: string, public timeout: number) {
    super(message, MimoErrorCode.CONNECTION_TIMEOUT);
    this.name = 'MimoBusTimeoutError';
  }
}

export class MimoBusNotConnectedError extends MimoBusError {
  constructor() {
    super('Not connected to MimoBus server', MimoErrorCode.NOT_CONNECTED);
    this.name = 'MimoBusNotConnectedError';
  }
}

export class MimoBusCommandError extends MimoBusError {
  constructor(message: string, commandId: string, command: MimoCommand) {
    super(message, MimoErrorCode.COMMAND_FAILED, command);
    this.name = 'MimoBusCommandError';
    this.commandId = commandId;
  }

  commandId: string;
}
