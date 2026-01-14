/**
 * Background Script - Stagehand XPath (CDP)
 * 
 * 在 MV3 background service worker 中运行，通过 chrome.debugger (CDP) 扫描页面并构建 XPath。
 *
 * 目标：该 app 只保留“使用 CDP 构建 XPath”的能力；页面状态监听/同步等能力已移除。
 */

import { STAGEHAND_XPATH_SCAN, type StagehandXPathScanPayload, type StagehandXPathScanResponse } from "../types/stagehand-xpath"
import {
  STAGEHAND_VIEWPORT_SCREENSHOT,
  type StagehandViewportScreenshotPayload,
  type StagehandViewportScreenshotResponse
} from "../types/stagehand-screenshot"
import {
  RESUME_BLOCKS_EXTRACT,
  type ResumeBlocksExtractPayload,
  type ResumeBlocksExtractResponse
} from "../types/resume-blocks"
import {
  RESUME_XPATH_VALIDATE,
  type ResumeXpathValidatePayload,
  type ResumeXpathValidateResponse
} from "../types/resume-validate"
import { StagehandXPathScanner } from "./libs/StagehandXPathScanner"
import { StagehandViewportScreenshotter } from "./libs/StagehandViewportScreenshotter"
import { ResumeBlocksExtractor } from "./libs/ResumeBlocksExtractor"
import { ResumeXpathValidator } from "./libs/ResumeXpathValidator"

class StagehandXPathManager {
  private readonly scanner = new StagehandXPathScanner()
  private readonly screenshotter = new StagehandViewportScreenshotter()
  private readonly resumeBlocksExtractor = new ResumeBlocksExtractor()
  private readonly resumeXpathValidator = new ResumeXpathValidator()

  constructor() {
    this.setupMessageListeners();
  }

  private isScannableUrl(url: string | undefined): boolean {
    // 扩展/内部页不允许注入或不允许 debugger attach，提前拦截给出可读错误。
    const u = String(url || "")
    if (!u) return false
    const blocked = [
      "chrome://",
      "edge://",
      "about:",
      "devtools://",
      "chrome-extension://",
      "moz-extension://",
      "view-source:",
      "file://"
    ]
    return !blocked.some((p) => u.startsWith(p))
  }

