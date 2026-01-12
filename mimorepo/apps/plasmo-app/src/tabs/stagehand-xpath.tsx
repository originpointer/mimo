import { useEffect, useMemo, useState } from "react"

import {
  STAGEHAND_XPATH_SCAN,
  type StagehandXPathScanPayload,
  type StagehandXPathScanOptions,
  type StagehandXPathScanResponse
} from "../types/stagehand-xpath"

type ScanOptions = Partial<StagehandXPathScanOptions>

const DEFAULT_CONFIG: Required<StagehandXPathScanOptions> = {
  maxItems: 200,
  selector: "a,button,input,textarea,select,[role='button'],[onclick]",
  includeShadow: false
}

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
  // Content scripts 不会注入这些 scheme
  const blockedPrefixes = [
    "chrome://",
    "edge://",
    "about:",
    "devtools://",
    "chrome-extension://",
    "moz-extension://",
    "view-source:"
  ]
  if (blockedPrefixes.some((p) => u.startsWith(p))) return false
  // file:// 需要用户在扩展详情页手动打开 “Allow access to file URLs”
  // 这里先当作不可扫描，避免误导
  if (u.startsWith("file://")) return false
  return true
}

function safeJsonParse<T>(text: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
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

function toOptions(input: ScanOptions): Required<StagehandXPathScanOptions> {
  const maxItems =
    typeof input.maxItems === "number" && Number.isFinite(input.maxItems) && input.maxItems > 0
      ? Math.floor(input.maxItems)
      : DEFAULT_CONFIG.maxItems
  const selector = typeof input.selector === "string" && input.selector.trim() ? input.selector.trim() : DEFAULT_CONFIG.selector
  const includeShadow = Boolean(input.includeShadow)
  return { maxItems, selector, includeShadow }
}

function StagehandXPathTab() {
  const [configText, setConfigText] = useState(() => JSON.stringify(DEFAULT_CONFIG, null, 2))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<StagehandXPathScanResponse | null>(null)

  type ParsedConfig = ReturnType<typeof safeJsonParse<Partial<StagehandXPathScanOptions>>>
  const parsed = useMemo<ParsedConfig>(() => safeJsonParse<Partial<StagehandXPathScanOptions>>(configText), [configText])

  const [tabs, setTabs] = useState<ChromeTabLite[]>([])
  const [targetTabId, setTargetTabId] = useState<number | "active">("active")

  const refreshTabs = async () => {
    if (!chrome?.tabs?.query) return
    const [all, active] = await Promise.all([queryTabsAllWindows(), queryActiveTabLastFocused()])
    setTabs(all)
    if (targetTabId === "active" && active?.id != null) {
      // keep as "active" (resolved by background), but show active info via label list
      void active
    }
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

    if (parsed.ok === false) {
      setError(`配置 JSON 解析失败：${parsed.error}`)
      return
    }

    const options = toOptions(parsed.value)
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setError(`目标 Tab 不可扫描（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }
    const payload: StagehandXPathScanPayload = {
      ...options,
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }
    setRunning(true)
    try {
      const out = (await chrome.runtime.sendMessage({
        type: STAGEHAND_XPATH_SCAN,
        payload
      })) as StagehandXPathScanResponse | undefined

      if (!out) {
        setError("未收到响应（可能 content script 未注入到当前页面）")
        return
      }
      setResp(out)
      if (out.ok === false) setError(out.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h2 style={{ margin: "0 0 12px 0" }}>StagehandXPath（Tab Page）</h2>

      <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
        说明：点击执行后，会对“当前活动标签页”扫描可交互元素，并生成 stagehand 风格绝对 XPath（每段带索引）。
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
                  {(ok ? "" : "[不可扫描] ") + (label.length > 180 ? label.slice(0, 180) + "..." : label)}
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
          <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>配置（JSON）</div>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 180,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
              fontSize: 12,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb"
            }}
          />
          {parsed.ok === false && <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }}>JSON 无效：{parsed.error}</div>}
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => void run()}
              disabled={running}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: running ? "not-allowed" : "pointer" }}>
              {running ? "Running..." : "Scan + Build XPath"}
            </button>
            <button
              onClick={() => setConfigText(JSON.stringify(DEFAULT_CONFIG, null, 2))}
              disabled={running}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: running ? "not-allowed" : "pointer" }}>
              Reset
            </button>
          </div>
          {error && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>结果</div>
          <pre
            style={{
              margin: 0,
              minHeight: 180,
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

export default StagehandXPathTab

