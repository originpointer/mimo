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
import {
  JSON_COMMON_XPATH_FIND,
  type JsonCommonXpathFindPayload,
  type JsonCommonXpathFindResponse
} from "../types/json-common-xpath"
import {
  XPATH_MARK_ELEMENTS,
  type XPathMarkElementsPayload,
  type XPathMarkElementsResponse,
  type XPathMarkMode
} from "../types/xpath-mark"
import { XPATH_GET_HTML, type XPathGetHtmlPayload, type XPathGetHtmlResponse } from "../types/xpath-get-html"
import { LIST_TABS, type ListTabsPayload, type ListTabsResponse } from "../types/list-tabs"
import {
  CREATE_TAB_GROUP,
  UPDATE_TAB_GROUP,
  DELETE_TAB_GROUP,
  QUERY_TAB_GROUPS,
  ADD_TABS_TO_GROUP,
  type CreateTabGroupPayload,
  type UpdateTabGroupPayload,
  type DeleteTabGroupPayload,
  type QueryTabGroupsPayload,
  type AddTabsToGroupPayload,
  type TabGroupResponse,
  type QueryTabGroupsResponse
} from "../types/tab-groups"
import { postToolCallResult, registerExtensionId } from "@/apis"
import { StagehandXPathScanner } from "./libs/StagehandXPathScanner"
import { StagehandViewportScreenshotter } from "./libs/StagehandViewportScreenshotter"
import { ResumeBlocksExtractor } from "./libs/ResumeBlocksExtractor"
import { ResumeXpathValidator } from "./libs/ResumeXpathValidator"
import { JsonCommonXpathFinder } from "./libs/JsonCommonXpathFinder"
import { XpathMarker } from "./libs/XpathMarker"
import { XpathHtmlGetter } from "./libs/XpathHtmlGetter"
import { TabGroupManager } from "./libs/TabGroupManager"
import { MessageHandler } from "@mimo/engine"

class StagehandXPathManager {
  private readonly scanner = new StagehandXPathScanner()
  private readonly screenshotter = new StagehandViewportScreenshotter()
  private readonly resumeBlocksExtractor = new ResumeBlocksExtractor()
  private readonly resumeXpathValidator = new ResumeXpathValidator()
  private readonly jsonCommonXpathFinder = new JsonCommonXpathFinder()
  private readonly xpathMarker = new XpathMarker()
  private readonly xpathHtmlGetter = new XpathHtmlGetter()
  private readonly tabGroupManager = new TabGroupManager()

  constructor() {
    this.setupMessageListeners()
    this.reportExtensionId()
    this.setupMimoEngine()
  }

