/**
 * Driver Adapter
 * 
 * 服务端的驱动适配器，用于将 CDP 命令发送到扩展并接收结果。
 * 这是 Stagehand 集成的核心接口。
 */

import { controlBus, type ControlCommandEnvelope } from "./bus"
import { signJws } from "./keys"
import { getChildSessionsByTabId, findSessionByUrl, type TargetInfo } from "./sessionRegistry"
import { waitForPageLoad, waitForDomReady, waitForNetworkIdle, waitForStable } from "./waitHelpers"

export interface DriverAdapterConfig {
  extensionId: string
  replyUrl: string
  defaultTabId?: number
  defaultTtlMs?: number
  keepAttached?: boolean
}

export interface CdpResult {
  ok: boolean
  tabId: number
  sessionId?: string
  method: string
  response?: unknown
  error?: { code?: string; message: string; name?: string }
  durationMs: number
}

type Quad = number[] // [x1,y1,x2,y2,x3,y3,x4,y4]

export type ActionMeta = {
  taskId: string
  actionId: string
  risk?: "low" | "medium" | "high"
  requiresConfirmation?: boolean
  reason?: string
}

class DriverActionError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = "DriverActionError"
    this.code = code
  }
}

export interface FrameInfo {
  sessionId: string
  targetId: string
  type: string
  url: string
}

/**
 * DOM 节点类型（CDP DOM.Node 的简化版）
 */
export interface DomNode {
  nodeId: number
  backendNodeId: number
  nodeType: number
  nodeName: string
  localName?: string
  nodeValue?: string
  childNodeCount?: number
  children?: DomNode[]
  attributes?: string[]
  shadowRoots?: DomNode[]
  contentDocument?: DomNode
  frameId?: string
  isScrollable?: boolean
}

/**
 * 可访问性节点类型（CDP Accessibility.AXNode 的简化版）
 */
export interface AXNode {
  nodeId: string
  ignored: boolean
  role?: { type: string; value: string }
  chromeRole?: { type: string; value: string }
  name?: { type: string; value: string }
  description?: { type: string; value: string }
  value?: { type: string; value: string }
  properties?: Array<{ name: string; value: { type: string; value: unknown } }>
  parentId?: string
  childIds?: string[]
  backendDOMNodeId?: number
}

/**
 * DriverAdapter 类
 * 
 * 提供与 Stagehand Understudy 类似的接口，但底层通过扩展执行 CDP 命令。
 */
export class DriverAdapter {
  private config: DriverAdapterConfig
  private currentTabId: number | null = null
  
  constructor(config: DriverAdapterConfig) {
    this.config = config
    this.currentTabId = config.defaultTabId ?? null
  }
  
  /**
   * 设置当前操作的 tab
   */
  setTabId(tabId: number): void {
    this.currentTabId = tabId
  }
  
  /**
   * 获取当前 tab ID
   */
  getTabId(): number | null {
    return this.currentTabId
  }
  
  private throwCdpError(result: CdpResult, fallbackMessage: string): never {
    const msg = result.error?.message ?? fallbackMessage
    throw new DriverActionError(msg, result.error?.code)
  }

