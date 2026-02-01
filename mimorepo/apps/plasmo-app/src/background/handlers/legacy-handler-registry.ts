/**
 * Legacy Handler Registry
 *
 * Manages routing for the 13 legacy message types.
 * This registry handles the old custom message protocol before HubCommandType was introduced.
 */

import type { StagehandXPathManager } from '../managers/stagehand-xpath-manager';
import type { BionSocketManager } from '../managers/mimo-engine-manager';
import { TabResolver } from '../utils/tab-resolver';
import { UrlValidator } from '../utils/url-validator';
import { postToolCallResult } from '@/apis';
import type {
  StagehandXPathScanPayload,
  StagehandXPathScanResponse,
} from '../../types/stagehand-xpath';
import type {
  StagehandViewportScreenshotPayload,
  StagehandViewportScreenshotResponse,
} from '../../types/stagehand-screenshot';
import type {
  ResumeBlocksExtractPayload,
  ResumeBlocksExtractResponse,
} from '../../types/resume-blocks';
import type {
  ResumeXpathValidatePayload,
  ResumeXpathValidateResponse,
} from '../../types/resume-validate';
import type {
  JsonCommonXpathFindPayload,
  JsonCommonXpathFindResponse,
} from '../../types/json-common-xpath';
import type {
  XPathMarkElementsPayload,
  XPathMarkElementsResponse,
} from '../../types/xpath-mark';
import type { XPathGetHtmlPayload, XPathGetHtmlResponse } from '../../types/xpath-get-html';
import type { ListTabsPayload, ListTabsResponse } from '../../types/list-tabs';
import type {
  CreateTabGroupPayload,
  UpdateTabGroupPayload,
  DeleteTabGroupPayload,
  QueryTabGroupsPayload,
  AddTabsToGroupPayload,
  TabGroupResponse,
  QueryTabGroupsResponse,
} from '../../types/tab-groups';
import { STAGEHAND_XPATH_SCAN } from '../../types/stagehand-xpath';
import { STAGEHAND_VIEWPORT_SCREENSHOT } from '../../types/stagehand-screenshot';
import { RESUME_BLOCKS_EXTRACT } from '../../types/resume-blocks';
import { RESUME_XPATH_VALIDATE } from '../../types/resume-validate';
import { JSON_COMMON_XPATH_FIND } from '../../types/json-common-xpath';
import { XPATH_MARK_ELEMENTS } from '../../types/xpath-mark';
import { XPATH_GET_HTML } from '../../types/xpath-get-html';
import { LIST_TABS } from '../../types/list-tabs';
import {
  CREATE_TAB_GROUP,
  UPDATE_TAB_GROUP,
  DELETE_TAB_GROUP,
  QUERY_TAB_GROUPS,
  ADD_TABS_TO_GROUP,
} from '../../types/tab-groups';
import { WINDOW_FOCUS, handleWindowFocus } from '../../types/window-focus';
import { CDP_CLICK_BY_XPATH, handleCdpClickByXPath } from '../../types/cdp-click-by-xpath';
import type { HandlerContext, ResponseCallback } from './types';
import { LegacyMessageType } from './types';
import type { PageStateInfo } from '../../../cached/page-state.type';

/**
 * Legacy Handler Registry
 *
 * Routes legacy message types to their respective handlers.
 */
export class LegacyHandlerRegistry {
  constructor(
    private stagehandManager: StagehandXPathManager,
    private bionSocketManager: BionSocketManager
  ) {}

  private readonly lastPageStateByTabId = new Map<number, PageStateInfo>();