  private handleViewportScreenshot(
    message: any,
    sendResponse: (resp: StagehandViewportScreenshotResponse) => void
  ): true {
    const payload = message.payload as Partial<StagehandViewportScreenshotPayload> | undefined
    const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined

    const runOnTab = (tabId: number) => {
      chrome.tabs.get(tabId, (tab) => {
        const tabUrl = tab?.url
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error: `tabs.get failed: ${chrome.runtime.lastError.message}`
          } satisfies StagehandViewportScreenshotResponse)
          return
        }
        if (!this.isScannableUrl(tabUrl)) {
          sendResponse({
            ok: false,
            error: `目标 Tab 不可截图（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
          } satisfies StagehandViewportScreenshotResponse)
          return
        }

        this.screenshotter
          .screenshotViewport(tabId)
          .then((resp) => sendResponse(resp))
          .catch((e) =>
            sendResponse({
              ok: false,
              error: e instanceof Error ? e.message : String(e)
            } satisfies StagehandViewportScreenshotResponse)
          )
      })
    }

    if (requestedTabId != null) {
      runOnTab(requestedTabId)
      return true
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id
      if (!tabId) {
        sendResponse({ ok: false, error: "No active tab found" } satisfies StagehandViewportScreenshotResponse)
        return
      }
      runOnTab(tabId)
    })

    return true
  }

  private handleResumeBlocksExtract(message: any, sendResponse: (resp: ResumeBlocksExtractResponse) => void): true {
    const payload = message.payload as Partial<ResumeBlocksExtractPayload> | undefined
    const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined

    const runOnTab = (tabId: number) => {
      chrome.tabs.get(tabId, (tab) => {
        const tabUrl = tab?.url
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error: `tabs.get failed: ${chrome.runtime.lastError.message}`
          } satisfies ResumeBlocksExtractResponse)
          return
        }
        if (!this.isScannableUrl(tabUrl)) {
          sendResponse({
            ok: false,
            error: `目标 Tab 不可抽取（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
          } satisfies ResumeBlocksExtractResponse)
          return
        }

        const maxBlocks =
          typeof payload?.maxBlocks === "number" && Number.isFinite(payload.maxBlocks) && payload.maxBlocks > 0
            ? Math.floor(payload.maxBlocks)
            : 60
        const minTextLen =
          typeof payload?.minTextLen === "number" && Number.isFinite(payload.minTextLen) && payload.minTextLen >= 0
            ? Math.floor(payload.minTextLen)
            : 80
        const maxTextLen =
          typeof payload?.maxTextLen === "number" && Number.isFinite(payload.maxTextLen) && payload.maxTextLen > 0
            ? Math.floor(payload.maxTextLen)
            : 2000
        const includeShadow = Boolean(payload?.includeShadow)
        const noiseSelectors =
          typeof payload?.noiseSelectors === "string" && payload.noiseSelectors.trim()
            ? payload.noiseSelectors.trim()
            : "header,nav,footer,aside,[role=banner],[role=navigation]"
        const noiseClassIdRegex =
          typeof payload?.noiseClassIdRegex === "string" && payload.noiseClassIdRegex.trim()
            ? payload.noiseClassIdRegex.trim()
            : "nav|menu|footer|header|sidebar|toolbar|pagination|breadcrumb|ads|comment"

        this.resumeBlocksExtractor
          .extract(tabId, { maxBlocks, minTextLen, maxTextLen, includeShadow, noiseSelectors, noiseClassIdRegex })
          .then((resp) => sendResponse(resp))
          .catch((e) =>
            sendResponse({
              ok: false,
              error: e instanceof Error ? e.message : String(e)
            } satisfies ResumeBlocksExtractResponse)
          )
      })
    }

    if (requestedTabId != null) {
      runOnTab(requestedTabId)
      return true
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id
      if (!tabId) {
        sendResponse({ ok: false, error: "No active tab found" } satisfies ResumeBlocksExtractResponse)
        return
      }
      runOnTab(tabId)
    })

    return true
  }

  private handleResumeXpathValidate(message: any, sendResponse: (resp: ResumeXpathValidateResponse) => void): true {
    const payload = message.payload as Partial<ResumeXpathValidatePayload> | undefined
    const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined
    const xpaths = Array.isArray(payload?.xpaths) ? payload!.xpaths : []
    if (!xpaths.length) {
      sendResponse({ ok: false, error: "xpaths is empty" } satisfies ResumeXpathValidateResponse)
      return true
    }

    const runOnTab = (tabId: number) => {
      chrome.tabs.get(tabId, (tab) => {
        const tabUrl = tab?.url
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error: `tabs.get failed: ${chrome.runtime.lastError.message}`
          } satisfies ResumeXpathValidateResponse)
          return
        }
        if (!this.isScannableUrl(tabUrl)) {
          sendResponse({
            ok: false,
            error: `目标 Tab 不可验证（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
          } satisfies ResumeXpathValidateResponse)
          return
        }

        this.resumeXpathValidator
          .validate(tabId, xpaths)
          .then((resp) => sendResponse(resp))
          .catch((e) =>
            sendResponse({
              ok: false,
              error: e instanceof Error ? e.message : String(e)
            } satisfies ResumeXpathValidateResponse)
          )
      })
    }

    if (requestedTabId != null) {
      runOnTab(requestedTabId)
      return true
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id
      if (!tabId) {
        sendResponse({ ok: false, error: "No active tab found" } satisfies ResumeXpathValidateResponse)
        return
      }
      runOnTab(tabId)
    })

    return true
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Tab Page -> Background -> Content: 扫描当前活动标签页并生成 XPath
      if (message.type === STAGEHAND_XPATH_SCAN) {
        const payload = message.payload as Partial<StagehandXPathScanPayload> | undefined;
        const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

        const runOnTab = (tabId: number) => {
          chrome.tabs.get(tabId, (tab) => {
            const tabUrl = tab?.url;
            if (chrome.runtime.lastError) {
              sendResponse({
                ok: false,
                error: `tabs.get failed: ${chrome.runtime.lastError.message}`,
              } satisfies StagehandXPathScanResponse);
              return;
            }
            if (!this.isScannableUrl(tabUrl)) {
              sendResponse({
                ok: false,
                error: `目标 Tab 不可扫描（url=${tabUrl || 'unknown'}）。请使用 http/https 页面。`,
              } satisfies StagehandXPathScanResponse);
              return;
            }

            const maxItems =
              typeof payload?.maxItems === 'number' && Number.isFinite(payload.maxItems) && payload.maxItems > 0
                ? Math.floor(payload.maxItems)
                : 200;
            const selector =
              typeof payload?.selector === 'string' && payload.selector.trim()
                ? payload.selector.trim()
                : "a,button,input,textarea,select,[role='button'],[onclick]";
            const includeShadow = Boolean(payload?.includeShadow);

            // 核心流程：通过 chrome.debugger 走 CDP，把页面/各 iframe 中的候选元素映射到稳定的 XPath。
            const run = this.scanner.scan(tabId, { maxItems, selector, includeShadow })
            run
              .then((resp) => sendResponse(resp))
              .catch((e) =>
                sendResponse({
                  ok: false,
                  error: e instanceof Error ? e.message : String(e),
                } satisfies StagehandXPathScanResponse),
              );
          });
        };

        if (requestedTabId != null) {
          runOnTab(requestedTabId);
          return true;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs?.[0]?.id;
          if (!tabId) {
            sendResponse({ ok: false, error: 'No active tab found' } satisfies StagehandXPathScanResponse);
            return;
          }
          runOnTab(tabId);
        });

        return true;
      }

      // Tab Page -> Background: 截取目标 Tab 当前可视 viewport 的截图（天然包含 iframe）
      if (message.type === STAGEHAND_VIEWPORT_SCREENSHOT) {
        return this.handleViewportScreenshot(message, sendResponse as any)
      }

      // Tab Page -> Background: 抽取简历候选块 blocks（站点无关）
      if (message.type === RESUME_BLOCKS_EXTRACT) {
        return this.handleResumeBlocksExtract(message, sendResponse as any)
      }

      // Tab Page -> Background: 校验一组 XPath 在目标页面是否可命中
      if (message.type === RESUME_XPATH_VALIDATE) {
        return this.handleResumeXpathValidate(message, sendResponse as any)
      }

      return false;
    });
  }
  // 说明：该类只负责“扫描并生成 XPath”，不再维护页面状态。
}

// 初始化 XPath 扫描管理器
const stagehandXPathManager = new StagehandXPathManager();

// 导出供其他模块使用
export default stagehandXPathManager;
