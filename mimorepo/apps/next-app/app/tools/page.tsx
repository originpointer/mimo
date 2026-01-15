"use client"

import { useEffect, useMemo, useState } from "react"
import { sendToExtension } from "@/lib/extension-bridge"
import { fetchExtensionList, getNitroBaseUrl, type ExtensionListItem } from "@/lib/nitro-config"
import { parseBlocksToJsonResumeXpath, type JsonResumeXpathParseResult } from "@/lib/resumeJsonResumeXpath"
import {
  LIST_TABS,
  RESUME_BLOCKS_EXTRACT,
  RESUME_XPATH_VALIDATE,
  STAGEHAND_VIEWPORT_SCREENSHOT,
  STAGEHAND_XPATH_SCAN,
  type ListTabsItem,
  type ListTabsResponse,
  type ResumeBlocksExtractOptions,
  type ResumeBlocksExtractPayload,
  type ResumeBlocksExtractResponse,
  type ResumeXpathValidatePayload,
  type ResumeXpathValidateResponse,
  type StagehandViewportScreenshotPayload,
  type StagehandViewportScreenshotResponse,
  type StagehandXPathScanOptions,
  type StagehandXPathScanPayload,
  type StagehandXPathScanResponse
} from "@/types/plasmo"

type ChromeTabLite = ListTabsItem

type ExtractOptions = Partial<ResumeBlocksExtractOptions>
type ScanOptions = Partial<StagehandXPathScanOptions>

const DEFAULT_RESUME_CONFIG: Required<ResumeBlocksExtractOptions> = {
  maxBlocks: 60,
  minTextLen: 80,
  maxTextLen: 2000,
  includeShadow: false,
  noiseSelectors: "header,nav,footer,aside,[role=banner],[role=navigation]",
  noiseClassIdRegex: "nav|menu|footer|header|sidebar|toolbar|pagination|breadcrumb|ads|comment"
}

