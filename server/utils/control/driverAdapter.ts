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
  error?: { message: string; name?: string }
  durationMs: number
}

export interface FrameInfo {
  sessionId: string
  targetId: string
  type: string
  url: string
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
  
  /**
   * 发送 CDP 命令
   */
  async send(
    method: string,
    params: Record<string, unknown> = {},
    options?: { sessionId?: string; tabId?: number; timeoutMs?: number }
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
    controlBus.publish(envelope, { commandId, traceId, callbackToken, expiresAt: issuedAt + ttlMs })
    
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
      response: result.result?.response,
      error: result.error,
      durationMs: result.telemetry?.durationMs ?? Date.now() - issuedAt
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
      throw new Error(result.error?.message ?? "Evaluate failed")
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
      throw new Error(result.error?.message ?? "getFrameTree failed")
    }
    return (result.response as { frameTree?: unknown })?.frameTree
  }
  
  /**
   * 获取文档根节点
   */
  async getDocument(options?: { sessionId?: string; tabId?: number; depth?: number }): Promise<unknown> {
    const result = await this.send(
      "DOM.getDocument",
      { depth: options?.depth ?? 0 },
      options
    )
    if (!result.ok) {
      throw new Error(result.error?.message ?? "getDocument failed")
    }
    return (result.response as { root?: unknown })?.root
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
      throw new Error(result.error?.message ?? "Screenshot failed")
    }
    return (result.response as { data?: string })?.data ?? ""
  }
  
  /**
   * 导航到 URL
   */
  async navigate(url: string, options?: { waitForLoad?: boolean }): Promise<void> {
    const result = await this.send("Page.navigate", { url })
    if (!result.ok) {
      throw new Error(result.error?.message ?? "Navigate failed")
    }
    if (options?.waitForLoad !== false) {
      await this.waitForLoad()
    }
  }
  
  /**
   * 点击元素（通过坐标）
   */
  async clickAt(x: number, y: number): Promise<void> {
    // Mouse down
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1
    })
    // Mouse up
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1
    })
  }
  
  /**
   * 输入文本
   */
  async type(text: string): Promise<void> {
    await this.send("Input.insertText", { text })
  }
  
  /**
   * 按键
   */
  async press(key: string): Promise<void> {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key })
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key })
  }
}

/**
 * 创建 DriverAdapter 实例
 */
export function createDriverAdapter(config: DriverAdapterConfig): DriverAdapter {
  return new DriverAdapter(config)
}

