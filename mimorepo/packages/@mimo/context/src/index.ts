/**
 * @mimo/lib/context
 *
 * Remote proxy classes for page and context operations
 *
 * This package provides:
 * - RemotePage: Proxy for page operations via MimoBus
 * - RemoteLocator: CSS selector based locator
 * - RemoteDeepLocator: XPath based locator
 * - MimoContext: Context manager for tabs and pages
 */

export { RemotePage } from './page.js';
export { RemoteLocator, RemoteDeepLocator } from './locator.js';
export { MimoContext } from './context.js';

export type {
  RemoteResponse,
  TabInfo,
  NavigateOptions,
  ScreenshotOptions,
  ClickOptions,
  FillOptions,
  LocatorOptions,
  PageContent,
  ElementInfo,
  Action,
} from './types.js';
