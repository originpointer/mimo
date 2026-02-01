/**
 * Socket.IO event names used by Bion.
 *
 * NOTE: These names intentionally align with `.reverse` / Manus-style events
 * to simplify integration, while the payload types in this package remain
 * TS-first (camelCase) and can be encoded/decoded by the codec.
 */

export const BionSocketEvent = {
  /** Backend ↔ Frontend (mixed: user_message + event envelope) */
  Message: 'message',

  /** Backend ↔ Plugin background (Manus-style) */
  BrowserExtensionMessage: 'my_browser_extension_message',

  /** Frontend → Backend (sent over `message`) */
  UserMessage: 'user_message',
  SelectMyBrowser: 'select_my_browser',
} as const;

export type BionSocketEvent = (typeof BionSocketEvent)[keyof typeof BionSocketEvent];

