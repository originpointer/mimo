/**
 * Tab Resolver Utility
 *
 * Centralizes tab resolution logic for message handlers.
 * Supports both explicit tabId and active tab fallback.
 */

export interface TabResolution {
  tabId: number;
  tabUrl: string;
}

export class TabResolver {
  /**
   * Resolve ONLY an explicit tabId.
   *
   * This intentionally does not fall back to the active tab, to avoid accidentally
   * operating on user command UI tabs (e.g. chat/id page) or other unrelated tabs.
   */
  static async resolveExplicitTab(requestedTabId: number | undefined): Promise<TabResolution> {
    if (requestedTabId == null) {
      throw new Error('targetTabId is required');
    }

    return await TabResolver.resolveTab(requestedTabId);
  }

  /**
   * Resolve a tab from either an explicit tabId or the active tab.
   *
   * @param requestedTabId - Optional explicit tab ID to resolve
   * @returns Promise resolving to TabResolution with tabId and tabUrl
   * @throws Error if tab cannot be resolved
   */
  static async resolveTab(requestedTabId?: number): Promise<TabResolution> {
    // If explicit tabId is provided, use it
    if (requestedTabId != null) {
      return new Promise<TabResolution>((resolve, reject) => {
        chrome.tabs.get(requestedTabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`tabs.get failed: ${chrome.runtime.lastError?.message}`));
            return;
          }

          if (!tab || typeof tab.id !== 'number') {
            reject(new Error(`Invalid tab: ${requestedTabId}`));
            return;
          }

          resolve({
            tabId: tab.id,
            tabUrl: tab.url || '',
          });
        });
      });
    }

    // Otherwise, resolve the active tab in the current window
    return new Promise<TabResolution>((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`tabs.query failed: ${chrome.runtime.lastError?.message}`));
          return;
        }

        const tab = tabs?.[0];
        if (!tab || typeof tab.id !== 'number') {
          reject(new Error('No active tab found'));
          return;
        }

        resolve({
          tabId: tab.id,
          tabUrl: tab.url || '',
        });
      });
    });
  }

  /**
   * Resolve a tab and validate its URL with the provided validator function.
   *
   * @param requestedTabId - Optional explicit tab ID to resolve
   * @param urlValidator - Function to validate if URL is scannable
   * @param errorMessage - Custom error message for invalid URLs
   * @returns Promise resolving to TabResolution with tabId and tabUrl
   * @throws Error if tab cannot be resolved or URL is invalid
   */
  static async resolveTabWithValidation(
    requestedTabId: number | undefined,
    urlValidator: (url: string) => boolean,
    errorMessage: string = '目标 Tab 不可处理。请使用 http/https 页面。'
  ): Promise<TabResolution> {
    const resolution = await TabResolver.resolveTab(requestedTabId);

    if (!urlValidator(resolution.tabUrl)) {
      throw new Error(`${errorMessage} (url=${resolution.tabUrl || 'unknown'})`);
    }

    return resolution;
  }
}