  private async getBionClientIdFromStorage(): Promise<string | null> {
    try {
      const key = 'bionClientId';
      const existing = await chrome.storage.local.get(key);
      const value = existing?.[key];
      return typeof value === 'string' && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  /**
   * Handle a legacy message
   *
   * @param message - The Chrome runtime message
   * @param sender - The message sender
   * @param sendResponse - Response callback
   * @returns true if the message was handled, false otherwise
   */
  handle(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean {
    const messageType = message.type;

    switch (messageType) {
      case LegacyMessageType.PAGE_STATE_CHANGE: {
        // Content script pushes page load state changes for debugging/observability.
        // Important: respond immediately to avoid "message channel closed" errors in the sender.
        const tabId = sender?.tab?.id;
        if (typeof tabId === 'number') {
          const payload = (message?.payload || null) as PageStateInfo | null;
          if (payload && typeof payload === 'object') {
            this.lastPageStateByTabId.set(tabId, payload);
          }
        }
        sendResponse({ ok: true });
        return true;
      }
      case LegacyMessageType.GET_BION_CLIENT_INFO:
        void (async () => {
          try {
            const extensionId = chrome.runtime?.id || '';
            const manifest = chrome.runtime?.getManifest?.();
            const extensionName =
              typeof manifest?.name === 'string' ? manifest.name : '';
            const version =
              typeof manifest?.version === 'string' ? manifest.version : '';

            const clientId = await this.getBionClientIdFromStorage();
            const socketConnected = this.bionSocketManager.isConnected();

            sendResponse({
              ok: true,
              extensionId,
              extensionName,
              version,
              clientId,
              socketConnected,
            });
          } catch (e) {
            sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        })();
        return true;
      case STAGEHAND_XPATH_SCAN:
        return this.handleStagehandXPathScan(message, sender, sendResponse);
      case STAGEHAND_VIEWPORT_SCREENSHOT:
        return this.handleStagehandViewportScreenshot(message, sender, sendResponse);
      case RESUME_BLOCKS_EXTRACT:
        return this.handleResumeBlocksExtract(message, sender, sendResponse);
      case RESUME_XPATH_VALIDATE:
        return this.handleResumeXpathValidate(message, sender, sendResponse);
      case JSON_COMMON_XPATH_FIND:
        return this.handleJsonCommonXpathFind(message, sender, sendResponse);
      case XPATH_MARK_ELEMENTS:
        return this.handleXpathMarkElements(message, sender, sendResponse);
      case XPATH_GET_HTML:
        return this.handleXpathGetHtml(message, sender, sendResponse);
      case LIST_TABS:
        return this.handleListTabs(message, sender, sendResponse);
      case CREATE_TAB_GROUP:
        return this.handleCreateTabGroup(message, sender, sendResponse);
      case UPDATE_TAB_GROUP:
        return this.handleUpdateTabGroup(message, sender, sendResponse);
      case DELETE_TAB_GROUP:
        return this.handleDeleteTabGroup(message, sender, sendResponse);
      case QUERY_TAB_GROUPS:
        return this.handleQueryTabGroups(message, sender, sendResponse);
      case ADD_TABS_TO_GROUP:
        return this.handleAddTabsToGroup(message, sender, sendResponse);
      case WINDOW_FOCUS:
        return handleWindowFocus(message, sender, sendResponse);
      case CDP_CLICK_BY_XPATH:
        return handleCdpClickByXPath(message, sender, sendResponse);
      default:
        return false;
    }
  }

  /**
   * Handle STAGEHAND_XPATH_SCAN message
   */
  private handleStagehandXPathScan(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<StagehandXPathScanResponse>
  ): boolean {
    const payload = message.payload as Partial<StagehandXPathScanPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

    const runOnTab = async (tabId: number) => {
      try {
        const { tabId, tabUrl } = await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可扫描。请使用 http/https 页面。'
        );

        const maxItems =
          typeof payload?.maxItems === 'number' && Number.isFinite(payload.maxItems) && payload.maxItems > 0
            ? Math.floor(payload.maxItems)
            : 200;
        const selector =
          typeof payload?.selector === 'string' && payload.selector.trim()
            ? payload.selector.trim()
            : 'a,button,input,textarea,select,[role="button"],[onclick]';
        const includeShadow = Boolean(payload?.includeShadow);

        const resp = await this.stagehandManager.getScanner().scan(tabId, { maxItems, selector, includeShadow });
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies StagehandXPathScanResponse);
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
        } satisfies StagehandXPathScanResponse);
      });

    return true;
  }

  /**
   * Handle STAGEHAND_VIEWPORT_SCREENSHOT message
   */
  private handleStagehandViewportScreenshot(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<StagehandViewportScreenshotResponse>
  ): boolean {
    const payload = message.payload as Partial<StagehandViewportScreenshotPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;
    const taskId = typeof payload?.taskId === 'string' ? payload.taskId : undefined;
    const extensionId = chrome.runtime?.id || '';

    const reportToolCallResult = (input: {
      ok: boolean;
      dataUrl?: string;
      base64?: string;
      meta?: unknown;
      error?: string;
    }) => {
      if (!taskId) return;
      void postToolCallResult({
        taskId,
        extensionId,
        toolType: 'viewportScreenshot',
        ...input,
      });
    };

    const runOnTab = async (tabId: number) => {
      try {
        const { tabUrl } = await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可截图。请使用 http/https 页面。'
        );

        const resp = await this.stagehandManager.getScreenshotter().screenshotViewport(tabId);
        if (resp.ok) {
          reportToolCallResult({
            ok: true,
            dataUrl: resp.dataUrl,
            base64: resp.base64,
            meta: resp.meta,
          });
        } else {
          const errorMessage = 'error' in resp ? resp.error : 'viewport screenshot failed';
          reportToolCallResult({ ok: false, error: errorMessage });
        }
        sendResponse(resp);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reportToolCallResult({ ok: false, error: message });
        sendResponse({
          ok: false,
          error: message,
        } satisfies StagehandViewportScreenshotResponse);
      }
    };

