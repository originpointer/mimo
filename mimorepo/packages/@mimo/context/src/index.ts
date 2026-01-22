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

export { RemotePage } from './page';
export { RemoteLocator, RemoteDeepLocator } from './locator';
export { MimoContext } from './context';

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
} from './types';
