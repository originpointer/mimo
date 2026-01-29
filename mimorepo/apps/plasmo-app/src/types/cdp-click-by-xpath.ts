/**
 * CDP Click by XPath - Click elements using Chrome DevTools Protocol
 */

import type { HandlerContext, ResponseCallback } from '../background/handlers/types';
import { TabResolver } from '../background/utils/tab-resolver';

/**
 * CDP click by XPath message type
 */
export const CDP_CLICK_BY_XPATH = 'CDP_CLICK_BY_XPATH';

/**
 * CDP click by XPath payload
 */
export interface CdpClickByXPathPayload {
  xpath: string;
  targetTabId?: number;
}

/**
 * Element info from CDP
 */
export interface CdpElementInfo {
  tagName: string;
  text: string;
  coordinates: { x: number; y: number };
}

/**
 * CDP click by XPath response
 */
export interface CdpClickByXPathResponse {
  ok: boolean;
  clicked: boolean;
  elementInfo?: CdpElementInfo;
  error?: string;
}

/**
 * Handle CDP_CLICK_BY_XPATH message
 */
export function handleCdpClickByXPath(
  message: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: ResponseCallback<CdpClickByXPathResponse>
): boolean {
  const payload = message.payload as Partial<CdpClickByXPathPayload> | undefined;
  const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;
  const xpath = typeof payload?.xpath === 'string' ? payload.xpath.trim() : '';

  if (!xpath) {
    sendResponse({ ok: false, clicked: false, error: 'xpath is empty' } satisfies CdpClickByXPathResponse);
    return true;
  }

  const runOnTab = async (tabId: number) => {
    let debuggerAttached = false;
    try {
      await TabResolver.resolveTab(requestedTabId);

      // 1. Attach debugger
      await chrome.debugger.attach({ tabId }, '1.3');
      debuggerAttached = true;

      // 2. Get document root
      const rootResult = await chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument') as { root: { nodeId: number } };

      // 3. Perform XPath search
      const searchResult = await chrome.debugger.sendCommand(
        { tabId },
        'DOM.performSearch',
        { query: xpath, includeUserAgentShadowDOM: true }
      ) as { searchId: number; resultCount: number };

      if (!searchResult || searchResult.resultCount === 0) {
        sendResponse({ ok: false, clicked: false, error: '未找到匹配的元素' } satisfies CdpClickByXPathResponse);
        return;
      }

      // 4. Get search results
      const nodesResult = await chrome.debugger.sendCommand(
        { tabId },
        'DOM.getSearchResults',
        { searchId: searchResult.searchId, fromIndex: 0, toIndex: 1 }
      ) as { nodeIds: number[] };

      if (!nodesResult || !nodesResult.nodeIds || nodesResult.nodeIds.length === 0) {
        sendResponse({ ok: false, clicked: false, error: '未找到匹配的元素' } satisfies CdpClickByXPathResponse);
        return;
      }

      const nodeId = nodesResult.nodeIds[0];

      // 5. Get box model for coordinates
      const boxModelResult = await chrome.debugger.sendCommand(
        { tabId },
        'DOM.getBoxModel',
        { nodeId }
      ) as { model: { content: number[] } };

      if (!boxModelResult || !boxModelResult.model || !boxModelResult.model.content) {
        sendResponse({ ok: false, clicked: false, error: '无法获取元素坐标' } satisfies CdpClickByXPathResponse);
        return;
      }

      // Calculate center point
      const content = boxModelResult.model.content;
      const x = (content[0] + content[2] + content[4] + content[6]) / 4;
      const y = (content[1] + content[5]) / 2;

      // 6. Execute window.focus() first
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.focus(),
      });

      // 7. Send mouse press event
      await chrome.debugger.sendCommand(
        { tabId },
        'Input.dispatchMouseEvent',
        { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }
      );

      // 8. Send mouse release event
      await chrome.debugger.sendCommand(
        { tabId },
        'Input.dispatchMouseEvent',
        { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }
      );

      // 9. Get element info
      const nodeResult = await chrome.debugger.sendCommand(
        { tabId },
        'DOM.describeNode',
        { nodeId }
      ) as { node: { nodeName: string; nodeValue?: string } };

      sendResponse({
        ok: true,
        clicked: true,
        elementInfo: {
          tagName: nodeResult.node.nodeName,
          text: nodeResult.node.nodeValue || '',
          coordinates: { x, y },
        },
      } satisfies CdpClickByXPathResponse);
    } catch (error) {
      sendResponse({
        ok: false,
        clicked: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies CdpClickByXPathResponse);
    } finally {
      // Detach debugger
      if (debuggerAttached) {
        try {
          await chrome.debugger.detach({ tabId });
        } catch {
          // Ignore detach errors
        }
      }
    }
  };

  if (requestedTabId != null) {
    runOnTab(requestedTabId);
    return true;
  }

  TabResolver.resolveTab()
    .then(({ tabId }) => runOnTab(tabId))
    .catch((error) => {
      sendResponse({
        ok: false,
        clicked: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies CdpClickByXPathResponse);
    });

  return true;
}
