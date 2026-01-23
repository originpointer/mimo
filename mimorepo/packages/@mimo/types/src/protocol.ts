/**
 * Protocol Types for Bus ↔ Hub Communication
 *
 * This file defines the wire protocol for communication between
 * MimoBus (client in Nitro) and Hub (server-side Socket.IO handler).
 */

/**
 * Protocol event names for Socket.IO communication
 */
export enum ProtocolEvent {
  /** Client sends command request */
  CommandRequest = 'mimo.command.request',
  /** Server sends command response */
  CommandResponse = 'mimo.command.response',
  /** Client starts a stream */
  StreamStart = 'mimo.stream.start',
  /** Server sends stream data chunk */
  StreamData = 'mimo.stream.data',
  /** Server sends stream error */
  StreamError = 'mimo.stream.error',
  /** Server signals stream end */
  StreamEnd = 'mimo.stream.end',
}

/**
 * Command types for bus → hub communication
 *
 * These are high-level commands that the bus sends to the hub,
 * which then forwards them to the appropriate handler (browser extension, agent, etc.)
 */
export enum HubCommandType {
  // Browser operations (forwarded to extension)
  BrowserNavigate = 'browser.navigate',
  BrowserClick = 'browser.click',
  BrowserFill = 'browser.fill',
  BrowserScreenshot = 'browser.screenshot',
  BrowserEvaluate = 'browser.evaluate',
  BrowserGetContent = 'browser.getContent',
  BrowserHover = 'browser.hover',
  BrowserSelect = 'browser.select',

  // Tab operations
  TabGetList = 'tab.getList',
  TabGetActive = 'tab.getActive',
  TabSwitch = 'tab.switch',
  TabCreate = 'tab.create',
  TabClose = 'tab.close',
  TabGoBack = 'tab.goBack',
  TabGoForward = 'tab.goForward',
  TabReload = 'tab.reload',

  // DOM operations
  DomObserve = 'dom.observe',
  DomLocator = 'dom.locator',
  DomDeepLocator = 'dom.deepLocator',
  DomMark = 'dom.mark',
  DomUnmark = 'dom.unmark',
  DomUnmarkAll = 'dom.unmarkAll',

  // Agent operations
  AgentExecute = 'agent.execute',
  AgentStream = 'agent.stream',

  // Page operations
  PageAct = 'page.act',
  PageExtract = 'page.extract',
  PageGetUrl = 'page.getUrl',
  PageGetTitle = 'page.getTitle',
  PageWaitFor = 'page.waitFor',

  // Additional DOM operations
  DomTextContent = 'dom.textContent',
  DomInnerHTML = 'dom.innerHTML',
  DomGetAttribute = 'dom.getAttribute',
  DomIsVisible = 'dom.isVisible',
  DomWaitFor = 'dom.waitFor',
  DomBoundingBox = 'dom.boundingBox',
  DomDeepLocatorAll = 'dom.deepLocator.all',
  DomDeepLocatorFirst = 'dom.deepLocator.first',

  // Additional agent operations
  AgentObserve = 'agent.observe',
  AgentStep = 'agent.step',

  // Additional browser operations
  BrowserClose = 'browser.close',
}

/**
 * Command request structure (client → server)
 */
export interface HubCommandRequest {
  /** Unique command ID */
  id: string;
  /** Command type */
  type: HubCommandType;
  /** Command payload (type-specific data) */
  payload: unknown;
  /** Optional command options */
  options?: {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Target tab ID */
    tabId?: string;
    /** Target frame ID */
    frameId?: string;
  };
  /** Request timestamp */
  timestamp: number;
}

/**
 * Command response structure (server → client)
 */
export interface HubCommandResponse<T = unknown> {
  /** Command ID (matches request) */
  id: string;
  /** Whether the command succeeded */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error details (if failed) */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
  };
  /** Response timestamp */
  timestamp: number;
  /** Command execution duration in milliseconds */
  duration?: number;
}

/**
 * Stream event structure (server → client)
 */
export interface HubStreamEvent<T = unknown> {
  /** Stream ID (matches command ID) */
  id: string;
  /** Event type */
  type: 'data' | 'error' | 'end';
  /** Stream data chunk (for 'data' type) */
  data?: T;
  /** Error message (for 'error' type) */
  error?: string;
}

/**
 * Command handler function type
 *
 * Handlers are registered in the Hub to process specific command types.
 * They receive the request and return the response data.
 */
export interface CommandHandler {
  (request: HubCommandRequest): Promise<unknown> | unknown;
}

/**
 * Stream handler function type
 *
 * Stream handlers are used for commands that produce streaming responses
 * (e.g., LLM agent execution).
 */
export interface StreamHandler {
  (
    request: HubCommandRequest,
    emit: (event: { type: 'data' | 'error' | 'end'; data?: unknown; error?: string }) => void
  ): Promise<void>;
}
