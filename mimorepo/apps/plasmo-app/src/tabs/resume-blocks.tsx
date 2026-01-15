import { useEffect, useMemo, useState } from "react"

import {
  RESUME_BLOCKS_EXTRACT,
  type ResumeBlocksExtractOptions,
  type ResumeBlocksExtractPayload,
  type ResumeBlocksExtractResponse
} from "../types/resume-blocks"
import { parseBlocksToJsonResumeXpath, type JsonResumeXpathParseResult } from "../utils/resumeJsonResumeXpath"
import client from "@/client"
import {
  RESUME_XPATH_VALIDATE,
  type ResumeXpathValidatePayload,
  type ResumeXpathValidateResponse
} from "../types/resume-validate"

type ExtractOptions = Partial<ResumeBlocksExtractOptions>

const DEFAULT_CONFIG: Required<ResumeBlocksExtractOptions> = {
  maxBlocks: 60,
  minTextLen: 80,
  maxTextLen: 2000,
  includeShadow: false,
  noiseSelectors: "header,nav,footer,aside,[role=banner],[role=navigation]",
  noiseClassIdRegex: "nav|menu|footer|header|sidebar|toolbar|pagination|breadcrumb|ads|comment"
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

function toOptions(input: ExtractOptions): Required<ResumeBlocksExtractOptions> {
  const maxBlocks =
    typeof input.maxBlocks === "number" && Number.isFinite(input.maxBlocks) && input.maxBlocks > 0
      ? Math.floor(input.maxBlocks)
      : DEFAULT_CONFIG.maxBlocks
  const minTextLen =
    typeof input.minTextLen === "number" && Number.isFinite(input.minTextLen) && input.minTextLen >= 0
      ? Math.floor(input.minTextLen)
      : DEFAULT_CONFIG.minTextLen
  const maxTextLen =
    typeof input.maxTextLen === "number" && Number.isFinite(input.maxTextLen) && input.maxTextLen > 0
      ? Math.floor(input.maxTextLen)
      : DEFAULT_CONFIG.maxTextLen
  const includeShadow = Boolean(input.includeShadow)
  const noiseSelectors =
    typeof input.noiseSelectors === "string" && input.noiseSelectors.trim() ? input.noiseSelectors.trim() : DEFAULT_CONFIG.noiseSelectors
  const noiseClassIdRegex =
    typeof input.noiseClassIdRegex === "string" && input.noiseClassIdRegex.trim()
      ? input.noiseClassIdRegex.trim()
      : DEFAULT_CONFIG.noiseClassIdRegex
  return { maxBlocks, minTextLen, maxTextLen, includeShadow, noiseSelectors, noiseClassIdRegex }
}

function toFilename(tabId: number | "active", url?: string) {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`
  let host = ""
  try {
    host = url ? new URL(url).hostname : ""
  } catch {
    host = ""
  }
  const safeHost = host ? host.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) : "unknown"
  return `mimo-resume-blocks-${safeHost}-${tabId}-${stamp}.json`
}

function toJsonResumeFilename(tabId: number | "active", url?: string) {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`
  let host = ""
  try {
    host = url ? new URL(url).hostname : ""
  } catch {
    host = ""
  }
  const safeHost = host ? host.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) : "unknown"
  return `mimo-jsonresume-xpath-${safeHost}-${tabId}-${stamp}.json`
}