  /**
   * 设置 MimoEngine 消息处理器
   *
   * 注册来自 next-app 的 Hub 命令处理器
   */
  private setupMimoEngine() {
    const chromeRuntimeHandler = MessageHandler.createChromeRuntimeHandler()

    // 注册到 chrome.runtime.onMessage
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const handled = chromeRuntimeHandler(message, sender, sendResponse)
      if (handled) {
        console.log('[StagehandXPathManager] Message handled by MimoEngine')
      }
      // 返回 false 表示让其他处理器继续处理
      return false
    })

    // 同时注册到 onMessageExternal（允许来自 next-app 的消息）
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      const handled = chromeRuntimeHandler(message, sender, sendResponse)
      if (handled) {
        console.log('[StagehandXPathManager] External message handled by MimoEngine')
      }
      return false
    })

    console.log('[StagehandXPathManager] MimoEngine registered for HubCommandType messages')
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
    const taskId = typeof payload?.taskId === "string" ? payload.taskId : undefined
    const extensionId = chrome.runtime?.id || ""

    const reportToolCallResult = (input: { ok: boolean; dataUrl?: string; base64?: string; meta?: unknown; error?: string }) => {
      if (!taskId) return
      void postToolCallResult({
        taskId,
        extensionId,
        toolType: "viewportScreenshot",
        ...input
      })
    }

    const runOnTab = (tabId: number) => {
      chrome.tabs.get(tabId, (tab) => {
        const tabUrl = tab?.url
        if (chrome.runtime.lastError) {
          reportToolCallResult({ ok: false, error: `tabs.get failed: ${chrome.runtime.lastError.message}` })
          sendResponse({
            ok: false,
            error: `tabs.get failed: ${chrome.runtime.lastError.message}`
          } satisfies StagehandViewportScreenshotResponse)
          return
        }
        if (!this.isScannableUrl(tabUrl)) {
          reportToolCallResult({ ok: false, error: `目标 Tab 不可截图（url=${tabUrl || "unknown"}）。请使用 http/https 页面。` })
          sendResponse({
            ok: false,
            error: `目标 Tab 不可截图（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
          } satisfies StagehandViewportScreenshotResponse)
          return
        }

        this.screenshotter
          .screenshotViewport(tabId)
          .then((resp) => {
            if (resp.ok) {
              reportToolCallResult({
                ok: true,
                dataUrl: resp.dataUrl,
                base64: resp.base64,
                meta: resp.meta
              })
            } else {
              const errorMessage = "error" in resp ? resp.error : "viewport screenshot failed"
              reportToolCallResult({ ok: false, error: errorMessage })
            }
            sendResponse(resp)
          })
          .catch((e) => {
            const message = e instanceof Error ? e.message : String(e)
            reportToolCallResult({ ok: false, error: message })
            sendResponse({
              ok: false,
              error: message
            } satisfies StagehandViewportScreenshotResponse)
          })
      })
    }

    if (requestedTabId != null) {
      runOnTab(requestedTabId)
      return true
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id
      if (!tabId) {
        reportToolCallResult({ ok: false, error: "No active tab found" })
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

  private handleListTabs(message: any, sendResponse: (resp: ListTabsResponse) => void): true {
    const payload = message.payload as ListTabsPayload | undefined
    const query = payload?.includeAllWindows ? {} : { currentWindow: true }
    chrome.tabs.query(query as chrome.tabs.QueryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error: `tabs.query failed: ${chrome.runtime.lastError.message}`
        } satisfies ListTabsResponse)
        return
      }
      const cleaned = (tabs || [])
        .filter((t) => typeof t.id === "number")
        .map((t) => ({
          id: t.id as number,
          url: t.url,
          title: t.title,
          windowId: t.windowId,
          active: t.active
        }))
      sendResponse({ ok: true, tabs: cleaned } satisfies ListTabsResponse)
    })
    return true
  }

  private handleCreateTabGroup(message: any, sendResponse: (resp: TabGroupResponse) => void): void {
    const payload = message.payload as CreateTabGroupPayload
    const taskName = payload.taskName
    const urls = payload.urls || []
    const color = payload.color || "blue"
    const collapsed = payload.collapsed || false

    this.tabGroupManager
      .createGroup(taskName, urls, color, collapsed)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        } satisfies TabGroupResponse)
      )
  }

  private handleUpdateTabGroup(message: any, sendResponse: (resp: TabGroupResponse) => void): void {
    const payload = message.payload as UpdateTabGroupPayload
    const groupId = payload.groupId
    const taskName = payload.taskName
    const color = payload.color
    const collapsed = payload.collapsed

    this.tabGroupManager
      .updateGroup(groupId, { taskName, color, collapsed })
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        } satisfies TabGroupResponse)
      )
  }

  private handleDeleteTabGroup(message: any, sendResponse: (resp: TabGroupResponse) => void): void {
    const payload = message.payload as DeleteTabGroupPayload
    const groupId = payload.groupId

    this.tabGroupManager
      .deleteGroup(groupId)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        } satisfies TabGroupResponse)
      )
  }

  private handleQueryTabGroups(message: any, sendResponse: (resp: QueryTabGroupsResponse) => void): void {
    const payload = message.payload as QueryTabGroupsPayload
    const title = payload.title
    const color = payload.color
    const collapsed = payload.collapsed

    this.tabGroupManager
      .queryGroups({ title, color, collapsed })
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        } satisfies QueryTabGroupsResponse)
      )
  }

  private handleAddTabsToGroup(message: any, sendResponse: (resp: TabGroupResponse) => void): void {
    const payload = message.payload as AddTabsToGroupPayload
    const groupId = payload.groupId
    const urls = payload.urls

    this.tabGroupManager
      .addTabsToGroup(groupId, urls)
      .then((result) => sendResponse(result))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e)
        } satisfies TabGroupResponse)
      )
  }

  private handleRuntimeMessage(message: any, sendResponse: (resp: any) => void): boolean {
    // Tab Page -> Background -> Content: 扫描当前活动标签页并生成 XPath
    if (message.type === STAGEHAND_XPATH_SCAN) {
      const payload = message.payload as Partial<StagehandXPathScanPayload> | undefined
      const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined

      const runOnTab = (tabId: number) => {
        chrome.tabs.get(tabId, (tab) => {
          const tabUrl = tab?.url
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: `tabs.get failed: ${chrome.runtime.lastError.message}`
            } satisfies StagehandXPathScanResponse)
            return
          }
          if (!this.isScannableUrl(tabUrl)) {
            sendResponse({
              ok: false,
              error: `目标 Tab 不可扫描（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
            } satisfies StagehandXPathScanResponse)
            return
          }

          const maxItems =
            typeof payload?.maxItems === "number" && Number.isFinite(payload.maxItems) && payload.maxItems > 0
              ? Math.floor(payload.maxItems)
              : 200
          const selector =
            typeof payload?.selector === "string" && payload.selector.trim()
              ? payload.selector.trim()
              : "a,button,input,textarea,select,[role='button'],[onclick]"
          const includeShadow = Boolean(payload?.includeShadow)

          // 核心流程：通过 chrome.debugger 走 CDP，把页面/各 iframe 中的候选元素映射到稳定的 XPath。
          const run = this.scanner.scan(tabId, { maxItems, selector, includeShadow })
          run
            .then((resp) => sendResponse(resp))
            .catch((e) =>
              sendResponse({
                ok: false,
                error: e instanceof Error ? e.message : String(e)
              } satisfies StagehandXPathScanResponse)
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
          sendResponse({ ok: false, error: "No active tab found" } satisfies StagehandXPathScanResponse)
          return
        }
        runOnTab(tabId)
      })

      return true
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

    // next-app -> Background: JSON kv -> contains -> common ancestor xpaths
    if (message.type === JSON_COMMON_XPATH_FIND) {
      const payload = message.payload as Partial<JsonCommonXpathFindPayload> | undefined
      const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined

      const runOnTab = (tabId: number) => {
        chrome.tabs.get(tabId, (tab) => {
          const tabUrl = tab?.url
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: `tabs.get failed: ${chrome.runtime.lastError.message}`
            } satisfies JsonCommonXpathFindResponse)
            return
          }
          if (!this.isScannableUrl(tabUrl)) {
            sendResponse({
              ok: false,
              error: `目标 Tab 不可扫描（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
            } satisfies JsonCommonXpathFindResponse)
            return
          }

          this.jsonCommonXpathFinder
            .find(tabId, (payload || {}) as JsonCommonXpathFindPayload)
            .then((resp) => sendResponse(resp))
            .catch((e) =>
              sendResponse({
                ok: false,
                error: e instanceof Error ? e.message : String(e)
              } satisfies JsonCommonXpathFindResponse)
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
          sendResponse({ ok: false, error: "No active tab found" } satisfies JsonCommonXpathFindResponse)
          return
        }
        runOnTab(tabId)
      })

      return true
    }

    // next-app -> Background: 输入一组 XPath，在目标页面标记/清除命中元素
    if (message.type === XPATH_MARK_ELEMENTS) {
      const payload = message.payload as Partial<XPathMarkElementsPayload> | undefined
      const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined
      const rawMode = typeof payload?.mode === "string" ? payload.mode : "mark"
      const mode: XPathMarkMode = rawMode === "clear" ? "clear" : "mark"
      const xpaths = Array.isArray(payload?.xpaths) ? payload!.xpaths : []

      const runOnTab = (tabId: number) => {
        chrome.tabs.get(tabId, (tab) => {
          const tabUrl = tab?.url
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: `tabs.get failed: ${chrome.runtime.lastError.message}`
            } satisfies XPathMarkElementsResponse)
            return
          }
          if (!this.isScannableUrl(tabUrl)) {
            sendResponse({
              ok: false,
              error: `目标 Tab 不可扫描（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
            } satisfies XPathMarkElementsResponse)
            return
          }

          if (mode !== "clear" && !xpaths.length) {
            sendResponse({ ok: false, error: "xpaths is empty" } satisfies XPathMarkElementsResponse)
            return
          }

          this.xpathMarker
            .run(tabId, { mode, xpaths })
            .then((resp) => sendResponse(resp))
            .catch((e) =>
              sendResponse({
                ok: false,
                error: e instanceof Error ? e.message : String(e)
              } satisfies XPathMarkElementsResponse)
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
          sendResponse({ ok: false, error: "No active tab found" } satisfies XPathMarkElementsResponse)
          return
        }
        runOnTab(tabId)
      })

      return true
    }

    // next-app -> Background: 输入 XPath，获取第一个命中节点的 innerHTML
    if (message.type === XPATH_GET_HTML) {
      const payload = message.payload as Partial<XPathGetHtmlPayload> | undefined
      const requestedTabId = payload && typeof payload.targetTabId === "number" ? payload.targetTabId : undefined
      const xpath = typeof payload?.xpath === "string" ? payload.xpath.trim() : ""
      const maxChars = typeof payload?.maxChars === "number" && Number.isFinite(payload.maxChars) ? payload.maxChars : undefined

      if (!xpath) {
        sendResponse({ ok: false, error: "xpath is empty" } satisfies XPathGetHtmlResponse)
        return true
      }

      const runOnTab = (tabId: number) => {
        chrome.tabs.get(tabId, (tab) => {
          const tabUrl = tab?.url
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: `tabs.get failed: ${chrome.runtime.lastError.message}`
            } satisfies XPathGetHtmlResponse)
            return
          }
          if (!this.isScannableUrl(tabUrl)) {
            sendResponse({
              ok: false,
              error: `目标 Tab 不可扫描（url=${tabUrl || "unknown"}）。请使用 http/https 页面。`
            } satisfies XPathGetHtmlResponse)
            return
          }

          this.xpathHtmlGetter
            .get(tabId, { xpath, maxChars })
            .then((resp) => sendResponse(resp))
            .catch((e) =>
              sendResponse({
                ok: false,
                error: e instanceof Error ? e.message : String(e)
              } satisfies XPathGetHtmlResponse)
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
          sendResponse({ ok: false, error: "No active tab found" } satisfies XPathGetHtmlResponse)
          return
        }
        runOnTab(tabId)
      })

      return true
    }

    if (message.type === LIST_TABS) {
      return this.handleListTabs(message, sendResponse as any)
    }

    // Tab Groups: 创建选项卡组
    if (message.type === CREATE_TAB_GROUP) {
      this.handleCreateTabGroup(message, sendResponse as any)
      return true
    }

    // Tab Groups: 更新选项卡组
    if (message.type === UPDATE_TAB_GROUP) {
      this.handleUpdateTabGroup(message, sendResponse as any)
      return true
    }

    // Tab Groups: 删除选项卡组
    if (message.type === DELETE_TAB_GROUP) {
      this.handleDeleteTabGroup(message, sendResponse as any)
      return true
    }

    // Tab Groups: 查询选项卡组
    if (message.type === QUERY_TAB_GROUPS) {
      this.handleQueryTabGroups(message, sendResponse as any)
      return true
    }

    // Tab Groups: 添加选项卡到组
    if (message.type === ADD_TABS_TO_GROUP) {
      this.handleAddTabsToGroup(message, sendResponse as any)
      return true
    }

    return false
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleRuntimeMessage(message, sendResponse)
    })
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      return this.handleRuntimeMessage(message, sendResponse)
    })
  }

  private reportExtensionId() {
    const extensionId = chrome.runtime?.id
    if (!extensionId) {
      console.warn("extensionId not available")
      return
    }
    const extensionName = chrome.runtime.getManifest?.().name
    if (!extensionName) {
      console.warn("extensionName not available")
      return
    }
    registerExtensionId(extensionId, extensionName).catch((e) => {
      console.warn("report extensionId failed", e)
    })
  }
  // 说明：该类只负责“扫描并生成 XPath”，不再维护页面状态。
}

// 初始化 XPath 扫描管理器
const stagehandXPathManager = new StagehandXPathManager();

// 导出供其他模块使用
export default stagehandXPathManager;
