import { useEffect, useMemo, useState } from "react"

import {
  STAGEHAND_VIEWPORT_SCREENSHOT,
  type StagehandViewportScreenshotPayload,
  type StagehandViewportScreenshotResponse
} from "../types/stagehand-screenshot"

type ChromeTabLite = {
  id?: number
  url?: string
  title?: string
  windowId?: number
  active?: boolean
}

function isScannableUrl(url: string | undefined): boolean {
  const u = String(url || "")
  if (!u) return false
  const blockedPrefixes = ["chrome://", "edge://", "about:", "devtools://", "chrome-extension://", "moz-extension://", "view-source:"]
  if (blockedPrefixes.some((p) => u.startsWith(p))) return false
  if (u.startsWith("file://")) return false
  return true
}

async function queryTabsAllWindows(): Promise<ChromeTabLite[]> {
  return await new Promise((resolve) => {
    try {
      chrome.tabs.query({}, (tabs) => resolve((tabs as ChromeTabLite[]) || []))
    } catch {
      resolve([])
    }
  })
}

async function queryActiveTabLastFocused(): Promise<ChromeTabLite | undefined> {
  return await new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => resolve((tabs as ChromeTabLite[])?.[0]))
    } catch {
      resolve(undefined)
    }
  })
}

function toFilename(tabId: number | "active") {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`
  return `mimo-viewport-${tabId}-${stamp}.png`
}

function StagehandScreenshotTab() {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<StagehandViewportScreenshotResponse | null>(null)

  const [tabs, setTabs] = useState<ChromeTabLite[]>([])
  const [targetTabId, setTargetTabId] = useState<number | "active">("active")

  const dataUrl = useMemo(() => (resp && resp.ok ? resp.dataUrl : null), [resp])

  const refreshTabs = async () => {
    if (!chrome?.tabs?.query) return
    const [all] = await Promise.all([queryTabsAllWindows(), queryActiveTabLastFocused()])
    setTabs(all)
  }

  useEffect(() => {
    if (!("chrome" in globalThis) || !chrome?.tabs?.query) return
    void refreshTabs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async () => {
    setError(null)
    setResp(null)

    if (!("chrome" in globalThis) || !chrome?.runtime?.sendMessage) {
      setError("chrome.runtime 不可用：请在浏览器扩展环境中打开该 Tab Page")
      return
    }

    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setError(`目标 Tab 不可截图（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }

    const payload: StagehandViewportScreenshotPayload = {
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    setRunning(true)
    try {
      const out = (await chrome.runtime.sendMessage({
        type: STAGEHAND_VIEWPORT_SCREENSHOT,
        payload
      })) as StagehandViewportScreenshotResponse | undefined

      if (!out) {
        setError("未收到响应（可能 background 未就绪或权限不足）")
        return
      }
      setResp(out)
      if (out.ok === false) {
        setError(out.error)
        return
      }

      // 自动下载 PNG（需要 downloads 权限）
      try {
        if (chrome?.downloads?.download) {
          await chrome.downloads.download({
            url: out.dataUrl,
            filename: toFilename(targetTabId),
            saveAs: false,
            conflictAction: "uniquify"
          })
        }
      } catch (e) {
        // 下载失败不影响预览
        setError((prev) => prev || `下载失败：${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h2 style={{ margin: "0 0 12px 0" }}>Viewport Screenshot（Tab Page）</h2>

      <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
        说明：点击执行后，通过 CDP（chrome.debugger）对“目标 Tab 当前可视 viewport”截图。
        <br />
        该截图是浏览器合成后的结果，天然包含页面中（同域/跨域）iframe 的渲染内容。
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#333" }}>目标 Tab</div>
        <select
          value={String(targetTabId)}
          onChange={(e) => {
            const v = e.target.value
            if (v === "active") setTargetTabId("active")
            else setTargetTabId(Number(v))
          }}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd", minWidth: 360 }}>
          <option value="active">当前活动标签页（active tab）</option>
          {tabs
            .filter((t) => typeof t.id === "number" && typeof t.url === "string")
            .map((t) => {
              const id = t.id as number
              const url = String(t.url || "")
              const title = String(t.title || "")
              const label = `${id} | ${title ? title + " | " : ""}${url}`
              const ok = isScannableUrl(url)
              return (
                <option key={id} value={String(id)} disabled={!ok}>
                  {(ok ? "" : "[不可截图] ") + (label.length > 180 ? label.slice(0, 180) + "..." : label)}
                </option>
              )
            })}
        </select>
        <button
          onClick={() => void refreshTabs()}
          disabled={running}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: running ? "not-allowed" : "pointer" }}>
          Refresh Tabs
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => void run()}
              disabled={running}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: running ? "not-allowed" : "pointer" }}>
              {running ? "Capturing..." : "Capture Viewport + Download"}
            </button>
          </div>
          {error && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>预览</div>
          <div
            style={{
              minHeight: 180,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto"
            }}>
            {dataUrl ? (
              <img src={dataUrl} alt="viewport screenshot" style={{ maxWidth: "100%", height: "auto", borderRadius: 6 }} />
            ) : (
              <div style={{ fontSize: 12, color: "#666" }}>（尚未截图）</div>
            )}
          </div>

          <div style={{ fontSize: 12, color: "#333", margin: "10px 0 6px 0" }}>响应（调试）</div>
          <pre
            style={{
              margin: 0,
              minHeight: 120,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto",
              fontSize: 12
            }}>
            {resp ? JSON.stringify(resp, null, 2) : "（尚未执行）"}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default StagehandScreenshotTab