  /**
   * 发送 CDP 命令
   */
  async send(
    method: string,
    params: Record<string, unknown> = {},
    options?: { sessionId?: string; tabId?: number; timeoutMs?: number; action?: ActionMeta }
  ): Promise<CdpResult> {
    const tabId = options?.tabId ?? this.currentTabId
    if (tabId === null) {
      return {
        ok: false,
        tabId: -1,
        method,
        error: { message: "No tabId set" },
        durationMs: 0
      }
    }
    
    const ttlMs = options?.timeoutMs ?? this.config.defaultTtlMs ?? 30000
    const { commandId, traceId, callbackToken } = controlBus.issueIds()
    const issuedAt = Date.now()
    
    const signedPayload = {
      iss: "control-server",
      aud: "browser-extension",
      commandId,
      traceId,
      issuedAt,
      ttlMs,
      target: { tabId, sessionId: options?.sessionId },
      action: options?.action
        ? {
            taskId: options.action.taskId,
            actionId: options.action.actionId,
            risk: options.action.risk,
            requiresConfirmation: options.action.requiresConfirmation,
            reason: options.action.reason
          }
        : undefined,
      op: {
        kind: "cdp.send",
        method,
        params,
        sessionId: options?.sessionId,
        keepAttached: this.config.keepAttached
      },
      options: { keepAttached: this.config.keepAttached },
      reply: { url: this.config.replyUrl, callbackToken }
    }
    
    const { jws } = signJws(signedPayload)
    
    const envelope: ControlCommandEnvelope = {
      type: "control.command",
      commandId,
      traceId,
      issuedAt,
      ttlMs,
      target: { extensionId: this.config.extensionId, tabId, sessionId: options?.sessionId },
      jws
    }
    
    // 发布命令并等待回调
    controlBus.publish(envelope, {
      commandId,
      traceId,
      callbackToken,
      expiresAt: issuedAt + ttlMs,
      meta: {
        method,
        tabId,
        sessionId: options?.sessionId,
        taskId: options?.action?.taskId,
        actionId: options?.action?.actionId,
        risk: options?.action?.risk,
        requiresConfirmation: options?.action?.requiresConfirmation
      }
    })
    
    // 等待回调结果
    const result = await controlBus.waitForCallback(commandId, ttlMs + 5000)
    
    if (!result) {
      return {
        ok: false,
        tabId,
        sessionId: options?.sessionId,
        method,
        error: { message: "Command timeout" },
        durationMs: Date.now() - issuedAt
      }
    }
    
    return {
      ok: result.status === "ok",
      tabId,
      sessionId: options?.sessionId,
      method,
      response: (result.result as { response?: unknown } | undefined)?.response,
      error: result.error,
      durationMs:
        typeof (result.telemetry as { durationMs?: unknown } | undefined)?.durationMs === "number"
          ? (result.telemetry as { durationMs: number }).durationMs
          : Date.now() - issuedAt
    }
  }
  
  /**
   * 在指定 frame 中执行 JavaScript
   */
  async evaluate(
    expression: string,
    options?: { sessionId?: string; tabId?: number; returnByValue?: boolean }
  ): Promise<unknown> {
    const result = await this.send(
      "Runtime.evaluate",
      {
        expression,
        returnByValue: options?.returnByValue ?? true,
        awaitPromise: true
      },
      options
    )
    
    if (!result.ok) {
      this.throwCdpError(result, "Evaluate failed")
    }
    
    const response = result.response as { result?: { value?: unknown } }
    return response?.result?.value
  }
  
  /**
   * 获取 frame tree
   */
  async getFrameTree(tabId?: number): Promise<unknown> {
    const result = await this.send("Page.getFrameTree", {}, { tabId })
    if (!result.ok) {
      this.throwCdpError(result, "getFrameTree failed")
    }
    return (result.response as { frameTree?: unknown })?.frameTree
  }
  
  /**
   * 获取文档根节点
   */
  async getDocument(options?: { sessionId?: string; tabId?: number; depth?: number; pierce?: boolean }): Promise<unknown> {
    const params: Record<string, unknown> = { depth: options?.depth ?? 0 }
    if (options?.pierce !== undefined) params.pierce = options.pierce
    
    const result = await this.send(
      "DOM.getDocument",
      params,
      options
    )
    if (!result.ok) {
      this.throwCdpError(result, "getDocument failed")
    }
    return (result.response as { root?: unknown })?.root
  }

  /**
   * DOM.querySelector
   */
  async querySelector(
    selector: string,
    options?: { nodeId?: number; sessionId?: string; tabId?: number }
  ): Promise<number> {
    // If root nodeId not provided, fetch the real document root nodeId first.
    // (nodeId is not guaranteed to be 1 across all sessions/pages.)
    let rootNodeId = options?.nodeId
    if (!rootNodeId) {
      const docRes = await this.send(
        "DOM.getDocument",
        { depth: 0 },
        { tabId: options?.tabId, sessionId: options?.sessionId }
      )
      if (!docRes.ok) {
        throw new Error(docRes.error?.message ?? "DOM.getDocument failed (for querySelector)")
      }
      const root = (docRes.response as { root?: { nodeId?: number } } | undefined)?.root
      rootNodeId = root?.nodeId
    }
    if (!rootNodeId) {
      throw new Error("Cannot resolve document root nodeId (for querySelector)")
    }
    const result = await this.send(
      "DOM.querySelector",
      { nodeId: rootNodeId, selector },
      { tabId: options?.tabId, sessionId: options?.sessionId }
    )
    if (!result.ok) {
      this.throwCdpError(result, "DOM.querySelector failed")
    }
    return (result.response as { nodeId?: number })?.nodeId ?? 0
  }

