/**
 * Command Executor - Execute browser operations
 *
 * This module provides command handlers that execute browser operations
 * using Chrome Extension APIs (chrome.tabs, chrome.scripting, etc.)
 */

import type { CommandHandler, HubCommandRequest } from '@mimo/types';
import { HubCommandType } from '@mimo/types';

/**
 * Command Executor - Browser operation handlers
 */
export class CommandExecutor {
  /**
   * Navigate to a URL
   */
  static navigate: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      url: string;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      referer?: string;
    };

    if (!payload.url) {
      throw new Error('URL is required for navigate command');
    }

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    // Navigate to URL
    await chrome.tabs.update(tab.id, { url: payload.url });

    // Wait for navigation to complete
    if (payload.waitUntil) {
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
    }

    return {
      success: true,
      url: payload.url,
      tabId: tab.id,
    };
  };

  /**
   * Click an element
   */
  static click: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      selector?: string;
      xpath?: string;
      coordinates?: { x: number; y: number };
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    if (payload.coordinates) {
      // Use Chrome Debugging Protocol for coordinate clicks
      await chrome.debugger.sendCommand({ tabId: tab.id }, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: payload.coordinates.x,
        y: payload.coordinates.y,
        button: 'left',
        clickCount: 1,
      });

      await chrome.debugger.sendCommand({ tabId: tab.id }, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: payload.coordinates.x,
        y: payload.coordinates.y,
        button: 'left',
        clickCount: 1,
      });
    } else if (payload.selector || payload.xpath) {
      // Execute script to click element
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector, xpath) => {
          let element: HTMLElement | null = null;
          if (xpath) {
            const result = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            element = result.singleNodeValue as HTMLElement;
          } else if (selector) {
            element = document.querySelector(selector);
          }

          if (element) {
            element.click();
            return { success: true };
          }
          return { success: false, error: 'Element not found' };
        },
        args: [payload.selector, payload.xpath],
      });

      if (result[0].result?.success === false) {
        throw new Error('Element not found');
      }
    } else {
      throw new Error('Either selector, xpath, or coordinates must be provided');
    }

    return { success: true };
  };

  /**
   * Fill an input field
   */
  static fill: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      selector: string;
      value: string;
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selector, value) => {
        const element = document.querySelector(selector) as HTMLInputElement | null;
        if (!element) {
          return { success: false, error: 'Element not found' };
        }

        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true };
      },
      args: [payload.selector, payload.value],
    });

    if (result[0].result?.success === false) {
      throw new Error(result[0].result.error);
    }

    return { success: true };
  };

  /**
   * Take a screenshot
   */
  static screenshot: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      format?: 'png' | 'jpeg';
      quality?: number;
      selector?: string;
    };

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    let dataUrl: string;

    if (payload.selector) {
      // For element screenshot, we need to use CDP
      await chrome.debugger.attach({ tabId: tab.id }, '1.3');
      const result = await chrome.debugger.sendCommand(
        { tabId: tab.id },
        'Page.captureScreenshot'
      );
      dataUrl = result.dataUrl;
      await chrome.debugger.detach({ tabId: tab.id });
    } else {
      // Full page screenshot
      dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: payload.format || 'png',
        quality: payload.quality,
      });
    }

    // Convert data URL to base64
    const base64 = dataUrl.split(',')[1];

    return {
      success: true,
      buffer: base64,
      format: payload.format || 'png',
    };
  };

  /**
   * Get page content
   */
  static getContent: CommandHandler = async (request: HubCommandRequest) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          html: document.documentElement.outerHTML,
          text: document.body.innerText,
          url: window.location.href,
          title: document.title,
        };
      },
    });

    return result[0].result;
  };

  /**
   * Evaluate JavaScript in page
   */
  static evaluate: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      script: string;
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (script) => {
        // eslint-disable-next-line no-eval
        return eval(script);
      },
      args: [payload.script],
    });

    return {
      success: true,
      result: result[0].result,
    };
  };

  /**
   * Get tab list
   */
  static getTabList: CommandHandler = async () => {
    const tabs = await chrome.tabs.query({});

    return {
      success: true,
      tabs: tabs.map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
      })),
    };
  };

  /**
   * Create a new tab
   */
  static createTab: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      url?: string;
    };

    const tab = await chrome.tabs.create({
      url: payload.url || 'about:blank',
    });

    return {
      success: true,
      tabId: tab.id,
      url: tab.url,
    };
  };

  /**
   * Close a tab
   */
  static closeTab: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      tabId?: number;
    };

    const tabId = payload.tabId;
    if (!tabId) {
      // Close active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.remove(tab.id);
      }
    } else {
      await chrome.tabs.remove(tabId);
    }

    return { success: true };
  };

  /**
   * Switch to a tab
   */
  static switchTab: CommandHandler = async (request: HubCommandRequest) => {
    const payload = request.payload as {
      tabId: number;
    };

    await chrome.tabs.update(payload.tabId, { active: true });

    // Also switch to the window containing the tab
    const tab = await chrome.tabs.get(payload.tabId);
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }

    return { success: true, tabId: payload.tabId };
  };

  /**
   * Register all command handlers with a hub client
   */
  static registerAllHandlers(
    hubClient: {
      registerHandler: (type: string, handler: CommandHandler) => void;
    }
  ): void {
    hubClient.registerHandler(HubCommandType.BrowserNavigate, this.navigate);
    hubClient.registerHandler(HubCommandType.BrowserClick, this.click);
    hubClient.registerHandler(HubCommandType.BrowserFill, this.fill);
    hubClient.registerHandler(HubCommandType.BrowserScreenshot, this.screenshot);
    hubClient.registerHandler(HubCommandType.BrowserGetContent, this.getContent);
    hubClient.registerHandler(HubCommandType.BrowserEvaluate, this.evaluate);
    hubClient.registerHandler(HubCommandType.TabGetList, this.getTabList);
    hubClient.registerHandler(HubCommandType.TabCreate, this.createTab);
    hubClient.registerHandler(HubCommandType.TabClose, this.closeTab);
    hubClient.registerHandler(HubCommandType.TabSwitch, this.switchTab);
  }
}
