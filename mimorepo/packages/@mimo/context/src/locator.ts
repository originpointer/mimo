/**
 * RemoteLocator and RemoteDeepLocator
 * Remote proxy classes for element locators
 */

import type { RemoteResponse, LocatorOptions } from '@mimo/types';
import { HubCommandType } from '@mimo/types';

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
      type: HubCommandType.DomTextContent,
      payload: { selector: this.selector },
    });
  }

  /**
   * Get the element's inner HTML
   */
  async innerHTML(): Promise<RemoteResponse<string>> {
    return this.sendCommand({
      type: HubCommandType.DomInnerHTML,
      payload: { selector: this.selector },
    });
  }

  /**
   * Get the element's attribute
   */
  async getAttribute(name: string): Promise<RemoteResponse<string | null>> {
    return this.sendCommand({
      type: HubCommandType.DomGetAttribute,
      payload: { selector: this.selector, name },
    });
  }

  /**
   * Check if element is visible
   */
  async isVisible(): Promise<RemoteResponse<boolean>> {
    return this.sendCommand({
      type: HubCommandType.DomIsVisible,
      payload: { selector: this.selector },
    });
  }

  /**
   * Wait for element
   */
  async waitFor(options?: LocatorOptions): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: HubCommandType.DomWaitFor,
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
      type: HubCommandType.BrowserClick,
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
      type: HubCommandType.BrowserFill,
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
      type: HubCommandType.BrowserSelect,
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
      type: HubCommandType.BrowserHover,
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
      type: HubCommandType.DomBoundingBox,
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
      type: HubCommandType.BrowserClick,
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
      type: HubCommandType.BrowserFill,
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
      type: HubCommandType.BrowserHover,
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
      type: HubCommandType.DomDeepLocatorAll,
      payload: { xpath: this.xpath },
    });
  }

  /**
   * Get first element matching this XPath
   */
  async first(): Promise<RemoteResponse<any>> {
    return this.sendCommand({
      type: HubCommandType.DomDeepLocatorFirst,
      payload: { xpath: this.xpath },
    });
  }
}
