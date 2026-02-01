export type BrowserActionName = string;

/**
 * Normalized observation returned from browser tools.
 * This is intentionally transport-agnostic so it can work with Bion Extension,
 * Playwright, remote browsers, etc.
 */
export type BrowserObservation = {
  url?: string;
  title?: string;
  markdown?: string;
  fullMarkdown?: string;
  elements?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  pixelsAbove?: number;
  pixelsBelow?: number;
  newPages?: unknown[];
  /**
   * Escape hatch for adapter-specific fields.
   */
  raw?: unknown;
};

export type BrowserTransportResult =
  | { status: 'success'; observation?: BrowserObservation; raw?: unknown }
  | { status: 'error'; error: string; raw?: unknown };

export type BrowserTransportExecuteInput = {
  sessionId: string;
  clientId: string;
  actionId: string;
  actionName: BrowserActionName;
  params: Record<string, unknown>;
};

/**
 * Transport interface used by browser tools to execute an action.
 * Implementations live in adapter packages (e.g. Bion adapter).
 */
export interface BrowserTransport {
  execute(input: BrowserTransportExecuteInput): Promise<BrowserTransportResult>;
}

export type BrowserToolsConfig = {
  transport: BrowserTransport;
  sessionId: string;
  clientId: string;
  createActionId: () => string;
};