  /**
   * DOM.scrollIntoViewIfNeeded
   */
  async scrollIntoViewIfNeeded(
    nodeId: number,
    options?: { sessionId?: string; tabId?: number }
  ): Promise<void> {
    const result = await this.send(
      "DOM.scrollIntoViewIfNeeded",
      { nodeId },
      { tabId: options?.tabId, sessionId: options?.sessionId }
    )
    if (!result.ok) {
      this.throwCdpError(result, "DOM.scrollIntoViewIfNeeded failed")
    }
  }

  /**
   * DOM.getBoxModel
   */
  async getBoxModel(
    nodeId: number,
    options?: { sessionId?: string; tabId?: number }
  ): Promise<{ border: Quad }> {
    const result = await this.send(
      "DOM.getBoxModel",
      { nodeId },
      { tabId: options?.tabId, sessionId: options?.sessionId }
    )
    if (!result.ok) {
      this.throwCdpError(result, "DOM.getBoxModel failed")
    }
    const model = (result.response as { model?: { border?: Quad } })?.model
    const border = model?.border
    if (!border || !Array.isArray(border) || border.length !== 8) {
      throw new Error("DOM.getBoxModel returned invalid border quad")
    }
    return { border }
  }

  private quadCenter(quad: Quad): { x: number; y: number } {
    // quad = [x1,y1,x2,y2,x3,y3,x4,y4]
    const xs = [quad[0], quad[2], quad[4], quad[6]]
    const ys = [quad[1], quad[3], quad[5], quad[7]]
    const x = xs.reduce((a, b) => a + b, 0) / 4
    const y = ys.reduce((a, b) => a + b, 0) / 4
    return { x, y }
  }

  /**
   * 点击 selector（同文档）
   */
  async clickSelector(
    selector: string,
    options?: { sessionId?: string; tabId?: number; timeoutMs?: number; action?: ActionMeta }
  ): Promise<{ nodeId: number; x: number; y: number }> {
    const nodeId = await this.querySelector(selector, options)
    if (!nodeId) throw new Error(`Selector not found: ${selector}`)
    await this.scrollIntoViewIfNeeded(nodeId, options)
    const { border } = await this.getBoxModel(nodeId, options)
    const { x, y } = this.quadCenter(border)
    await this.clickAt(x, y, { tabId: options?.tabId, sessionId: options?.sessionId, action: options?.action })
    return { nodeId, x, y }
  }

