/**
 * MimoContext - Context manager for tabs and pages
 */

import type { RemoteResponse, TabInfo } from '@mimo/types';
import { HubCommandType } from '@mimo/types';
import { RemotePage } from './page.js';

/**
 * MimoContext - Context manager for tabs and remote pages
 */
export class MimoContext {
  private tabPages = new Map<string, RemotePage>();

  constructor(
    private sendCommand: (command: any) => Promise<RemoteResponse>
  ) {}

  /**
   * Get all tabs
   */
  async tabs(): Promise<RemoteResponse<TabInfo[]>> {
    return this.sendCommand({
      type: HubCommandType.TabGetList,
      payload: {},
    });
  }

  /**
   * Get active tab
   */
  async activeTab(): Promise<RemoteResponse<TabInfo>> {
    return this.sendCommand({
      type: HubCommandType.TabGetActive,
      payload: {},
    });
  }

  /**
   * Switch to specific tab
   */
  async switchToTab(tabId: string): Promise<RemoteResponse<void>> {
    return this.sendCommand({
      type: HubCommandType.TabSwitch,
      payload: { tabId },
    });
  }

  /**
   * Create new tab
   */
  async newTab(url?: string): Promise<RemoteResponse<TabInfo>> {
    return this.sendCommand({
      type: HubCommandType.TabCreate,
      payload: { url },
    });
  }

  /**
   * Close tab
   */
  async closeTab(tabId: string): Promise<RemoteResponse<void>> {
    const result = await this.sendCommand({
      type: HubCommandType.TabClose,
      payload: { tabId },
    });

    // Clean up page cache
    this.tabPages.delete(tabId);

    return result;
  }

  /**
   * Get RemotePage for specific tab
   */
  page(tabId?: string): RemotePage {
    const targetTabId = tabId ?? this.defaultTabId;

    if (!targetTabId) {
      throw new Error('No tab ID specified and no default tab ID set');
    }

    let page = this.tabPages.get(targetTabId);
    if (!page) {
      page = new RemotePage(this.sendCommand, targetTabId);
      this.tabPages.set(targetTabId, page);
    }

    return page;
  }

  /**
   * Set default tab ID
   */
  setDefaultTabId(tabId: string): void {
    this.defaultTabId = tabId;
  }

  /**
   * Get default tab ID
   */
  getDefaultTabId(): string | undefined {
    return this.defaultTabId;
  }

  private defaultTabId?: string;
}
