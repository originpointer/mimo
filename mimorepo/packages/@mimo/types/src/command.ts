/**
 * Command types
 */

/**
 * Command types that can be sent through MimoBus
 */
export enum CommandType {
  // Page operations
  PageInit = "page.init",
  PageGoto = "page.goto",
  PageReload = "page.reload",
  PageGoBack = "page.goBack",
  PageGoForward = "page.goForward",
  PageGetUrl = "page.getUrl",
  PageGetTitle = "page.getTitle",
  PageGetContent = "page.getContent",
  PageAct = "page.act",
  PageExtract = "page.extract",
  // Element interactions
  PageClick = "page.click",
  PageFill = "page.fill",
  PageSelect = "page.select",
  PageHover = "page.hover",
  // DOM operations
  DomObserve = "dom.observe",
  DomLocator = "dom.locator",
  DomDeepLocator = "dom.deepLocator",
  DomMark = "dom.mark",
  DomUnmark = "dom.unmark",
  DomUnmarkAll = "dom.unmarkAll",
  // Screenshot and execution
  PageScreenshot = "page.screenshot",
  PageEvaluate = "page.evaluate",
  PageWaitFor = "page.waitFor",
  // Browser operations
  BrowserGetTabs = "browser.getTabs",
  BrowserGetActiveTab = "browser.getActiveTab",
  BrowserSwitchTab = "browser.switchTab",
  BrowserNewTab = "browser.newTab",
  BrowserCloseTab = "browser.closeTab",
  BrowserClose = "browser.close",
  // Stream operations
  StreamStart = "stream.start",
  StreamChunk = "stream.chunk",
  StreamEnd = "stream.end",
}

/**
 * MimoBus command structure
 */
export interface MimoCommand {
  id: string;
  type: CommandType;
  payload: unknown;
  options?: {
    timeout?: number;
    tabId?: string;
    frameId?: string;
  };
  timestamp: number;
}
