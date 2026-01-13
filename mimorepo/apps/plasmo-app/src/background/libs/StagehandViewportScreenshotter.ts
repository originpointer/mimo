import type { StagehandViewportScreenshotResponse } from "../../types/stagehand-screenshot"
import { toDebuggee } from "../stagehandSnapshot"

export class StagehandViewportScreenshotter {
  /**
   * 防抖/去重：同一个 tabId 的截图不并发执行，避免重复 attach debugger。
   */
  private readonly inFlightByTabId: Map<number, Promise<StagehandViewportScreenshotResponse>> = new Map()

  public async screenshotViewport(tabId: number): Promise<StagehandViewportScreenshotResponse> {
    const existing = this.inFlightByTabId.get(tabId)
    if (existing) return await existing

    const promise = this.screenshotImpl(tabId).finally(() => {
      this.inFlightByTabId.delete(tabId)
    })
    this.inFlightByTabId.set(tabId, promise)
    return await promise
  }

  private async sendCdp<T = unknown>(tabId: number, method: string, params?: Record<string, unknown>): Promise<T> {
    const target = toDebuggee(tabId, undefined)
    return await new Promise<T>((resolve, reject) => {
      try {
        chrome.debugger.sendCommand(target, method as never, (params || {}) as never, (result) => {
          const err = chrome.runtime.lastError
          if (err) return reject(new Error(String(err.message || err)))
          resolve(result as T)
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  private async screenshotImpl(tabId: number): Promise<StagehandViewportScreenshotResponse> {
    const started = Date.now()

    const attach = async () => {
      await new Promise<void>((resolve, reject) => {
        try {
          chrome.debugger.attach({ tabId }, "1.3", () => {
            const err = chrome.runtime.lastError
            if (err) return reject(new Error(err.message))
            resolve()
          })
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      })
    }

    const detach = async () => {
      await new Promise<void>((resolve) => {
        try {
          chrome.debugger.detach({ tabId }, () => resolve())
        } catch {
          resolve()
        }
      })
    }

    try {
      await attach()

      // 一些环境下未 enable 时调用 Page.* 可能会失败；先 enable 提高兼容性
      await this.sendCdp(tabId, "Page.enable", {}).catch(() => {})

      // 方案 A：不传 clip，让 Chromium 按“当前可视 viewport”输出截图。
      // 在页面缩放/HiDPI 场景下，避免 visualViewport.scale 带来的像素尺寸偏差。
      let res: { data?: string } | undefined
      try {
        res = await this.sendCdp<{ data?: string }>(tabId, "Page.captureScreenshot", {
          format: "png",
          fromSurface: true,
          captureBeyondViewport: false
        })
      } catch {
        // 兼容较老的 CDP：可能不支持 captureBeyondViewport 字段
        res = await this.sendCdp<{ data?: string }>(tabId, "Page.captureScreenshot", {
          format: "png",
          fromSurface: true
        })
      }

      const base64 = String(res?.data || "")
      if (!base64) return { ok: false, error: "Page.captureScreenshot returned empty data" }

      return {
        ok: true,
        base64,
        dataUrl: `data:image/png;base64,${base64}`,
        meta: { durationMs: Date.now() - started, tabId }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        ok: false,
        error:
          msg.includes("Cannot attach to this target") || msg.includes("Another debugger is already attached")
            ? `chrome.debugger.attach 失败（可能该 Tab 正在被 DevTools 调试）：${msg}`
            : msg
      }
    } finally {
      await detach()
    }
  }
}

