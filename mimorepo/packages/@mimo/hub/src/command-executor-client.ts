/**
 * CommandExecutorClient - Client-side CommandExecutor
 *
 * This client runs in next-app (web page context) and communicates
 * with the extension via ExtensionMessageSender.
 *
 * The actual CommandExecutor runs in the extension background context
 * where Chrome APIs are available.
 */

import type {
  ExtensionMessageSender,
  ExtensionResponse,
} from './extension-message-sender';
import { HubCommandType } from '@mimo/types';

export interface CommandExecutorClientConfig {
  /** Extension message sender */
  sender: ExtensionMessageSender;
  /** Enable debug logging */
  debug?: boolean;
}

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  referer?: string;
}

export interface ClickOptions {
  selector?: string;
  xpath?: string;
  coordinates?: { x: number; y: number };
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  selector?: string;
}

/**
 * CommandExecutorClient interface
 */
export interface CommandExecutorClient {
  /** Navigate to URL */
  navigate(url: string, options?: NavigateOptions): Promise<unknown>;
  /** Click element */
  click(options: ClickOptions): Promise<unknown>;
  /** Fill input field */
  fill(selector: string, value: string): Promise<unknown>;
  /** Take screenshot */
  screenshot(options?: ScreenshotOptions): Promise<unknown>;
  /** Get page content */
  getContent(): Promise<unknown>;
  /** Evaluate JavaScript */
  evaluate(script: string): Promise<unknown>;
  /** Get tab list */
  getTabList(): Promise<unknown>;
  /** Create new tab */
  createTab(url?: string): Promise<unknown>;
  /** Close tab */
  closeTab(tabId?: number): Promise<unknown>;
  /** Switch tab */
  switchTab(tabId: number): Promise<unknown>;
}

/**
 * Create CommandExecutor client
 *
 * @param config - Configuration options
 * @returns CommandExecutorClient instance
 *
 * @example
 * ```typescript
 * const sender = createExtensionMessageSender({
 *   extensionId: 'your-extension-id',
 * });
 *
 * const client = createCommandExecutorClient({ sender });
 *
 * // Navigate to URL
 * const result = await client.navigate('https://example.com');
 * console.log('Navigated:', result);
 *
 * // Click element
 * await client.click({ selector: '#button' });
 *
 * // Screenshot
 * const screenshot = await client.screenshot();
 * ```
 */
export function createCommandExecutorClient(
  config: CommandExecutorClientConfig
): CommandExecutorClient {
  const { sender, debug = false } = config;

  const log = (message: string, data?: unknown): void => {
    if (debug) {
      console.log(`[CommandExecutorClient] ${message}`, data ?? '');
    }
  };

  /**
   * Send command to extension and wait for response
   */
  async function sendCommand<T = unknown>(
    type: HubCommandType,
    payload?: unknown
  ): Promise<T> {
    log('Sending command', { type, payload });

    const response: ExtensionResponse<T> = await sender.sendCommand({
      type,
      payload,
      id: `client_${Date.now()}`,
      timestamp: Date.now(),
    });

    log('Response received', response);

    if (!response.ok) {
      throw new Error(response.error || 'Command failed');
    }

    return response.data as T;
  }

  return {
    /**
     * Navigate to URL
     */
    async navigate(url: string, options?: NavigateOptions) {
      return sendCommand(HubCommandType.BrowserNavigate, {
        url,
        ...options,
      });
    },

    /**
     * Click element
     */
    async click(options: ClickOptions) {
      return sendCommand(HubCommandType.BrowserClick, options);
    },

    /**
     * Fill input field
     */
    async fill(selector: string, value: string) {
      return sendCommand(HubCommandType.BrowserFill, {
        selector,
        value,
      });
    },

    /**
     * Take screenshot
     */
    async screenshot(options?: ScreenshotOptions) {
      return sendCommand(HubCommandType.BrowserScreenshot, options);
    },

    /**
     * Get page content
     */
    async getContent() {
      return sendCommand(HubCommandType.BrowserGetContent);
    },

    /**
     * Evaluate JavaScript
     */
    async evaluate(script: string) {
      return sendCommand(HubCommandType.BrowserEvaluate, { script });
    },

    /**
     * Get tab list
     */
    async getTabList() {
      return sendCommand(HubCommandType.TabGetList);
    },

    /**
     * Create new tab
     */
    async createTab(url?: string) {
      return sendCommand(HubCommandType.TabCreate, { url });
    },

    /**
     * Close tab
     */
    async closeTab(tabId?: number) {
      return sendCommand(HubCommandType.TabClose, { tabId });
    },

    /**
     * Switch tab
     */
    async switchTab(tabId: number) {
      return sendCommand(HubCommandType.TabSwitch, { tabId });
    },
  };
}

/**
 * CommandExecutorClient class (class version)
 */
export class CommandExecutorClientClass implements CommandExecutorClient {
  private client: CommandExecutorClient;

  constructor(config: CommandExecutorClientConfig) {
    this.client = createCommandExecutorClient(config);
  }

  navigate(url: string, options?: NavigateOptions): Promise<unknown> {
    return this.client.navigate(url, options);
  }

  click(options: ClickOptions): Promise<unknown> {
    return this.client.click(options);
  }

  fill(selector: string, value: string): Promise<unknown> {
    return this.client.fill(selector, value);
  }

  screenshot(options?: ScreenshotOptions): Promise<unknown> {
    return this.client.screenshot(options);
  }

  getContent(): Promise<unknown> {
    return this.client.getContent();
  }

  evaluate(script: string): Promise<unknown> {
    return this.client.evaluate(script);
  }

  getTabList(): Promise<unknown> {
    return this.client.getTabList();
  }

  createTab(url?: string): Promise<unknown> {
    return this.client.createTab(url);
  }

  closeTab(tabId?: number): Promise<unknown> {
    return this.client.closeTab(tabId);
  }

  switchTab(tabId: number): Promise<unknown> {
    return this.client.switchTab(tabId);
  }
}