  /**
   * 输入 selector（同文档）
   */
  async typeSelector(
    selector: string,
    text: string,
    options?: { sessionId?: string; tabId?: number; action?: ActionMeta }
  ): Promise<{ nodeId: number; x: number; y: number; text: string }> {
    // Try focus first to improve reliability
    await this.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus?.(); return true; })()`,
      { tabId: options?.tabId, sessionId: options?.sessionId, returnByValue: true }
    )
    const { nodeId, x, y } = await this.clickSelector(selector, options)
    await this.type(text, { tabId: options?.tabId, sessionId: options?.sessionId, action: options?.action })
    return { nodeId, x, y, text }
  }

  /**
   * 同源 iframe 内元素坐标解析：frameSelector + selector -> 页面坐标
   *
   * 注意：仅适用于同源 iframe（contentDocument 可访问）。
   */
  async resolvePointInSameOriginIframe(
    frameSelector: string,
    selector: string,
    options?: { tabId?: number }
  ): Promise<{ x: number; y: number }> {
    const expr = `(() => {
      const iframe = document.querySelector(${JSON.stringify(frameSelector)});
      if (!iframe) return { ok: false, error: 'iframe_not_found' };
      const doc = iframe.contentDocument;
      if (!doc) return { ok: false, error: 'iframe_no_contentDocument' };
      const el = doc.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: 'element_not_found' };
      const iframeRect = iframe.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const x = window.scrollX + iframeRect.left + elRect.left + (elRect.width / 2);
      const y = window.scrollY + iframeRect.top + elRect.top + (elRect.height / 2);
      return { ok: true, x, y };
    })()`
    const out = (await this.evaluate(expr, { tabId: options?.tabId, returnByValue: true })) as
      | { ok: true; x: number; y: number }
      | { ok: false; error: string }
    if (!out || (out as { ok?: boolean }).ok !== true) {
      throw new Error(`resolvePointInSameOriginIframe failed: ${(out as { error?: string })?.error ?? "unknown"}`)
    }
    return { x: out.x, y: out.y }
  }

  /**
   * 同源 iframe 内点击（通过 Runtime.evaluate 解析坐标后 clickAt）
   */
  async clickIframeSelector(
    frameSelector: string,
    selector: string,
    options?: { tabId?: number; action?: ActionMeta }
  ): Promise<{ x: number; y: number }> {
    const { x, y } = await this.resolvePointInSameOriginIframe(frameSelector, selector, options)
    await this.clickAt(x, y, { tabId: options?.tabId, action: options?.action })
    return { x, y }
  }

  /**
   * 同源 iframe 内输入（通过 Runtime.evaluate 解析坐标后 clickAt + type）
   */
  async typeIframeSelector(
    frameSelector: string,
    selector: string,
    text: string,
    options?: { tabId?: number; action?: ActionMeta }
  ): Promise<{ x: number; y: number; text: string }> {
    // Focus inside iframe (best-effort)
    await this.evaluate(
      `(() => {
        const iframe = document.querySelector(${JSON.stringify(frameSelector)});
        const doc = iframe?.contentDocument;
        const el = doc?.querySelector(${JSON.stringify(selector)});
        el?.focus?.();
        return true;
      })()`,
      { tabId: options?.tabId, returnByValue: true }
    )
    const { x, y } = await this.clickIframeSelector(frameSelector, selector, options)
    await this.type(text, { tabId: options?.tabId, action: options?.action })
    return { x, y, text }
  }
  
  /**
   * 获取已注册的子 sessions
   */
  getChildSessions(tabId?: number): TargetInfo[] {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return []
    return getChildSessionsByTabId(tid)
  }
  
  /**
   * 按 URL 查找 session
   */
  findSessionByUrl(urlPattern: string, tabId?: number): TargetInfo | undefined {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return undefined
    return findSessionByUrl(tid, urlPattern)
  }
  
  /**
   * 等待页面加载
   */
  async waitForLoad(tabId?: number, timeoutMs = 30000): Promise<boolean> {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return false
    return waitForPageLoad(tid, { timeoutMs })
  }
  
  /**
   * 等待 DOM 就绪
   */
  async waitForDomReady(tabId?: number, timeoutMs = 30000): Promise<boolean> {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return false
    return waitForDomReady(tid, { timeoutMs })
  }
  
  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(tabId?: number, idleMs = 500, timeoutMs = 30000): Promise<boolean> {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return false
    return waitForNetworkIdle(tid, { idleMs, timeoutMs })
  }
  
  /**
   * 等待稳定（DOM + 网络）
   */
  async waitForStable(
    tabId?: number,
    options?: { idleMs?: number; timeoutMs?: number }
  ): Promise<{ domReady: boolean; networkIdle: boolean }> {
    const tid = tabId ?? this.currentTabId
    if (tid === null) return { domReady: false, networkIdle: false }
    return waitForStable(tid, options)
  }
  
  // ---- Stagehand-style convenience methods ----
  
  /**
   * 截图
   */
  async screenshot(options?: { format?: "png" | "jpeg"; quality?: number; sessionId?: string }): Promise<string> {
    const result = await this.send(
      "Page.captureScreenshot",
      {
        format: options?.format ?? "png",
        quality: options?.quality
      },
      { sessionId: options?.sessionId }
    )
    if (!result.ok) {
      this.throwCdpError(result, "Screenshot failed")
    }
    return (result.response as { data?: string })?.data ?? ""
  }
  
  /**
   * 导航到 URL
   */
  async navigate(url: string, options?: { waitForLoad?: boolean }): Promise<void> {
    const result = await this.send("Page.navigate", { url })
    if (!result.ok) {
      this.throwCdpError(result, "Navigate failed")
    }
    if (options?.waitForLoad !== false) {
      await this.waitForLoad()
    }
  }
  
  /**
   * 点击元素（通过坐标）
   */
  async clickAt(
    x: number,
    y: number,
    options?: { tabId?: number; sessionId?: string; timeoutMs?: number; action?: ActionMeta }
  ): Promise<void> {
    // Some environments are stricter about mouse event sequences.
    // Send move -> press -> small delay -> release with proper buttons/pointerType.
    const r1 = await this.send(
      "Input.dispatchMouseEvent",
      {
      type: "mouseMoved",
      x,
      y,
      button: "none",
      buttons: 0,
      pointerType: "mouse",
      clickCount: 0
      },
      options
    )
    if (!r1.ok) this.throwCdpError(r1, "Input.mouseMoved failed")

    const r2 = await this.send(
      "Input.dispatchMouseEvent",
      {
      type: "mousePressed",
      x,
      y,
      button: "left",
      buttons: 1,
      pointerType: "mouse",
      clickCount: 1
      },
      options
    )
    if (!r2.ok) this.throwCdpError(r2, "Input.mousePressed failed")
    // Minimal delay to better approximate real input and allow handlers to attach.
    await new Promise((r) => setTimeout(r, 25))
    const r3 = await this.send(
      "Input.dispatchMouseEvent",
      {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      buttons: 0,
      pointerType: "mouse",
      clickCount: 1
      },
      options
    )
    if (!r3.ok) this.throwCdpError(r3, "Input.mouseReleased failed")
  }
  
  /**
   * 输入文本
   */
  async type(text: string, options?: { tabId?: number; sessionId?: string; timeoutMs?: number; action?: ActionMeta }): Promise<void> {
    const r = await this.send("Input.insertText", { text }, options)
    if (!r.ok) this.throwCdpError(r, "Input.insertText failed")
  }
  
  /**
   * 按键
   */
  async press(key: string, options?: { tabId?: number; sessionId?: string; timeoutMs?: number; action?: ActionMeta }): Promise<void> {
    const r1 = await this.send("Input.dispatchKeyEvent", { type: "keyDown", key }, options)
    if (!r1.ok) this.throwCdpError(r1, "Input.keyDown failed")
    const r2 = await this.send("Input.dispatchKeyEvent", { type: "keyUp", key }, options)
    if (!r2.ok) this.throwCdpError(r2, "Input.keyUp failed")
  }

  // ---- Stagehand DOM Serialization CDP Methods ----

  /**
   * DOM.describeNode - 获取节点详细信息
   * 用于 DOM 树水合（hydrate）和获取节点完整信息
   */
  async describeNode(
    options: {
      nodeId?: number
      backendNodeId?: number
      depth?: number
      pierce?: boolean
      sessionId?: string
      tabId?: number
    }
  ): Promise<DomNode> {
    const { nodeId, backendNodeId, depth, pierce, sessionId, tabId } = options
    if (!nodeId && !backendNodeId) {
      throw new Error("describeNode requires either nodeId or backendNodeId")
    }
    const params: Record<string, unknown> = {}
    if (nodeId !== undefined) params.nodeId = nodeId
    if (backendNodeId !== undefined) params.backendNodeId = backendNodeId
    if (depth !== undefined) params.depth = depth
    if (pierce !== undefined) params.pierce = pierce

    const result = await this.send("DOM.describeNode", params, { sessionId, tabId })
    if (!result.ok) {
      this.throwCdpError(result, "DOM.describeNode failed")
    }
    return (result.response as { node: DomNode }).node
  }

  /**
   * DOM.getFrameOwner - 获取包含指定 frame 的 iframe 元素信息
   * 用于计算 iframe 的 XPath 前缀
   */
  async getFrameOwner(
    frameId: string,
    options?: { sessionId?: string; tabId?: number }
  ): Promise<{ backendNodeId: number; nodeId?: number }> {
    const result = await this.send(
      "DOM.getFrameOwner",
      { frameId },
      { sessionId: options?.sessionId, tabId: options?.tabId }
    )
    if (!result.ok) {
      this.throwCdpError(result, "DOM.getFrameOwner failed")
    }
    const response = result.response as { backendNodeId?: number; nodeId?: number }
    if (typeof response?.backendNodeId !== "number") {
      throw new Error("DOM.getFrameOwner returned invalid backendNodeId")
    }
    return {
      backendNodeId: response.backendNodeId,
      nodeId: response.nodeId
    }
  }

  /**
   * DOM.resolveNode - 从 nodeId 或 backendNodeId 解析为 Runtime.RemoteObject
   * 用于执行脚本操作节点
   */
  async resolveNode(
    options: {
      nodeId?: number
      backendNodeId?: number
      executionContextId?: number
      sessionId?: string
      tabId?: number
    }
  ): Promise<{ objectId: string; type: string; subtype?: string }> {
    const { nodeId, backendNodeId, executionContextId, sessionId, tabId } = options
    if (!nodeId && !backendNodeId) {
      throw new Error("resolveNode requires either nodeId or backendNodeId")
    }
    const params: Record<string, unknown> = {}
    if (nodeId !== undefined) params.nodeId = nodeId
    if (backendNodeId !== undefined) params.backendNodeId = backendNodeId
    if (executionContextId !== undefined) params.executionContextId = executionContextId

    const result = await this.send("DOM.resolveNode", params, { sessionId, tabId })
    if (!result.ok) {
      this.throwCdpError(result, "DOM.resolveNode failed")
    }
    const response = result.response as { object?: { objectId?: string; type?: string; subtype?: string } }
    if (!response?.object?.objectId) {
      throw new Error("DOM.resolveNode returned invalid object")
    }
    return {
      objectId: response.object.objectId,
      type: response.object.type ?? "object",
      subtype: response.object.subtype
    }
  }

  /**
   * Accessibility.enable - 启用可访问性域
   */
  async enableAccessibility(options?: { sessionId?: string; tabId?: number }): Promise<void> {
    const result = await this.send("Accessibility.enable", {}, options)
    if (!result.ok) {
      this.throwCdpError(result, "Accessibility.enable failed")
    }
  }

  /**
   * Accessibility.getFullAXTree - 获取完整的可访问性树
   */
  async getFullAXTree(
    options?: { depth?: number; frameId?: string; sessionId?: string; tabId?: number }
  ): Promise<AXNode[]> {
    const params: Record<string, unknown> = {}
    if (options?.depth !== undefined) params.depth = options.depth
    if (options?.frameId !== undefined) params.frameId = options.frameId

    const result = await this.send("Accessibility.getFullAXTree", params, {
      sessionId: options?.sessionId,
      tabId: options?.tabId
    })
    if (!result.ok) {
      this.throwCdpError(result, "Accessibility.getFullAXTree failed")
    }
    return (result.response as { nodes: AXNode[] }).nodes ?? []
  }

  /**
   * DOM.enable - 启用 DOM 域
   */
  async enableDOM(options?: { sessionId?: string; tabId?: number }): Promise<void> {
    const result = await this.send("DOM.enable", {}, options)
    if (!result.ok) {
      this.throwCdpError(result, "DOM.enable failed")
    }
  }

  /**
   * Runtime.enable - 启用 Runtime 域
   */
  async enableRuntime(options?: { sessionId?: string; tabId?: number }): Promise<void> {
    const result = await this.send("Runtime.enable", {}, options)
    if (!result.ok) {
      this.throwCdpError(result, "Runtime.enable failed")
    }
  }
}

/**
 * 创建 DriverAdapter 实例
 */
export function createDriverAdapter(config: DriverAdapterConfig): DriverAdapter {
  return new DriverAdapter(config)
}

