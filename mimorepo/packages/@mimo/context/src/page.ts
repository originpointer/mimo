/**
 * RemotePage - Remote proxy for page operations
 *
 * All operations are sent through MimoBus to the frontend extension
 */

import type { v4 as uuidv4 } from 'uuid';
import type {
  RemoteResponse,
  NavigateOptions,
  ScreenshotOptions,
  ClickOptions,
  FillOptions,
  PageContent,
  Action,
} from '@mimo/types';
import { RemoteLocator, RemoteDeepLocator } from './locator.js';

/**
 * RemotePage - Proxy for page operations via MimoBus
 */
export class RemotePage {
  constructor(
    private sendCommand: (command: any) => Promise<RemoteResponse>,
    private defaultTabId?: string
  ) {}

  /**
   * Navigate to URL
   */
  async goto(url: string, options?: NavigateOptions): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.goto',
      payload: { url, options },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Reload page
   */
  async reload(): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.reload',
      payload: {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Go back
   */
  async goBack(): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.goBack',
      payload: {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Go forward
   */
  async goForward(): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.goForward',
      payload: {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Get current URL
   */
  async url(): Promise<RemoteResponse<string>> {
    return this.sendCommand({
      type: 'page.getUrl',
      payload: {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Get page title
   */
  async title(): Promise<RemoteResponse<string>> {
    return this.sendCommand({
      type: 'page.getTitle',
      payload: {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Get page content
   */
  async content(options?: { html?: boolean; text?: boolean }): Promise<RemoteResponse<PageContent>> {
    return this.sendCommand({
      type: 'page.getContent',
      payload: options,
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Click element
   */
  async click(selector: string, options?: ClickOptions): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.click',
      payload: { selector, ...options },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Fill input element
   */
  async fill(selector: string, value: string, options?: FillOptions): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.fill',
      payload: { selector, value, options },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Select option
   */
  async select(selector: string, value: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.select',
      payload: { selector, value },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Hover over element
   */
  async hover(selector: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.hover',
      payload: { selector },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Take screenshot
   */
  async screenshot(options?: ScreenshotOptions): Promise<RemoteResponse<Buffer>> {
    return this.sendCommand({
      type: 'page.screenshot',
      payload: options ?? {},
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Evaluate JavaScript in page
   */
  async evaluate<T>(handler: () => T | Promise<T>): Promise<RemoteResponse<T>> {
    const fnString = handler.toString();
    return this.sendCommand({
      type: 'page.evaluate',
      payload: { fn: fnString },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Wait for selector
   */
  async waitForSelector(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.waitFor',
      payload: { selector, options },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Observe page for actions
   */
  async observe(instruction?: string): Promise<RemoteResponse<Action[]>> {
    return this.sendCommand({
      type: 'dom.observe',
      payload: { instruction },
      options: { tabId: this.defaultTabId },
    });
  }

  /**
   * Create a locator for this page
   */
  locator(selector: string): RemoteLocator {
    return new RemoteLocator(this.sendCommand, selector);
  }

  /**
   * Create a deep locator (XPath) for this page
   */
  deepLocator(xpath: string): RemoteDeepLocator {
    return new RemoteDeepLocator(this.sendCommand, xpath);
  }

  /**
   * Set default tab ID for operations
   */
  setTabId(tabId: string): void {
    this.defaultTabId = tabId;
  }

  /**
   * Get current tab ID
   */
  getTabId(): string | undefined {
    return this.defaultTabId;
  }
}