    if (requestedTabId != null) {
      runOnTab(requestedTabId);
      return true;
    }

    TabResolver.resolveTab()
      .then(({ tabId }) => runOnTab(tabId))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        reportToolCallResult({ ok: false, error: message });
        sendResponse({
          ok: false,
          error: message,
        } satisfies StagehandViewportScreenshotResponse);
      });

    return true;
  }

  /**
   * Handle RESUME_BLOCKS_EXTRACT message
   */
  private handleResumeBlocksExtract(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<ResumeBlocksExtractResponse>
  ): boolean {
    const payload = message.payload as Partial<ResumeBlocksExtractPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

    const runOnTab = async (tabId: number) => {
      try {
        await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可抽取。请使用 http/https 页面。'
        );

        const maxBlocks =
          typeof payload?.maxBlocks === 'number' && Number.isFinite(payload.maxBlocks) && payload.maxBlocks > 0
            ? Math.floor(payload.maxBlocks)
            : 60;
        const minTextLen =
          typeof payload?.minTextLen === 'number' && Number.isFinite(payload.minTextLen) && payload.minTextLen >= 0
            ? Math.floor(payload.minTextLen)
            : 80;
        const maxTextLen =
          typeof payload?.maxTextLen === 'number' && Number.isFinite(payload.maxTextLen) && payload.maxTextLen > 0
            ? Math.floor(payload.maxTextLen)
            : 2000;
        const includeShadow = Boolean(payload?.includeShadow);
        const noiseSelectors =
          typeof payload?.noiseSelectors === 'string' && payload.noiseSelectors.trim()
            ? payload.noiseSelectors.trim()
            : 'header,nav,footer,aside,[role=banner],[role=navigation]';
        const noiseClassIdRegex =
          typeof payload?.noiseClassIdRegex === 'string' && payload.noiseClassIdRegex.trim()
            ? payload.noiseClassIdRegex.trim()
            : 'nav|menu|footer|header|sidebar|toolbar|pagination|breadcrumb|ads|comment';

        const resp = await this.stagehandManager
          .getResumeBlocksExtractor()
          .extract(tabId, { maxBlocks, minTextLen, maxTextLen, includeShadow, noiseSelectors, noiseClassIdRegex });
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies ResumeBlocksExtractResponse);
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
        } satisfies ResumeBlocksExtractResponse);
      });

    return true;
  }

  /**
   * Handle RESUME_XPATH_VALIDATE message
   */
  private handleResumeXpathValidate(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<ResumeXpathValidateResponse>
  ): boolean {
    const payload = message.payload as Partial<ResumeXpathValidatePayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;
    const xpaths = Array.isArray(payload?.xpaths) ? payload!.xpaths : [];

    if (!xpaths.length) {
      sendResponse({ ok: false, error: 'xpaths is empty' } satisfies ResumeXpathValidateResponse);
      return true;
    }

    const runOnTab = async (tabId: number) => {
      try {
        await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可验证。请使用 http/https 页面。'
        );

        const resp = await this.stagehandManager.getResumeXpathValidator().validate(tabId, xpaths);
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies ResumeXpathValidateResponse);
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
        } satisfies ResumeXpathValidateResponse);
      });

    return true;
  }

  /**
   * Handle JSON_COMMON_XPATH_FIND message
   */
  private handleJsonCommonXpathFind(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<JsonCommonXpathFindResponse>
  ): boolean {
    const payload = message.payload as Partial<JsonCommonXpathFindPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

    const runOnTab = async (tabId: number) => {
      try {
        await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可扫描。请使用 http/https 页面。'
        );

        const resp = await this.stagehandManager
          .getJsonCommonXpathFinder()
          .find(tabId, (payload || {}) as JsonCommonXpathFindPayload);
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies JsonCommonXpathFindResponse);
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
        } satisfies JsonCommonXpathFindResponse);
      });

    return true;
  }

  /**
   * Handle XPATH_MARK_ELEMENTS message
   */
  private handleXpathMarkElements(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<XPathMarkElementsResponse>
  ): boolean {
    const payload = message.payload as Partial<XPathMarkElementsPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;
    const rawMode = typeof payload?.mode === 'string' ? payload.mode : 'mark';
    const mode = rawMode === 'clear' ? 'clear' : 'mark';
    const xpaths = Array.isArray(payload?.xpaths) ? payload!.xpaths : [];

    const runOnTab = async (tabId: number) => {
      try {
        await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可扫描。请使用 http/https 页面。'
        );

        if (mode !== 'clear' && !xpaths.length) {
          sendResponse({ ok: false, error: 'xpaths is empty' } satisfies XPathMarkElementsResponse);
          return;
        }

        const resp = await this.stagehandManager.getXpathMarker().run(tabId, { mode, xpaths });
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies XPathMarkElementsResponse);
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
        } satisfies XPathMarkElementsResponse);
      });

    return true;
  }

  /**
   * Handle XPATH_GET_HTML message
   */
  private handleXpathGetHtml(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<XPathGetHtmlResponse>
  ): boolean {
    const payload = message.payload as Partial<XPathGetHtmlPayload> | undefined;
    const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;
    const xpath = typeof payload?.xpath === 'string' ? payload.xpath.trim() : '';
    const maxChars =
      typeof payload?.maxChars === 'number' && Number.isFinite(payload.maxChars) ? payload.maxChars : undefined;

    if (!xpath) {
      sendResponse({ ok: false, error: 'xpath is empty' } satisfies XPathGetHtmlResponse);
      return true;
    }

    const runOnTab = async (tabId: number) => {
      try {
        await TabResolver.resolveTabWithValidation(
          requestedTabId,
          UrlValidator.isScannableUrl.bind(UrlValidator),
          '目标 Tab 不可扫描。请使用 http/https 页面。'
        );

        const resp = await this.stagehandManager.getXpathHtmlGetter().get(tabId, { xpath, maxChars });
        sendResponse(resp);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies XPathGetHtmlResponse);
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
        } satisfies XPathGetHtmlResponse);
      });

    return true;
  }

  /**
   * Handle LIST_TABS message
   */
  private handleListTabs(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<ListTabsResponse>
  ): boolean {
    const payload = message.payload as ListTabsPayload | undefined;
    const query = payload?.includeAllWindows ? {} : { currentWindow: true };

    chrome.tabs.query(query as chrome.tabs.QueryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error: `tabs.query failed: ${chrome.runtime.lastError?.message}`,
        } satisfies ListTabsResponse);
        return;
      }

      const cleaned = (tabs || [])
        .filter((t) => typeof t.id === 'number')
        .map((t) => ({
          id: t.id as number,
          url: t.url,
          title: t.title,
          windowId: t.windowId,
          active: t.active,
        }));

      sendResponse({ ok: true, tabs: cleaned } satisfies ListTabsResponse);
    });

    return true;
  }

  /**
   * Handle CREATE_TAB_GROUP message
   */
  private handleCreateTabGroup(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<TabGroupResponse>
  ): boolean {
    const payload = message.payload as CreateTabGroupPayload;
    const taskName = payload.taskName;
    const urls = payload.urls || [];
    const color = payload.color || 'blue';
    const collapsed = payload.collapsed || false;

    this.stagehandManager
      .getTabGroupManager()
      .createGroup(taskName, urls, color, collapsed)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        } satisfies TabGroupResponse)
      );

    return true;
  }

  /**
   * Handle UPDATE_TAB_GROUP message
   */
  private handleUpdateTabGroup(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<TabGroupResponse>
  ): boolean {
    const payload = message.payload as UpdateTabGroupPayload;
    const groupId = payload.groupId;
    const taskName = payload.taskName;
    const color = payload.color;
    const collapsed = payload.collapsed;

    this.stagehandManager
      .getTabGroupManager()
      .updateGroup(groupId, { taskName, color, collapsed })
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        } satisfies TabGroupResponse)
      );

    return true;
  }

  /**
   * Handle DELETE_TAB_GROUP message
   */
  private handleDeleteTabGroup(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<TabGroupResponse>
  ): boolean {
    const payload = message.payload as DeleteTabGroupPayload;
    const groupId = payload.groupId;

    this.stagehandManager
      .getTabGroupManager()
      .deleteGroup(groupId)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        } satisfies TabGroupResponse)
      );

    return true;
  }

  /**
   * Handle QUERY_TAB_GROUPS message
   */
  private handleQueryTabGroups(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<QueryTabGroupsResponse>
  ): boolean {
    const payload = message.payload as QueryTabGroupsPayload;
    const title = payload.title;
    const color = payload.color;
    const collapsed = payload.collapsed;

    this.stagehandManager
      .getTabGroupManager()
      .queryGroups({ title, color, collapsed })
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        } satisfies QueryTabGroupsResponse)
      );

    return true;
  }

  /**
   * Handle ADD_TABS_TO_GROUP message
   */
  private handleAddTabsToGroup(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseCallback<TabGroupResponse>
  ): boolean {
    const payload = message.payload as AddTabsToGroupPayload;
    const groupId = payload.groupId;
    const urls = payload.urls;

    this.stagehandManager
      .getTabGroupManager()
      .addTabsToGroup(groupId, urls)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        } satisfies TabGroupResponse)
      );

    return true;
  }
}