function downloadJson(filename: string, obj: unknown) {
  const json = JSON.stringify(obj, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  return { url, revoke: () => URL.revokeObjectURL(url) }
}

function makeSampleId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function detectListLikeFromBlocks(resp: ResumeBlocksExtractResponse): { isList: boolean; reason?: string } {
  if (!resp.ok) return { isList: false }
  const t = String(resp.blocks?.map((b) => b.text).join(" ") || "")
  const actionHits = (t.match(/电话沟通|打招呼|继续聊聊/g) || []).length
  const nameHits = (t.match(/[\u4e00-\u9fa5]{1,4}(先生|女士)/g) || []).length
  const activeHits = (t.match(/今日活跃|本周活跃|本月活跃|昨日活跃/g) || []).length
  if (actionHits >= 3) return { isList: true, reason: "检测到列表动作词过多（电话沟通/打招呼/继续聊聊）" }
  if (nameHits >= 2) return { isList: true, reason: "检测到多个候选人姓名（X先生/X女士）" }
  if ((resp.blocks?.length || 0) === 1 && activeHits >= 2) return { isList: true, reason: "单块且活跃词重复，疑似聚合页" }
  return { isList: false }
}

function flattenXpaths(obj: any, basePath = ""): Array<{ fieldPath: string; xpath: string }> {
  const out: Array<{ fieldPath: string; xpath: string }> = []
  if (!obj || typeof obj !== "object") return out

  const walk = (v: any, p: string) => {
    if (typeof v === "string") {
      const s = v.trim()
      if (s.startsWith("/")) out.push({ fieldPath: p, xpath: s })
      return
    }
    if (Array.isArray(v)) {
      v.forEach((it, i) => walk(it, `${p}[${i}]`))
      return
    }
    if (v && typeof v === "object") {
      for (const k of Object.keys(v)) {
        walk(v[k], p ? `${p}.${k}` : k)
      }
    }
  }

  walk(obj, basePath)
  return out
}

function ResumeBlocksTab() {
  const [configText, setConfigText] = useState(() => JSON.stringify(DEFAULT_CONFIG, null, 2))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<ResumeBlocksExtractResponse | null>(null)
  const [parsedOut, setParsedOut] = useState<JsonResumeXpathParseResult | null>(null)
  const [nitroBaseUrl, setNitroBaseUrl] = useState("http://127.0.0.1:6006")
  // const nitroClient = useMemo(() => new HttpClient({ baseUrl: nitroBaseUrl }), [nitroBaseUrl])
  const [llmOut, setLlmOut] = useState<any>(null)
  const [llmSampleId, setLlmSampleId] = useState<string | null>(null)
  const [validateOut, setValidateOut] = useState<ResumeXpathValidateResponse | null>(null)

  type ParsedConfig = ReturnType<typeof safeJsonParse<Partial<ResumeBlocksExtractOptions>>>
  const parsed = useMemo<ParsedConfig>(() => safeJsonParse<Partial<ResumeBlocksExtractOptions>>(configText), [configText])

  const [tabs, setTabs] = useState<ChromeTabLite[]>([])
  const [targetTabId, setTargetTabId] = useState<number | "active">("active")

  const copyJson = async (label: string, data: unknown) => {
    setError(null)
    if (data == null) {
      setError(`${label} 为空，无法复制`)
      return
    }
    const text = JSON.stringify(data, null, 2)
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // ignore, fallback below
    }

    try {
      if (typeof document === "undefined") throw new Error("document 不可用")
      const el = document.createElement("textarea")
      el.value = text
      el.setAttribute("readonly", "true")
      el.style.position = "fixed"
      el.style.left = "-9999px"
      el.style.top = "0"
      document.body.appendChild(el)
      el.focus()
      el.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(el)
      if (!ok) throw new Error("execCommand(copy) 返回 false")
    } catch (e) {
      setError(`复制失败（${label}）：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const refreshTabs = async () => {
    if (!chrome?.tabs?.query) return
    const [all, active] = await Promise.all([queryTabsAllWindows(), queryActiveTabLastFocused()])
    setTabs(all)
    if (targetTabId === "active" && active?.id != null) {
      // keep as "active" (resolved by background)
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
    setParsedOut(null)
    setLlmOut(null)
    setLlmSampleId(null)
    setValidateOut(null)

    if (!("chrome" in globalThis) || !chrome?.runtime?.sendMessage) {
      setError("chrome.runtime 不可用：请在浏览器扩展环境中打开该 Tab Page")
      return
    }
    if (parsed.ok === false) {
      setError(`配置 JSON 解析失败：${parsed.error}`)
      return
    }

    const options = toOptions(parsed.value)
    let tabUrl: string | undefined
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      tabUrl = t?.url
      if (t && !isScannableUrl(t.url)) {
        setError(`目标 Tab 不可抽取（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }

    const payload: ResumeBlocksExtractPayload = {
      ...options,
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    setRunning(true)
    try {
      const out = (await chrome.runtime.sendMessage({
        type: RESUME_BLOCKS_EXTRACT,
        payload
      })) as ResumeBlocksExtractResponse | undefined

      if (!out) {
        setError("未收到响应（可能 background 未就绪或权限不足）")
        return
      }

      setResp(out)
      if (out.ok === false) {
        setError(out.error)
        return
      }

      // 说明：按你的要求，先禁用“Extract Blocks”自动下载 blocks JSON 的行为（只在页面预览）。
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const canParse = resp && resp.ok

  const parseToJsonResume = async () => {
    setError(null)
    setParsedOut(null)

    if (!resp || resp.ok === false) {
      setError("请先成功抽取 blocks，再进行解析")
      return
    }

    const out = parseBlocksToJsonResumeXpath(resp)
    setParsedOut(out)

    if (out.ok === false) {
      setError(out.error)
      return
    }

    if (out.pageKind === "list") {
      setError(out.reason || "检测到聚合/列表页：请打开单份简历详情页后再解析")
      return
    }

    // 自动下载 JSON（需要 downloads 权限）
    try {
      if (chrome?.downloads?.download) {
        const urlForName = resp.page?.url
        const { url, revoke } = downloadJson(toJsonResumeFilename(targetTabId, urlForName), out)
        await chrome.downloads.download({
          url,
          filename: toJsonResumeFilename(targetTabId, urlForName),
          saveAs: false,
          conflictAction: "uniquify"
        })
        setTimeout(revoke, 10_000)
      }
    } catch (e) {
      setError((prev) => prev || `下载失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const canLlm = resp && resp.ok && (resp as any)?.candidates && Array.isArray((resp as any).candidates) && (resp as any).candidates.length > 0

  const parseViaNitroLLM = async () => {
    setError(null)
    setLlmOut(null)
    setLlmSampleId(null)
    setValidateOut(null)

    if (!resp || resp.ok === false) {
      setError("请先成功抽取 blocks/candidates，再调用 Nitro LLM")
      return
    }
    const listLike = detectListLikeFromBlocks(resp)
    if (listLike.isList) {
      setError(`当前页面疑似“列表/聚合页”，请打开单份简历详情页后再解析。原因：${listLike.reason || ""}`)
      return
    }
    if (!resp.candidates || resp.candidates.length === 0) {
      setError("当前抽取结果未包含 candidates（候选节点），无法进行字段级 XPath 推理")
      return
    }

    const sampleId = makeSampleId()
    const sample = {
      sampleId,
      page: resp.page,
      mainContainer: resp.mainContainer,
      candidates: resp.candidates,
      blocks: resp.blocks,
      createdAt: Date.now()
    }

    try {
      const r = await client.postJson<any>("/api/resume/parse", { sample })
      const json = r.data
      if (!r.ok || !json?.ok) {
        setError(json?.error || `Nitro parse failed: HTTP ${r.status}`)
        return
      }
      setLlmOut(json)
      setLlmSampleId(String(json.sampleId || sampleId))

      // 自动下载 LLM 输出
      try {
        if (chrome?.downloads?.download) {
          const { url: blobUrl, revoke } = downloadJson(toJsonResumeFilename(targetTabId, resp.page?.url), json)
          await chrome.downloads.download({
            url: blobUrl,
            filename: toJsonResumeFilename(targetTabId, resp.page?.url),
            saveAs: false,
            conflictAction: "uniquify"
          })
          setTimeout(revoke, 10_000)
        }
      } catch (e) {
        setError((prev) => prev || `下载失败：${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const validateAndFeedback = async () => {
    setError(null)
    setValidateOut(null)

    if (!llmOut?.ok || !llmOut?.jsonResumeXPath) {
      setError("请先完成 Nitro LLM 解析，再进行验证/回传")
      return
    }
    const flat = flattenXpaths(llmOut.jsonResumeXPath)
    if (!flat.length) {
      setError("LLM 输出中未找到任何 XPath 字段（或格式不符合预期）")
      return
    }
    if (!("chrome" in globalThis) || !chrome?.runtime?.sendMessage) {
      setError("chrome.runtime 不可用：请在浏览器扩展环境中打开该 Tab Page")
      return
    }

    const payload: ResumeXpathValidatePayload = {
      xpaths: flat.map((x) => x.xpath),
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    try {
      const out = (await chrome.runtime.sendMessage({
        type: RESUME_XPATH_VALIDATE,
        payload
      })) as ResumeXpathValidateResponse | undefined

      if (!out) {
        setError("未收到验证响应（可能 background 未就绪或权限不足）")
        return
      }
      setValidateOut(out)
      if (out.ok === false) {
        setError(out.error)
        return
      }

      // 回传 Nitro
      const sampleId = String(llmOut.sampleId || llmSampleId || "")
      if (!sampleId) return

      const byXpath = new Map(out.results.map((r) => [r.xpath, r]))
      const fieldResults = flat.map((f) => {
        const hit = byXpath.get(f.xpath)
        const matchedCount = hit?.matchedCount ?? 0
        return {
          fieldPath: f.fieldPath,
          xpath: f.xpath,
          matchedCount,
          firstTextSnippet: hit?.firstTextSnippet,
          ok: matchedCount === 1
        }
      })

      const feedback = {
        sampleId,
        page: resp && resp.ok ? resp.page : undefined,
        validation: {
          total: fieldResults.length,
          okCount: fieldResults.filter((x) => x.ok).length,
          items: fieldResults
        },
        at: Date.now()
      }

      const r = await client.postJson<any>("/api/resume/feedback", { sampleId, feedback })
      const json = r.data
      if (!r.ok || !json?.ok) {
        setError(json?.error || `Nitro feedback failed: HTTP ${r.status}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h2 style={{ margin: "0 0 12px 0" }}>Resume Blocks（Tab Page）</h2>

      <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
        说明：点击执行后，会通过 CDP（chrome.debugger）对目标简历详情页抽取“候选块 blocks”（heading/text/locator/bbox/score/signals），并自动下载 JSON。
        <br />
        你可以用这份 JSON 样本来迭代后续的跨站点简历解析方案（root 选择、切块、过滤、排序等）。
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
                  {(ok ? "" : "[不可抽取] ") + (label.length > 180 ? label.slice(0, 180) + "..." : label)}
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
              {running ? "Running..." : "Extract Blocks + Download JSON"}
            </button>
            <button
              onClick={() => setConfigText(JSON.stringify(DEFAULT_CONFIG, null, 2))}
              disabled={running}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: running ? "not-allowed" : "pointer" }}>
              Reset
            </button>
            <button
              onClick={() => void parseToJsonResume()}
              disabled={running || !canParse}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: running || !canParse ? "not-allowed" : "pointer"
              }}>
              Parse to JSON Resume (XPath) + Download
            </button>
            <button
              onClick={() => void parseViaNitroLLM()}
              disabled={running || !canLlm}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: running || !canLlm ? "not-allowed" : "pointer"
              }}>
              Send to Nitro + LLM Parse + Download
            </button>
            <button
              onClick={() => void validateAndFeedback()}
              disabled={running || !llmOut?.ok}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: running || !llmOut?.ok ? "not-allowed" : "pointer"
              }}>
              Validate XPaths + Feedback
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#333", margin: "10px 0 6px 0" }}>Nitro Base URL</div>
          <input
            value={nitroBaseUrl}
            onChange={(e) => setNitroBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:6006"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12
            }}
          />
          {error && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>结果</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 6px 0" }}>
            <div style={{ fontSize: 12, color: "#333" }}>Extract 结果</div>
            <button
              onClick={() => void copyJson("Extract 结果", resp)}
              disabled={!resp}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: !resp ? "not-allowed" : "pointer",
                fontSize: 12
              }}>
              Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto",
              fontSize: 12
            }}>
            {resp ? JSON.stringify(resp, null, 2) : "（尚未执行）"}
          </pre>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 6px 0" }}>
            <div style={{ fontSize: 12, color: "#333" }}>JSON Resume (XPath)（解析结果）</div>
            <button
              onClick={() => void copyJson("JSON Resume (XPath)", parsedOut)}
              disabled={!parsedOut}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: !parsedOut ? "not-allowed" : "pointer",
                fontSize: 12
              }}>
              Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto",
              fontSize: 12
            }}>
            {parsedOut ? JSON.stringify(parsedOut, null, 2) : "（尚未解析）"}
          </pre>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 6px 0" }}>
            <div style={{ fontSize: 12, color: "#333" }}>Nitro LLM（JSON Resume XPath）</div>
            <button
              onClick={() => void copyJson("Nitro LLM（JSON Resume XPath）", llmOut)}
              disabled={!llmOut}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: !llmOut ? "not-allowed" : "pointer",
                fontSize: 12
              }}>
              Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto",
              fontSize: 12
            }}>
            {llmOut ? JSON.stringify(llmOut, null, 2) : "（尚未调用 Nitro）"}
          </pre>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 6px 0" }}>
            <div style={{ fontSize: 12, color: "#333" }}>XPath 验证结果（CDP）</div>
            <button
              onClick={() => void copyJson("XPath 验证结果（CDP）", validateOut)}
              disabled={!validateOut}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: !validateOut ? "not-allowed" : "pointer",
                fontSize: 12
              }}>
              Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflow: "auto",
              fontSize: 12
            }}>
            {validateOut ? JSON.stringify(validateOut, null, 2) : "（尚未验证）"}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default ResumeBlocksTab

