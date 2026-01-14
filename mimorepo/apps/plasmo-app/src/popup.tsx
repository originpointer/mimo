import { useEffect, useMemo, useState } from "react"

function IndexPopup() {
  type ChromeTabLite = {
    id?: number
    url?: string
    title?: string
    windowId?: number
    active?: boolean
  }

  const [tabs, setTabs] = useState<ChromeTabLite[]>([])
  const [targetTabId, setTargetTabId] = useState<number | "active">("active")
  const [error, setError] = useState<string | null>(null)

  const refreshTabs = async () => {
    setError(null)
    if (!chrome?.tabs?.query) {
      setError("chrome.tabs 不可用：请在扩展 popup 中打开")
      return
    }
    const all = await new Promise<ChromeTabLite[]>((resolve) => {
      try {
        chrome.tabs.query({ currentWindow: true }, (ts) => resolve((ts as ChromeTabLite[]) || []))
      } catch {
        resolve([])
      }
    })
    setTabs(all)

    const active = all.find((t) => t.active && typeof t.id === "number")
    if (active?.id != null) setTargetTabId(active.id)
  }

  useEffect(() => {
    void refreshTabs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabOptions = useMemo(() => {
    return tabs
      .filter((t) => typeof t.id === "number")
      .map((t) => {
        const id = t.id as number
        const url = String(t.url || "")
        const title = String(t.title || "")
        const label = `${t.active ? "[Active] " : ""}${id} | ${title ? title + " | " : ""}${url}`
        return { id, url, title, label: label.length > 140 ? label.slice(0, 140) + "..." : label }
      })
  }, [tabs])

  const openTabPage = async (name: "resume-blocks" | "stagehand-xpath" | "stagehand-screenshot") => {
    setError(null)
    if (!chrome?.tabs?.create || !chrome?.runtime?.getURL) {
      setError("chrome.tabs.create 不可用：请在扩展 popup 中打开")
      return
    }
    const url = chrome.runtime.getURL(`tabs/${name}.html`)
    const withParam = `${url}?targetTabId=${encodeURIComponent(String(targetTabId))}`
    try {
      chrome.tabs.create({ url: withParam })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div
      style={{
        padding: 12,
        width: 360,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mimo Agent</div>

      <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>选择目标 Tab（用于预填 Tab Page 的 targetTabId）</div>
      <select
        value={String(targetTabId)}
        onChange={(e) => setTargetTabId(Number(e.target.value))}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 12,
          marginBottom: 8
        }}>
        {tabOptions.length ? (
          tabOptions.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.label}
            </option>
          ))
        ) : (
          <option value="active">（未发现 Tab）</option>
        )}
      </select>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => void refreshTabs()}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}>
          Refresh Tabs
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>打开工具页（Tab Page）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => void openTabPage("resume-blocks")}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", textAlign: "left" }}>
          Resume Blocks / LLM Parse
        </button>
        <button
          onClick={() => void openTabPage("stagehand-xpath")}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", textAlign: "left" }}>
          Stagehand XPath
        </button>
        <button
          onClick={() => void openTabPage("stagehand-screenshot")}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", textAlign: "left" }}>
          Viewport Screenshot
        </button>
      </div>

      {error && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{error}</div>}
    </div>
  )
}

export default IndexPopup
