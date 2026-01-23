/**
 * MimoRouter - Browser Command Router (Debug Mode)
 *
 * This module provides command handlers that only log command parameters
 * without executing any actual logic. Useful for debugging and testing.
 */

import type { CommandHandler, HubCommandRequest } from '@mimo/types';
import { HubCommandType } from '@mimo/types';

/**
 * MimoRouter - Browser page command handlers (debug/logging only)
 */
export class MimoRouter {
  /**
   * Navigate to a URL
   */
  static navigate: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.navigate]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Click an element
   */
  static click: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.click]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Fill form field
   */
  static fill: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.fill]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Get page content
   */
  static getContent: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.getContent]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Execute JavaScript code
   */
  static evaluate: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.evaluate]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Get tab list
   */
  static getTabList: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.getTabList]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Screenshot
   */
  static screenshot: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.screenshot]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Hover over element
   */
  static hover: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.hover]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Select dropdown option
   */
  static select: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.select]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Create new tab
   */
  static createTab: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.createTab]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Close tab
   */
  static closeTab: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.closeTab]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Switch tab
   */
  static switchTab: CommandHandler = async (request: HubCommandRequest) => {
    console.log('[MimoRouter.switchTab]', {
      id: request.id,
      type: request.type,
      payload: request.payload,
      options: request.options,
      timestamp: request.timestamp,
    });
    return { success: true };
  };

  /**
   * Register all command handlers with a hub client
   */
  static registerAll(
    hubClient: {
      registerHandler: (type: string, handler: CommandHandler) => void;
    }
  ): void {
    // Browser navigation
    hubClient.registerHandler(HubCommandType.BrowserNavigate, this.navigate);

    // DOM operations
    hubClient.registerHandler(HubCommandType.BrowserClick, this.click);
    hubClient.registerHandler(HubCommandType.BrowserFill, this.fill);
    hubClient.registerHandler(HubCommandType.BrowserHover, this.hover);
    hubClient.registerHandler(HubCommandType.BrowserSelect, this.select);

    // Content retrieval
    hubClient.registerHandler(HubCommandType.BrowserGetContent, this.getContent);
    hubClient.registerHandler(HubCommandType.BrowserEvaluate, this.evaluate);

    // Tab operations
    hubClient.registerHandler(HubCommandType.TabGetList, this.getTabList);
    hubClient.registerHandler(HubCommandType.TabCreate, this.createTab);
    hubClient.registerHandler(HubCommandType.TabClose, this.closeTab);
    hubClient.registerHandler(HubCommandType.TabSwitch, this.switchTab);

    // Screenshot
    hubClient.registerHandler(HubCommandType.BrowserScreenshot, this.screenshot);

    console.log('[MimoRouter] All handlers registered');
  }
}