const DEFAULT_XPATH_CONFIG: Required<StagehandXPathScanOptions> = {
  maxItems: 200,
  selector: "a,button,input,textarea,select,[role='button'],[onclick]",
  includeShadow: false
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

function toResumeOptions(input: ExtractOptions): Required<ResumeBlocksExtractOptions> {
  const maxBlocks =
    typeof input.maxBlocks === "number" && Number.isFinite(input.maxBlocks) && input.maxBlocks > 0
      ? Math.floor(input.maxBlocks)
      : DEFAULT_RESUME_CONFIG.maxBlocks
  const minTextLen =
    typeof input.minTextLen === "number" && Number.isFinite(input.minTextLen) && input.minTextLen >= 0
      ? Math.floor(input.minTextLen)
      : DEFAULT_RESUME_CONFIG.minTextLen
  const maxTextLen =
    typeof input.maxTextLen === "number" && Number.isFinite(input.maxTextLen) && input.maxTextLen > 0
      ? Math.floor(input.maxTextLen)
      : DEFAULT_RESUME_CONFIG.maxTextLen
  const includeShadow = Boolean(input.includeShadow)
  const noiseSelectors =
    typeof input.noiseSelectors === "string" && input.noiseSelectors.trim() ? input.noiseSelectors.trim() : DEFAULT_RESUME_CONFIG.noiseSelectors
  const noiseClassIdRegex =
    typeof input.noiseClassIdRegex === "string" && input.noiseClassIdRegex.trim()
      ? input.noiseClassIdRegex.trim()
      : DEFAULT_RESUME_CONFIG.noiseClassIdRegex
  return { maxBlocks, minTextLen, maxTextLen, includeShadow, noiseSelectors, noiseClassIdRegex }
}

function toXpathOptions(input: ScanOptions): Required<StagehandXPathScanOptions> {
  const maxItems =
    typeof input.maxItems === "number" && Number.isFinite(input.maxItems) && input.maxItems > 0
      ? Math.floor(input.maxItems)
      : DEFAULT_XPATH_CONFIG.maxItems
  const selector = typeof input.selector === "string" && input.selector.trim() ? input.selector.trim() : DEFAULT_XPATH_CONFIG.selector
  const includeShadow = Boolean(input.includeShadow)
  return { maxItems, selector, includeShadow }
}

function toFilename(tabId: number | "active") {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`
  return `mimo-viewport-${tabId}-${stamp}.png`
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
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
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

export default function ToolsPage() {
  const [extensionId, setExtensionId] = useState<string>("")
  const [extensionName, setExtensionName] = useState<string>("")
  const [extensionList, setExtensionList] = useState<ExtensionListItem[]>([])
  const [extensionError, setExtensionError] = useState<string | null>(null)

  const [tabs, setTabs] = useState<ChromeTabLite[]>([])
  const [targetTabId, setTargetTabId] = useState<number | "active">("active")
  const [tabsError, setTabsError] = useState<string | null>(null)

  const [xpathConfigText, setXpathConfigText] = useState(() => JSON.stringify(DEFAULT_XPATH_CONFIG, null, 2))
  const [xpathRunning, setXpathRunning] = useState(false)
  const [xpathError, setXpathError] = useState<string | null>(null)
  const [xpathResp, setXpathResp] = useState<StagehandXPathScanResponse | null>(null)

  const [shotRunning, setShotRunning] = useState(false)
  const [shotError, setShotError] = useState<string | null>(null)
  const [shotResp, setShotResp] = useState<StagehandViewportScreenshotResponse | null>(null)

  const [resumeConfigText, setResumeConfigText] = useState(() => JSON.stringify(DEFAULT_RESUME_CONFIG, null, 2))
  const [resumeRunning, setResumeRunning] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeResp, setResumeResp] = useState<ResumeBlocksExtractResponse | null>(null)
  const [parsedOut, setParsedOut] = useState<JsonResumeXpathParseResult | null>(null)
  const [nitroBaseUrl, setNitroBaseUrl] = useState(() => getNitroBaseUrl())
  const [llmOut, setLlmOut] = useState<any>(null)
  const [llmSampleId, setLlmSampleId] = useState<string | null>(null)
  const [validateOut, setValidateOut] = useState<ResumeXpathValidateResponse | null>(null)

  type ParsedResumeConfig = ReturnType<typeof safeJsonParse<Partial<ResumeBlocksExtractOptions>>>
  const parsedResume = useMemo<ParsedResumeConfig>(() => safeJsonParse<Partial<ResumeBlocksExtractOptions>>(resumeConfigText), [resumeConfigText])
  type ParsedXpathConfig = ReturnType<typeof safeJsonParse<Partial<StagehandXPathScanOptions>>>
  const parsedXpath = useMemo<ParsedXpathConfig>(() => safeJsonParse<Partial<StagehandXPathScanOptions>>(xpathConfigText), [xpathConfigText])

  const refreshTabs = async (extId?: string) => {
    setTabsError(null)
    const effectiveId = String(extId || extensionId || "").trim()
    if (!effectiveId) {
      setTabsError("extensionId 未就绪，请先启动扩展并完成上报")
      return
    }
    try {
      const out = await sendToExtension<ListTabsResponse>({
        type: LIST_TABS,
        payload: { includeAllWindows: true }
      }, effectiveId)
      if (!out) {
        setTabsError("未收到 tabs 响应")
        return
      }
      if (out.ok === false) {
        setTabsError(out.error)
        return
      }
      setTabs(out.tabs)
    } catch (e) {
      setTabsError(e instanceof Error ? e.message : String(e))
    }
  }

  const selectExtension = (name: string) => {
    setExtensionName(name)
    const picked = extensionList.find((item) => item.extensionName === name)
    if (!picked) {
      setExtensionId("")
      setExtensionError("extensionId 未就绪，请先启动扩展并完成上报")
      return
    }
    setExtensionError(null)
    setExtensionId(picked.extensionId)
    void refreshTabs(picked.extensionId)
  }

  useEffect(() => {
    const run = async () => {
      setExtensionError(null)
      const out = await fetchExtensionList()
      if (!out.extensions.length) {
        setExtensionId("")
        setExtensionName("")
        setExtensionList([])
        setExtensionError(out.error || "未发现已注册扩展，请先启动扩展并完成上报")
        return
      }
      setExtensionList(out.extensions)
      const selected = out.latest || out.extensions[0]
      if (!selected) {
        setExtensionId("")
        setExtensionName("")
        setExtensionError(out.error || "未发现可用扩展")
        return
      }
      setExtensionName(selected.extensionName)
      setExtensionId(selected.extensionId)
      void refreshTabs(selected.extensionId)
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyJson = async (label: string, data: unknown, setError: (v: string | null) => void) => {
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

  const ensureExtensionId = (setError: (v: string | null) => void) => {
    if (!extensionId) {
      setError("extensionId 未就绪，请先启动扩展并完成上报")
      return false
    }
    return true
  }

  const runXPath = async () => {
    setXpathError(null)
    setXpathResp(null)
    if (!ensureExtensionId(setXpathError)) return
    if (parsedXpath.ok === false) {
      setXpathError(`配置 JSON 解析失败：${parsedXpath.error}`)
      return
    }
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setXpathError(`目标 Tab 不可扫描（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }
    const payload: StagehandXPathScanPayload = {
      ...toXpathOptions(parsedXpath.value),
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }
    setXpathRunning(true)
    try {
      const out = await sendToExtension<StagehandXPathScanResponse>({
        type: STAGEHAND_XPATH_SCAN,
        payload
      }, extensionId)
      if (!out) {
        setXpathError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setXpathResp(out)
      if (out.ok === false) setXpathError(out.error)
    } catch (e) {
      setXpathError(e instanceof Error ? e.message : String(e))
    } finally {
      setXpathRunning(false)
    }
  }

  const runScreenshot = async () => {
    setShotError(null)
    setShotResp(null)
    if (!ensureExtensionId(setShotError)) return
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setShotError(`目标 Tab 不可截图（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }
    const payload: StagehandViewportScreenshotPayload = {
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }
    setShotRunning(true)
    try {
      const out = await sendToExtension<StagehandViewportScreenshotResponse>({
        type: STAGEHAND_VIEWPORT_SCREENSHOT,
        payload
      }, extensionId)
      if (!out) {
        setShotError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setShotResp(out)
      if (out.ok === false) setShotError(out.error)
    } catch (e) {
      setShotError(e instanceof Error ? e.message : String(e))
    } finally {
      setShotRunning(false)
    }
  }

  const runResumeExtract = async () => {
    setResumeError(null)
    setResumeResp(null)
    setParsedOut(null)
    setLlmOut(null)
    setLlmSampleId(null)
    setValidateOut(null)
    if (!ensureExtensionId(setResumeError)) return

    if (parsedResume.ok === false) {
      setResumeError(`配置 JSON 解析失败：${parsedResume.error}`)
      return
    }
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setResumeError(`目标 Tab 不可抽取（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }
    const payload: ResumeBlocksExtractPayload = {
      ...toResumeOptions(parsedResume.value),
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }
    setResumeRunning(true)
    try {
      const out = await sendToExtension<ResumeBlocksExtractResponse>({
        type: RESUME_BLOCKS_EXTRACT,
        payload
      }, extensionId)
      if (!out) {
        setResumeError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setResumeResp(out)
      if (out.ok === false) setResumeError(out.error)
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : String(e))
    } finally {
      setResumeRunning(false)
    }
  }

  const canParse = resumeResp && resumeResp.ok
  const canLlm =
    resumeResp &&
    resumeResp.ok &&
    (resumeResp as any)?.candidates &&
    Array.isArray((resumeResp as any).candidates) &&
    (resumeResp as any).candidates.length > 0

  const parseToJsonResume = async () => {
    setResumeError(null)
    setParsedOut(null)

    if (!resumeResp || resumeResp.ok === false) {
      setResumeError("请先成功抽取 blocks，再进行解析")
      return
    }

    const out = parseBlocksToJsonResumeXpath(resumeResp)
    setParsedOut(out)

    if (out.ok === false) {
      setResumeError(out.error)
      return
    }

    if (out.pageKind === "list") {
      setResumeError(out.reason || "检测到聚合/列表页：请打开单份简历详情页后再解析")
      return
    }

    try {
      downloadJson(toJsonResumeFilename(targetTabId, resumeResp.page?.url), out)
    } catch (e) {
      setResumeError((prev) => prev || `下载失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const parseViaNitroLLM = async () => {
    setResumeError(null)
    setLlmOut(null)
    setLlmSampleId(null)
    setValidateOut(null)

    if (!resumeResp || resumeResp.ok === false) {
      setResumeError("请先成功抽取 blocks/candidates，再调用 Nitro LLM")
      return
    }
    const listLike = detectListLikeFromBlocks(resumeResp)
    if (listLike.isList) {
      setResumeError(`当前页面疑似“列表/聚合页”，请打开单份简历详情页后再解析。原因：${listLike.reason || ""}`)
      return
    }
    if (!resumeResp.candidates || resumeResp.candidates.length === 0) {
      setResumeError("当前抽取结果未包含 candidates（候选节点），无法进行字段级 XPath 推理")
      return
    }

    const sampleId = makeSampleId()
    const sample = {
      sampleId,
      page: resumeResp.page,
      mainContainer: resumeResp.mainContainer,
      candidates: resumeResp.candidates,
      blocks: resumeResp.blocks,
      createdAt: Date.now()
    }

    try {
      const url = `${nitroBaseUrl.replace(/\/+$/, "")}/api/resume/parse`
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sample })
      })
      const json = (await r.json().catch(() => null)) as any
      if (!r.ok || !json?.ok) {
        setResumeError(json?.error || `Nitro parse failed: HTTP ${r.status}`)
        return
      }
      setLlmOut(json)
      setLlmSampleId(String(json.sampleId || sampleId))

      try {
        downloadJson(toJsonResumeFilename(targetTabId, resumeResp.page?.url), json)
      } catch (e) {
        setResumeError((prev) => prev || `下载失败：${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : String(e))
    }
  }

  const validateAndFeedback = async () => {
    setResumeError(null)
    setValidateOut(null)

    if (!llmOut?.ok || !llmOut?.jsonResumeXPath) {
      setResumeError("请先完成 Nitro LLM 解析，再进行验证/回传")
      return
    }
    const flat = flattenXpaths(llmOut.jsonResumeXPath)
    if (!flat.length) {
      setResumeError("LLM 输出中未找到任何 XPath 字段（或格式不符合预期）")
      return
    }

    const payload: ResumeXpathValidatePayload = {
      xpaths: flat.map((x) => x.xpath),
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    try {
      const out = await sendToExtension<ResumeXpathValidateResponse>({
        type: RESUME_XPATH_VALIDATE,
        payload
      }, extensionId)
      if (!out) {
        setResumeError("未收到验证响应（可能扩展未就绪或权限不足）")
        return
      }
      setValidateOut(out)
      if (out.ok === false) {
        setResumeError(out.error)
        return
      }

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
        page: resumeResp && resumeResp.ok ? resumeResp.page : undefined,
        validation: {
          total: fieldResults.length,
          okCount: fieldResults.filter((x) => x.ok).length,
          items: fieldResults
        },
        at: Date.now()
      }

      const url = `${nitroBaseUrl.replace(/\/+$/, "")}/api/resume/feedback`
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sampleId, feedback })
      })
      const json = (await r.json().catch(() => null)) as any
      if (!r.ok || !json?.ok) {
        setResumeError(json?.error || `Nitro feedback failed: HTTP ${r.status}`)
      }
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : String(e))
    }
  }

  const dataUrl = useMemo(() => (shotResp && shotResp.ok ? shotResp.dataUrl : null), [shotResp])

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h1 style={{ margin: "0 0 12px 0" }}>Tools</h1>

      {extensionError && (
        <div style={{ marginBottom: 10, color: "#b00020", fontSize: 12 }}>
          {extensionError}
        </div>
      )}
      {tabsError && (
        <div style={{ marginBottom: 10, color: "#b00020", fontSize: 12 }}>
          Tabs 获取失败：{tabsError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#333" }}>扩展</div>
        <select
          value={extensionName}
          onChange={(e) => selectExtension(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd", minWidth: 260 }}>
          <option value="" disabled>
            {extensionList.length ? "请选择扩展" : "暂无已注册扩展"}
          </option>
          {extensionList.map((item) => (
            <option key={item.extensionName} value={item.extensionName}>
              {item.extensionName}
            </option>
          ))}
        </select>
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
            .filter((t) => typeof t.id === "number")
            .map((t) => {
              const id = t.id as number
              const url = String(t.url || "")
              const title = String(t.title || "")
              const label = `${id} | ${title ? title + " | " : ""}${url}`
              const ok = isScannableUrl(url)
              return (
                <option key={id} value={String(id)} disabled={!ok}>
                  {(ok ? "" : "[不可用] ") + (label.length > 180 ? label.slice(0, 180) + "..." : label)}
                </option>
              )
            })}
        </select>
        <button
          onClick={() => void refreshTabs()}
          disabled={xpathRunning || shotRunning || resumeRunning}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: xpathRunning || shotRunning || resumeRunning ? "not-allowed" : "pointer"
          }}>
          Refresh Tabs
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px 0" }}>Stagehand XPath</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：通过扩展后台走 CDP 扫描可交互元素，生成 stagehand 风格 XPath。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>配置（JSON）</div>
              <textarea
                value={xpathConfigText}
                onChange={(e) => setXpathConfigText(e.target.value)}
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
              {parsedXpath.ok === false && <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }}>JSON 无效：{parsedXpath.error}</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => void runXPath()}
                  disabled={xpathRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: xpathRunning ? "not-allowed" : "pointer" }}>
                  {xpathRunning ? "Running..." : "Scan + Build XPath"}
                </button>
                <button
                  onClick={() => setXpathConfigText(JSON.stringify(DEFAULT_XPATH_CONFIG, null, 2))}
                  disabled={xpathRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: xpathRunning ? "not-allowed" : "pointer" }}>
                  Reset
                </button>
              </div>
              {xpathError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{xpathError}</div>}
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
                {xpathResp ? JSON.stringify(xpathResp, null, 2) : "（尚未执行）"}
              </pre>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px 0" }}>Viewport Screenshot</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：通过扩展后台对目标 Tab 当前可视 viewport 截图。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 320 }}>
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => void runScreenshot()}
                  disabled={shotRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: shotRunning ? "not-allowed" : "pointer" }}>
                  {shotRunning ? "Capturing..." : "Capture Viewport"}
                </button>
                <button
                  onClick={() => {
                    if (dataUrl) downloadDataUrl(toFilename(targetTabId), dataUrl)
                  }}
                  disabled={!dataUrl}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: !dataUrl ? "not-allowed" : "pointer" }}>
                  Download PNG
                </button>
              </div>
              {shotError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{shotError}</div>}
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
                {shotResp ? JSON.stringify(shotResp, null, 2) : "（尚未执行）"}
              </pre>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px 0" }}>Resume Blocks</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：抽取 blocks + JSON Resume XPath 解析 + Nitro LLM + XPath 校验。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>配置（JSON）</div>
              <textarea
                value={resumeConfigText}
                onChange={(e) => setResumeConfigText(e.target.value)}
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
              {parsedResume.ok === false && <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }}>JSON 无效：{parsedResume.error}</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => void runResumeExtract()}
                  disabled={resumeRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: resumeRunning ? "not-allowed" : "pointer" }}>
                  {resumeRunning ? "Running..." : "Extract Blocks"}
                </button>
                <button
                  onClick={() => setResumeConfigText(JSON.stringify(DEFAULT_RESUME_CONFIG, null, 2))}
                  disabled={resumeRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: resumeRunning ? "not-allowed" : "pointer" }}>
                  Reset
                </button>
                <button
                  onClick={() => void parseToJsonResume()}
                  disabled={resumeRunning || !canParse}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: resumeRunning || !canParse ? "not-allowed" : "pointer"
                  }}>
                  Parse to JSON Resume + Download
                </button>
                <button
                  onClick={() => void parseViaNitroLLM()}
                  disabled={resumeRunning || !canLlm}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: resumeRunning || !canLlm ? "not-allowed" : "pointer"
                  }}>
                  Send to Nitro + LLM Parse + Download
                </button>
                <button
                  onClick={() => void validateAndFeedback()}
                  disabled={resumeRunning || !llmOut?.ok}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: resumeRunning || !llmOut?.ok ? "not-allowed" : "pointer"
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
              {resumeError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{resumeError}</div>}
            </div>

            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>结果</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 6px 0" }}>
                <div style={{ fontSize: 12, color: "#333" }}>Extract 结果</div>
                <button
                  onClick={() => void copyJson("Extract 结果", resumeResp, setResumeError)}
                  disabled={!resumeResp}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: !resumeResp ? "not-allowed" : "pointer",
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
                {resumeResp ? JSON.stringify(resumeResp, null, 2) : "（尚未执行）"}
              </pre>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 6px 0" }}>
                <div style={{ fontSize: 12, color: "#333" }}>JSON Resume (XPath)（解析结果）</div>
                <button
                  onClick={() => void copyJson("JSON Resume (XPath)", parsedOut, setResumeError)}
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
                  onClick={() => void copyJson("Nitro LLM（JSON Resume XPath）", llmOut, setResumeError)}
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
                  onClick={() => void copyJson("XPath 验证结果（CDP）", validateOut, setResumeError)}
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
        </section>
      </div>
    </div>
  )
}

