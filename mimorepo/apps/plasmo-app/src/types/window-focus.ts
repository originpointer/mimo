/**
 * Window Focus - Execute window.focus() on a target tab
 */

import type { HandlerContext, ResponseCallback } from '../background/handlers/types';
import { TabResolver } from '../background/utils/tab-resolver';

/**
 * Window focus message type
 */
export const WINDOW_FOCUS = 'WINDOW_FOCUS';

/**
 * Window focus payload
 */
export interface WindowFocusPayload {
  targetTabId?: number;
}

/**
 * Window focus response
 */
export interface WindowFocusResponse {
  ok: boolean;
  hasFocus?: boolean;
  visibilityState?: string;
  activeElement?: string;
  error?: string;
}

/**
 * Handle WINDOW_FOCUS message
 */
export function handleWindowFocus(
  message: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: ResponseCallback<WindowFocusResponse>
): boolean {
  const payload = message.payload as Partial<WindowFocusPayload> | undefined;
  const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

  const runOnTab = async (tabId: number) => {
    try {
      await TabResolver.resolveTab(requestedTabId);

      // Execute window.focus() in the target tab
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          window.focus();
          return {
            hasFocus: document.hasFocus(),
            visibilityState: document.visibilityState,
            activeElement: document.activeElement?.tagName,
          };
        },
      });

      const data = result[0]?.result as { hasFocus: boolean; visibilityState: string; activeElement: string };
      sendResponse({
        ok: true,
        hasFocus: data?.hasFocus,
        visibilityState: data?.visibilityState,
        activeElement: data?.activeElement,
      } satisfies WindowFocusResponse);
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies WindowFocusResponse);
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
        error: error instanceof Error ? error.message : String(error),
      } satisfies WindowFocusResponse);
    });

  return true;
}
