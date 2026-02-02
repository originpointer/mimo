/**
 * Window Focus - Execute window.focus() on a target tab
 */

import type { ResponseCallback } from '../background/handlers/types';

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
  // Disabled by policy: browser automation must not steal focus.
  sendResponse({ ok: false, error: 'WINDOW_FOCUS is disabled by policy (no focus stealing).' } satisfies WindowFocusResponse);
  return true;
}
