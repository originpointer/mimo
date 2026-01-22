/**
 * Event Types
 *
 * Type-safe event names and payload definitions for the Mimo event system.
 */

/**
 * Bus event names emitted by MimoBus
 */
export enum BusEvent {
  /** Emitted when Socket.IO connection is established */
  Connected = 'connected',
  /** Emitted when Socket.IO connection is lost */
  Disconnected = 'disconnected',
  /** Emitted when a Socket.IO error occurs */
  Error = 'error',
  /** Emitted when a command is sent */
  CommandSent = 'command.sent',
  /** Emitted when a command response is received */
  CommandResult = 'command.result',
  /** Emitted when stream data is received */
  StreamData = 'stream.data',
  /** Emitted when a stream error occurs */
  StreamError = 'stream.error',
  /** Emitted when a stream ends */
  StreamEnd = 'stream.end',
  /** Emitted when a screenshot is captured */
  Screenshot = 'screenshot',
  /** Emitted when DOM changes are detected */
  DomChanged = 'dom.changed',
  /** Emitted when a tab is changed/activated */
  TabChanged = 'tab.changed',
  /** Emitted when a tab is closed */
  TabClosed = 'tab.closed',
}

/**
 * Core event names emitted by Mimo
 */
export enum CoreEvent {
  /** Emitted when Mimo is successfully initialized */
  Initialized = 'initialized',
  /** Emitted when Mimo is closed */
  Closed = 'closed',
  /** Forwarded bus events */
  Connected = BusEvent.Connected,
  Disconnected = BusEvent.Disconnected,
  CommandSent = BusEvent.CommandSent,
  CommandResult = BusEvent.CommandResult,
  Screenshot = BusEvent.Screenshot,
  TabChanged = BusEvent.TabChanged,
  TabClosed = BusEvent.TabClosed,
  Error = BusEvent.Error,
}

/**
 * Event payload types for BusEvent
 */
export interface BusEventPayloads {
  [BusEvent.Connected]: void;
  [BusEvent.Disconnected]: { reason: string };
  [BusEvent.Error]: { error: unknown };
  [BusEvent.CommandSent]: { command: import('./command.js').MimoCommand };
  [BusEvent.CommandResult]: { id: string; response: import('./response.js').MimoResponse };
  [BusEvent.StreamData]: { id: string; data: unknown };
  [BusEvent.StreamError]: { id: string; error: string };
  [BusEvent.StreamEnd]: { id: string };
  [BusEvent.Screenshot]: { buffer: Uint8Array; tabId: string };
  [BusEvent.DomChanged]: { changes: unknown[] };
  [BusEvent.TabChanged]: { tab: unknown };
  [BusEvent.TabClosed]: { tabId: string };
}

/**
 * Event payload types for CoreEvent
 */
export interface CoreEventPayloads {
  [CoreEvent.Initialized]: void;
  [CoreEvent.Closed]: void;
  [CoreEvent.Connected]: void;
  [CoreEvent.Disconnected]: { reason: string };
  [CoreEvent.CommandSent]: { command: import('./command.js').MimoCommand };
  [CoreEvent.CommandResult]: { id: string; response: import('./response.js').MimoResponse };
  [CoreEvent.Screenshot]: { buffer: Uint8Array; tabId: string };
  [CoreEvent.TabChanged]: { tab: unknown };
  [CoreEvent.TabClosed]: { tabId: string };
  [CoreEvent.Error]: { error: unknown };
}
