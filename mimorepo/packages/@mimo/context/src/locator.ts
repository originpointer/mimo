/**
 * RemoteLocator and RemoteDeepLocator
 * Remote proxy classes for element locators
 */

import type { RemoteResponse, LocatorOptions } from '@mimo/types';

/**
 * Abstract base class for remote locators
 */
abstract class BaseRemoteLocator {
  constructor(
    protected sendCommand: (command: any) => Promise<RemoteResponse>,
    protected selector: string
  ) {}

  /**
   * Get the element's text content
   */
  async textContent(): Promise<RemoteResponse<string>> {
    return this.sendCommand({
      type: 'dom.textContent',
      payload: { selector: this.selector },
    });
  }

  /**
   * Get the element's inner HTML
   */
  async innerHTML(): Promise<RemoteResponse<string>> {
    return this.sendCommand({
      type: 'dom.innerHTML',
      payload: { selector: this.selector },
    });
  }

  /**
   * Get the element's attribute
   */
  async getAttribute(name: string): Promise<RemoteResponse<string | null>> {
    return this.sendCommand({
      type: 'dom.getAttribute',
      payload: { selector: this.selector, name },
    });
  }

  /**
   * Check if element is visible
   */
  async isVisible(): Promise<RemoteResponse<boolean>> {
    return this.sendCommand({
      type: 'dom.isVisible',
      payload: { selector: this.selector },
    });
  }

  /**
   * Wait for element
   */
  async waitFor(options?: LocatorOptions): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'dom.waitFor',
      payload: { selector: this.selector, options },
    });
  }
}

/**
 * RemoteLocator - CSS selector based locator
 */
export class RemoteLocator extends BaseRemoteLocator {
  /**
   * Click the element
   */
  async click(options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    delay?: number;
  }): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.click',
      payload: {
        selector: this.selector,
        ...options,
      },
    });
  }

  /**
   * Fill input element
   */
  async fill(value: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.fill',
      payload: {
        selector: this.selector,
        value,
      },
    });
  }

  /**
   * Select option from select element
   */
  async select(value: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.select',
      payload: {
        selector: this.selector,
        value,
      },
    });
  }

  /**
   * Hover over element
   */
  async hover(): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.hover',
      payload: { selector: this.selector },
    });
  }

  /**
   * Get bounding box
   */
  async boundingBox(): Promise<RemoteResponse<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>> {
    return this.sendCommand({
      type: 'dom.boundingBox',
      payload: { selector: this.selector },
    });
  }
}

/**
 * RemoteDeepLocator - XPath based locator
 */
export class RemoteDeepLocator extends BaseRemoteLocator {
  constructor(
    sendCommand: (command: any) => Promise<RemoteResponse>,
    xpath: string
  ) {
    super(sendCommand, `xpath=${xpath}`);
    this.xpath = xpath;
  }

  private xpath: string;

  /**
   * Click the element using XPath
   */
  async click(options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    delay?: number;
  }): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.click',
      payload: {
        selector: this.xpath,
        selectorType: 'xpath',
        ...options,
      },
    });
  }

  /**
   * Fill input element using XPath
   */
  async fill(value: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.fill',
      payload: {
        selector: this.xpath,
        selectorType: 'xpath',
        value,
      },
    });
  }

  /**
   * Hover over element using XPath
   */
  async hover(): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: 'page.hover',
      payload: {
        selector: this.xpath,
        selectorType: 'xpath',
      },
    });
  }

  /**
   * Get all elements matching this XPath
   */
  async all(): Promise<RemoteResponse<Element[]>> {
    return this.sendCommand({
      type: 'dom.deepLocator.all',
      payload: { xpath: this.xpath },
    });
  }

  /**
   * Get first element matching this XPath
   */
  async first(): Promise<RemoteResponse<any>> {
    return this.sendCommand({
      type: 'dom.deepLocator.first',
      payload: { xpath: this.xpath },
    });
  }
}
