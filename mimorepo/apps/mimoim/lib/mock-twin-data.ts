import type { BrowserTwinState, TabState, WindowState } from "@twin/chrome";

/**
 * Create mock browser twin state for dashboard display
 */
export function createMockTwinState(): BrowserTwinState {
  const now = Date.now();

  // Create mock windows
  const windows: Map<number, WindowState> = new Map([
    [
      1,
      {
        id: 1,
        focused: true,
        top: 0,
        left: 0,
        width: 1920,
        height: 1080,
        type: "normal",
        tabIds: [1, 2, 3, 4, 5],
        lastUpdated: now,
      },
    ],
    [
      2,
      {
        id: 2,
        focused: false,
        top: 100,
        left: 100,
        width: 1280,
        height: 720,
        type: "normal",
        tabIds: [6, 7],
        lastUpdated: now,
      },
    ],
    [
      3,
      {
        id: 3,
        focused: false,
        top: 200,
        left: 200,
        width: 800,
        height: 600,
        type: "popup",
        tabIds: [8],
        lastUpdated: now,
      },
    ],
  ]);

  // Create mock tabs
  const tabs: Map<number, TabState> = new Map([
    // Window 1 tabs
    [
      1,
      {
        id: 1,
        windowId: 1,
        url: "https://github.com",
        title: "GitHub: Let's build from here",
        favIconUrl: "https://github.githubassets.com/favicons/favicon.png",
        status: "complete",
        active: true,
        pinned: false,
        hidden: false,
        index: 0,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    [
      2,
      {
        id: 2,
        windowId: 1,
        url: "https://www.npmjs.com",
        title: "npm - npm registry",
        favIconUrl: "https://static.npmjs.com/favicon.png",
        status: "complete",
        active: false,
        pinned: true,
        hidden: false,
        index: 1,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    [
      3,
      {
        id: 3,
        windowId: 1,
        url: "https://developer.mozilla.org",
        title: "MDN Web Docs",
        favIconUrl: "https://developer.mozilla.org/favicon.ico",
        status: "loading",
        active: false,
        pinned: false,
        hidden: false,
        index: 2,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    [
      4,
      {
        id: 4,
        windowId: 1,
        url: "https://stackoverflow.com",
        title: "Stack Overflow - Where Developers Learn, Share, & Build",
        favIconUrl: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico",
        status: "complete",
        active: false,
        pinned: false,
        hidden: false,
        index: 3,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    [
      5,
      {
        id: 5,
        windowId: 1,
        url: "https://www.youtube.com",
        title: "YouTube",
        favIconUrl: "https://www.youtube.com/favicon.ico",
        status: "complete",
        active: false,
        pinned: false,
        hidden: false,
        index: 4,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    // Window 2 tabs
    [
      6,
      {
        id: 6,
        windowId: 2,
        url: "https://www.google.com",
        title: "Google",
        favIconUrl: "https://www.google.com/favicon.ico",
        status: "complete",
        active: true,
        pinned: false,
        hidden: false,
        index: 0,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    [
      7,
      {
        id: 7,
        windowId: 2,
        url: "https://chat.openai.com",
        title: "ChatGPT",
        favIconUrl: "https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png",
        status: "loading",
        active: false,
        pinned: false,
        hidden: false,
        index: 1,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
    // Window 3 tabs (popup)
    [
      8,
      {
        id: 8,
        windowId: 3,
        url: "chrome://extensions",
        title: "Extensions",
        favIconUrl: null,
        status: "complete",
        active: true,
        pinned: false,
        hidden: false,
        index: 0,
        openerTabId: null,
        lastUpdated: now,
      },
    ],
  ]);

  return {
    windows,
    tabs,
    activeWindowId: 1,
    activeTabId: 1,
    lastUpdated: now,
  };
}
