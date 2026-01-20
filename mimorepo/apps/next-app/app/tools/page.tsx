"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { sendToExtension } from "@/lib/extension-bridge"
import { getNitroBaseUrl } from "@/lib/nitro-config"
import { parseBlocksToJsonResumeXpath, type JsonResumeXpathParseResult } from "@/lib/resumeJsonResumeXpath"
import {
  JSON_COMMON_XPATH_FIND,
  RESUME_BLOCKS_EXTRACT,
  RESUME_XPATH_VALIDATE,
  STAGEHAND_VIEWPORT_SCREENSHOT,
  STAGEHAND_XPATH_SCAN,
  XPATH_GET_HTML,
  XPATH_MARK_ELEMENTS,
  type JsonCommonXpathFindOptions,
  type JsonCommonXpathFindPayload,
  type JsonCommonXpathFindResponse,
  type ResumeBlocksExtractOptions,
  type ResumeBlocksExtractPayload,
  type ResumeBlocksExtractResponse,
  type ResumeXpathValidatePayload,
  type ResumeXpathValidateResponse,
  type StagehandViewportScreenshotPayload,
  type StagehandViewportScreenshotResponse,
  type StagehandXPathScanOptions,
  type StagehandXPathScanPayload,
  type StagehandXPathScanResponse,
  type XPathGetHtmlPayload,
  type XPathGetHtmlResponse,
  type XPathMarkElementsPayload,
  type XPathMarkElementsResponse
} from "@/types/plasmo"
import ExtensionTabSelector from "./_components/ExtensionTabSelector"
import { isScannableUrl, useExtensionTabsStore } from "./_stores/extensionTabsStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ExtractOptions = Partial<ResumeBlocksExtractOptions>
type ScanOptions = Partial<StagehandXPathScanOptions>

type ToolCallRequestResponse =
  | {
      ok: true
      taskId: string
      instruction: {
        type: typeof STAGEHAND_VIEWPORT_SCREENSHOT
        payload: StagehandViewportScreenshotPayload
      }
    }
  | { ok: false; error: string }

type ToolCallResultMessage = {
  type: "tool-call:result"
  taskId: string
  toolType: "viewportScreenshot"
  ok: boolean
  dataUrl?: string
  imageUrl?: string
  meta?: StagehandViewportScreenshotResponse extends { ok: true; meta?: infer M } ? M : never
  error?: string
}

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

const DEFAULT_JSON_COMMON_XPATH_OPTIONS: Required<JsonCommonXpathFindOptions> = {
  maxHitsPerKey: 20,
  maxElementsScanned: 12_000,
  caseSensitive: false,
  includeShadow: false
}

const DEFAULT_JSON_COMMON_XPATH_KV: Record<string, string> = {
  name: "John",
  email: "@gmail.com"
}

const DEFAULT_XPATH_MARK_TEXT = `//a
//button
//input`

const DEFAULT_XPATH_GET_HTML_TEXT = `//body`
const DEFAULT_XPATH_GET_HTML_MAXCHARS = 200_000

type NitroUploadTextResponse =
  | { ok: true; uploadId: string; fileName: string; mimeType: string; bytes: number; relPath: string; url: string }
  | { ok: false; error: string }

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

function toHtmlUploadFilename(tabId: number | "active", url?: string) {
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
  return `mimo-innerhtml-${safeHost}-${tabId}-${stamp}.html`
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

function downloadUrl(filename: string, url: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.click()
}

function resolveDownloadUrl(baseUrl: string, input: string) {
  const trimmed = String(input || "").trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  try {
    const base = baseUrl ? baseUrl.replace(/\/+$/, "") + "/" : ""
    return new URL(trimmed.replace(/^\/+/, ""), base || window.location.origin + "/").toString()
  } catch {
    return trimmed
  }
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

function parseXpathList(input: string): { ok: true; xpaths: string[] } | { ok: false; error: string } {
  const raw = String(input || "").trim()
  if (!raw) return { ok: true, xpaths: [] }

  // JSON array: ["//a", "..."]
  if (raw.startsWith("[")) {
    const parsed = safeJsonParse<unknown>(raw)
    if (parsed.ok === false) return { ok: false, error: `JSON 解析失败：${parsed.error}` }
    if (!Array.isArray(parsed.value)) return { ok: false, error: "JSON 必须是数组（string[]）" }
    const xpaths = (parsed.value as any[])
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v)
      .slice(0, 1500)
    return { ok: true, xpaths }
  }

  // Multiline (one xpath per line); allow comment lines
  const xpaths = raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("// "))
    .slice(0, 1500)
  return { ok: true, xpaths }
}

export default function ToolsPage() {
  const extensionId = useExtensionTabsStore((s) => s.extensionId)
  const extensionName = useExtensionTabsStore((s) => s.extensionName)
  const extensionList = useExtensionTabsStore((s) => s.extensionList)
  const extensionError = useExtensionTabsStore((s) => s.extensionError)
  const tabs = useExtensionTabsStore((s) => s.tabs)
  const targetTabId = useExtensionTabsStore((s) => s.targetTabId)
  const tabsError = useExtensionTabsStore((s) => s.tabsError)
  const refreshTabs = useExtensionTabsStore((s) => s.refreshTabs)
  const selectExtension = useExtensionTabsStore((s) => s.selectExtension)
  const setTargetTabId = useExtensionTabsStore((s) => s.setTargetTabId)
  const initExtensionTabs = useExtensionTabsStore((s) => s.initExtensionTabs)

  const [xpathConfigText, setXpathConfigText] = useState(() => JSON.stringify(DEFAULT_XPATH_CONFIG, null, 2))
  const [xpathRunning, setXpathRunning] = useState(false)
  const [xpathError, setXpathError] = useState<string | null>(null)
  const [xpathResp, setXpathResp] = useState<StagehandXPathScanResponse | null>(null)

  const [jsonCommonKvText, setJsonCommonKvText] = useState(() => JSON.stringify(DEFAULT_JSON_COMMON_XPATH_KV, null, 2))
  const [jsonCommonOptionsText, setJsonCommonOptionsText] = useState(() => JSON.stringify(DEFAULT_JSON_COMMON_XPATH_OPTIONS, null, 2))
  const [jsonCommonRunning, setJsonCommonRunning] = useState(false)
  const [jsonCommonError, setJsonCommonError] = useState<string | null>(null)
  const [jsonCommonResp, setJsonCommonResp] = useState<JsonCommonXpathFindResponse | null>(null)

  const [markText, setMarkText] = useState(() => DEFAULT_XPATH_MARK_TEXT)
  const [markRunning, setMarkRunning] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)
  const [markResp, setMarkResp] = useState<XPathMarkElementsResponse | null>(null)

  const [htmlXpathText, setHtmlXpathText] = useState(() => DEFAULT_XPATH_GET_HTML_TEXT)
  const [htmlMaxCharsText, setHtmlMaxCharsText] = useState(() => String(DEFAULT_XPATH_GET_HTML_MAXCHARS))
  const [htmlRunning, setHtmlRunning] = useState(false)
  const [htmlError, setHtmlError] = useState<string | null>(null)
  const [htmlResp, setHtmlResp] = useState<XPathGetHtmlResponse | null>(null)
  const [htmlUploadRunning, setHtmlUploadRunning] = useState(false)
  const [htmlUploadError, setHtmlUploadError] = useState<string | null>(null)
  const [htmlUploadResp, setHtmlUploadResp] = useState<any>(null)

  const [shotRunning, setShotRunning] = useState(false)
  const [shotError, setShotError] = useState<string | null>(null)
  const [shotTaskId, setShotTaskId] = useState<string | null>(null)
  const [shotResult, setShotResult] = useState<ToolCallResultMessage | null>(null)

  const [resumeConfigText, setResumeConfigText] = useState(() => JSON.stringify(DEFAULT_RESUME_CONFIG, null, 2))
  const [resumeRunning, setResumeRunning] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeResp, setResumeResp] = useState<ResumeBlocksExtractResponse | null>(null)
  const [parsedOut, setParsedOut] = useState<JsonResumeXpathParseResult | null>(null)
  const [nitroBaseUrl, setNitroBaseUrl] = useState(() => getNitroBaseUrl())
  const [llmOut, setLlmOut] = useState<any>(null)
  const [llmSampleId, setLlmSampleId] = useState<string | null>(null)
  const [validateOut, setValidateOut] = useState<ResumeXpathValidateResponse | null>(null)
  const shotTaskIdRef = useRef<string | null>(null)

  type ParsedResumeConfig = ReturnType<typeof safeJsonParse<Partial<ResumeBlocksExtractOptions>>>
  const parsedResume = useMemo<ParsedResumeConfig>(() => safeJsonParse<Partial<ResumeBlocksExtractOptions>>(resumeConfigText), [resumeConfigText])
  type ParsedXpathConfig = ReturnType<typeof safeJsonParse<Partial<StagehandXPathScanOptions>>>
  const parsedXpath = useMemo<ParsedXpathConfig>(() => safeJsonParse<Partial<StagehandXPathScanOptions>>(xpathConfigText), [xpathConfigText])

  type ParsedJsonCommonKv = ReturnType<typeof safeJsonParse<Record<string, string>>>
  const parsedJsonCommonKv = useMemo<ParsedJsonCommonKv>(() => safeJsonParse<Record<string, string>>(jsonCommonKvText), [jsonCommonKvText])
  type ParsedJsonCommonOptions = ReturnType<typeof safeJsonParse<Partial<JsonCommonXpathFindOptions>>>
  const parsedJsonCommonOptions = useMemo<ParsedJsonCommonOptions>(
    () => safeJsonParse<Partial<JsonCommonXpathFindOptions>>(jsonCommonOptionsText),
    [jsonCommonOptionsText]
  )

  useEffect(() => {
    void initExtensionTabs()
  }, [initExtensionTabs])

  useEffect(() => {
    shotTaskIdRef.current = shotTaskId
  }, [shotTaskId])

  useEffect(() => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return
    const baseUrl = nitroBaseUrl.replace(/\/+$/, "")
    if (!baseUrl) return
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/api/tool-call/ws"
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      if (!event?.data) return
      let payload: ToolCallResultMessage | null = null
      try {
        payload = JSON.parse(String(event.data)) as ToolCallResultMessage
      } catch {
        return
      }
      if (!payload || payload.type !== "tool-call:result" || payload.toolType !== "viewportScreenshot") {
        return
      }
      if (shotTaskIdRef.current && payload.taskId !== shotTaskIdRef.current) return
      setShotResult(payload)
      setShotRunning(false)
      if (!payload.ok) {
        setShotError(payload.error || "截图失败")
      }
    }

    ws.onerror = () => {
      // ignore ws errors; request path may not be ready yet
    }

    return () => {
      ws.close()
    }
  }, [nitroBaseUrl])

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

  const copyText = async (label: string, text: string, setError: (v: string | null) => void) => {
    setError(null)
    const value = String(text ?? "")
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return
      }
    } catch {
      // ignore, fallback below
    }

    try {
      if (typeof document === "undefined") throw new Error("document 不可用")
      const el = document.createElement("textarea")
      el.value = value
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

  const runJsonCommonXpath = async () => {
    setJsonCommonError(null)
    setJsonCommonResp(null)
    if (!ensureExtensionId(setJsonCommonError)) return

    if (parsedJsonCommonKv.ok === false) {
      setJsonCommonError(`KV JSON 解析失败：${parsedJsonCommonKv.error}`)
      return
    }
    if (parsedJsonCommonOptions.ok === false) {
      setJsonCommonError(`Options JSON 解析失败：${parsedJsonCommonOptions.error}`)
      return
    }

    const rawKv = parsedJsonCommonKv.value as any
    if (!rawKv || typeof rawKv !== "object" || Array.isArray(rawKv)) {
      setJsonCommonError("KV 必须是对象（Record<string,string>）")
      return
    }
    const kv: Record<string, string> = {}
    for (const k of Object.keys(rawKv)) {
      const v = rawKv[k]
      if (typeof v !== "string") continue
      const key = String(k).trim()
      const val = v.trim()
      if (!key || !val) continue
      kv[key] = val
    }
    if (!Object.keys(kv).length) {
      setJsonCommonError("KV 为空：请提供至少一个 { key: value }")
      return
    }

    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setJsonCommonError(`目标 Tab 不可扫描（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }

    const payload: JsonCommonXpathFindPayload = {
      kv,
      options: parsedJsonCommonOptions.value || {},
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    setJsonCommonRunning(true)
    try {
      const out = await sendToExtension<JsonCommonXpathFindResponse>(
        {
          type: JSON_COMMON_XPATH_FIND,
          payload
        },
        extensionId
      )
      if (!out) {
        setJsonCommonError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setJsonCommonResp(out)
      if (out.ok === false) setJsonCommonError(out.error)
    } catch (e) {
      setJsonCommonError(e instanceof Error ? e.message : String(e))
    } finally {
      setJsonCommonRunning(false)
    }
  }

  const runXpathMark = async (mode: "mark" | "clear") => {
    setMarkError(null)
    setMarkResp(null)
    if (!ensureExtensionId(setMarkError)) return

    const parsed = parseXpathList(markText)
    if (parsed.ok === false) {
      setMarkError(parsed.error)
      return
    }

    if (mode !== "clear" && parsed.xpaths.length === 0) {
      setMarkError("请输入至少一个 XPath（每行一个，或 JSON 数组）")
      return
    }

    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setMarkError(`目标 Tab 不可扫描（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }

    const payload: XPathMarkElementsPayload = {
      xpaths: mode === "clear" ? [] : parsed.xpaths,
      mode,
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    setMarkRunning(true)
    try {
      const out = await sendToExtension<XPathMarkElementsResponse>(
        {
          type: XPATH_MARK_ELEMENTS,
          payload
        },
        extensionId
      )
      if (!out) {
        setMarkError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setMarkResp(out)
      if (out.ok === false) setMarkError(out.error)
    } catch (e) {
      setMarkError(e instanceof Error ? e.message : String(e))
    } finally {
      setMarkRunning(false)
    }
  }

  const runXpathGetHtml = async () => {
    setHtmlError(null)
    setHtmlResp(null)
    setHtmlUploadError(null)
    setHtmlUploadResp(null)
    if (!ensureExtensionId(setHtmlError)) return

    const xpath = String(htmlXpathText || "").trim()
    if (!xpath) {
      setHtmlError("请输入 XPath")
      return
    }

    const selectedTab = typeof targetTabId === "number" ? tabs.find((x) => x.id === targetTabId) : tabs.find((x) => x.active)
    const selectedUrl = selectedTab?.url

    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setHtmlError(`目标 Tab 不可扫描（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }

    const rawMaxChars = Number(String(htmlMaxCharsText || "").trim())
    const maxChars = Number.isFinite(rawMaxChars) && rawMaxChars > 0 ? Math.floor(rawMaxChars) : undefined
    const payload: XPathGetHtmlPayload = {
      xpath,
      ...(typeof maxChars === "number" ? { maxChars } : {}),
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }

    setHtmlRunning(true)
    setHtmlUploadRunning(true)
    try {
      const out = await sendToExtension<XPathGetHtmlResponse>(
        {
          type: XPATH_GET_HTML,
          payload
        },
        extensionId
      )
      if (!out) {
        setHtmlError("未收到响应（可能扩展未就绪或权限不足）")
        return
      }
      setHtmlResp(out)
      if (out.ok === false) {
        setHtmlError(out.error)
        return
      }
      if (!out.matched) {
        setHtmlError("（未命中任何元素，未上传）")
        return
      }

      const html = out.html || ""
      if (!html) {
        setHtmlError("（innerHTML 为空，未上传）")
        return
      }

      const uploadUrl = `${nitroBaseUrl.replace(/\/+$/, "")}/api/upload/innerHTML`
      const fileName = toHtmlUploadFilename(targetTabId, selectedUrl)
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: html,
          fileName,
          mimeType: "text/html",
          meta: {
            xpath,
            targetTabId,
            pageUrl: selectedUrl
          }
        })
      })
      const json = (await res.json().catch(() => null)) as NitroUploadTextResponse | null
      if (!res.ok || !json || !json.ok) {
        const message = json && "error" in json ? json.error : `Nitro upload failed: HTTP ${res.status}`
        setHtmlUploadError(message)
        return
      }
      setHtmlUploadResp(json)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // 区分：获取失败 vs 上传失败
      if (String(msg).toLowerCase().includes("nitro") || String(msg).includes("/api/upload/")) {
        setHtmlUploadError(msg)
      } else {
        setHtmlError(msg)
      }
    } finally {
      setHtmlRunning(false)
      setHtmlUploadRunning(false)
    }
  }

  const runScreenshot = async () => {
    setShotError(null)
    setShotResult(null)
    setShotTaskId(null)
    if (!ensureExtensionId(setShotError)) return
    if (typeof targetTabId === "number") {
      const t = tabs.find((x) => x.id === targetTabId)
      if (t && !isScannableUrl(t.url)) {
        setShotError(`目标 Tab 不可截图（URL=${t.url || "unknown"}）。请换一个 http/https 页面。`)
        return
      }
    }
    const requestBody = {
      extensionId,
      toolType: "viewportScreenshot",
      ...(typeof targetTabId === "number" ? { targetTabId } : {})
    }
    setShotRunning(true)
    try {
      const url = `${nitroBaseUrl.replace(/\/+$/, "")}/api/tool-call/request`
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      })
      const json = (await res.json().catch(() => null)) as ToolCallRequestResponse | null
      if (!res.ok || !json || !json.ok) {
        const message = json && "error" in json ? json.error : `Nitro request failed: HTTP ${res.status}`
        setShotError(message)
        setShotRunning(false)
        return
      }
      setShotTaskId(json.taskId)
      await sendToExtension<unknown>(json.instruction, extensionId)
    } catch (e) {
      setShotError(e instanceof Error ? e.message : String(e))
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

  const dataUrl = useMemo(() => (shotResult?.ok ? shotResult.dataUrl : null), [shotResult])
  const downloadUrlFromApi = useMemo(() => {
    if (!shotResult?.ok || !shotResult.imageUrl) return null
    return resolveDownloadUrl(nitroBaseUrl, shotResult.imageUrl)
  }, [shotResult, nitroBaseUrl])
  const previewUrl = downloadUrlFromApi || dataUrl
  const previewHint = shotRunning ? "上传中/等待中" : "（尚未截图）"
  const shotResultForDisplay = useMemo(() => {
    if (!shotResult) return null
    if (!("dataUrl" in shotResult)) return shotResult
    const { dataUrl: _dataUrl, ...rest } = shotResult as ToolCallResultMessage
    return rest
  }, [shotResult])

  return (
    <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h1 style={{ margin: "0 0 12px 0" }}>Tools</h1>

      <div className="mb-4">
        <CardTitle className="mb-2">扩展与目标 Tab</CardTitle>
        <ExtensionTabSelector
          extensionError={extensionError}
          tabsError={tabsError}
          extensionName={extensionName}
          extensionList={extensionList}
          selectExtension={selectExtension}
          targetTabId={targetTabId}
          setTargetTabId={setTargetTabId}
          tabs={tabs}
          isBusy={xpathRunning || jsonCommonRunning || markRunning || shotRunning || resumeRunning}
          refreshTabs={refreshTabs}
          isScannableUrl={isScannableUrl}
        />
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
          <h2 style={{ margin: "0 0 8px 0" }}>JSON Common Ancestor XPath</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：输入 <code>{`{ key: value }`}</code>，在目标页面查找所有 value 的 contains 命中，并计算所有 key 可覆盖到的最小共同父容器 XPath。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>KV（JSON）</div>
              <textarea
                value={jsonCommonKvText}
                onChange={(e) => setJsonCommonKvText(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: 160,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              {parsedJsonCommonKv.ok === false && (
                <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }}>JSON 无效：{parsedJsonCommonKv.error}</div>
              )}

              <div style={{ fontSize: 12, color: "#333", margin: "10px 0 6px 0" }}>Options（JSON）</div>
              <textarea
                value={jsonCommonOptionsText}
                onChange={(e) => setJsonCommonOptionsText(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: 140,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              {parsedJsonCommonOptions.ok === false && (
                <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }}>JSON 无效：{parsedJsonCommonOptions.error}</div>
              )}

              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => void runJsonCommonXpath()}
                  disabled={jsonCommonRunning}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: jsonCommonRunning ? "not-allowed" : "pointer"
                  }}
                >
                  {jsonCommonRunning ? "Running..." : "Find + Common Ancestor"}
                </button>
                <button
                  onClick={() => {
                    setJsonCommonKvText(JSON.stringify(DEFAULT_JSON_COMMON_XPATH_KV, null, 2))
                    setJsonCommonOptionsText(JSON.stringify(DEFAULT_JSON_COMMON_XPATH_OPTIONS, null, 2))
                  }}
                  disabled={jsonCommonRunning}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: jsonCommonRunning ? "not-allowed" : "pointer"
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={() => void copyJson("JSON Common Ancestor XPath 结果", jsonCommonResp, setJsonCommonError)}
                  disabled={!jsonCommonResp}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: !jsonCommonResp ? "not-allowed" : "pointer"
                  }}
                >
                  Copy Result
                </button>
              </div>
              {jsonCommonError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{jsonCommonError}</div>}
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
                }}
              >
                {jsonCommonResp ? JSON.stringify(jsonCommonResp, null, 2) : "（尚未执行）"}
              </pre>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px 0" }}>XPath 元素标记（Mark / Clear）</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：输入一组 XPath（每行一个，或 JSON 数组），发送给扩展后在目标页面把所有命中元素进行 outline 标记；可一键清除。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>XPaths</div>
              <textarea
                value={markText}
                onChange={(e) => setMarkText(e.target.value)}
                spellCheck={false}
                placeholder={`//a\n//button\n//div[@id='x']\n\n或 JSON：["//a","//button"]`}
                style={{
                  width: "100%",
                  minHeight: 160,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => void runXpathMark("mark")}
                  disabled={markRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: markRunning ? "not-allowed" : "pointer" }}
                >
                  {markRunning ? "Running..." : "Mark Elements"}
                </button>
                <button
                  onClick={() => void runXpathMark("clear")}
                  disabled={markRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: markRunning ? "not-allowed" : "pointer" }}
                >
                  {markRunning ? "Running..." : "Clear Marks"}
                </button>
                <button
                  onClick={() => setMarkText(DEFAULT_XPATH_MARK_TEXT)}
                  disabled={markRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: markRunning ? "not-allowed" : "pointer" }}
                >
                  Reset
                </button>
                <button
                  onClick={() => void copyJson("XPath 标记结果", markResp, setMarkError)}
                  disabled={!markResp}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: !markResp ? "not-allowed" : "pointer"
                  }}
                >
                  Copy Result
                </button>
              </div>
              {markError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{markError}</div>}
            </div>

            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>结果</div>
              <pre
                style={{
                  margin: 0,
                  minHeight: 160,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                  overflow: "auto",
                  fontSize: 12
                }}
              >
                {markResp ? JSON.stringify(markResp, null, 2) : "（尚未执行）"}
              </pre>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: "0 0 8px 0" }}>XPath 获取 innerHTML</h2>
          <div style={{ marginBottom: 8, color: "#555", fontSize: 12 }}>
            说明：输入 XPath，点击按钮后通过扩展获取 <code>innerHTML</code>，并立即上传到 Nitro（落盘为 .html 文件）。
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 520px", minWidth: 320 }}>
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>XPath</div>
              <textarea
                value={htmlXpathText}
                onChange={(e) => setHtmlXpathText(e.target.value)}
                spellCheck={false}
                placeholder={`//body\n//div[@id='x']`}
                style={{
                  width: "100%",
                  minHeight: 120,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />

              <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#333" }}>maxChars</div>
                  <input
                    value={htmlMaxCharsText}
                    onChange={(e) => setHtmlMaxCharsText(e.target.value)}
                    placeholder={String(DEFAULT_XPATH_GET_HTML_MAXCHARS)}
                    style={{
                      width: 140,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12
                    }}
                  />
                </div>

                <button
                  onClick={() => void runXpathGetHtml()}
                  disabled={htmlRunning || htmlUploadRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: htmlRunning ? "not-allowed" : "pointer" }}
                >
                  {htmlRunning || htmlUploadRunning ? "Running..." : "Get + Upload"}
                </button>
                <button
                  onClick={() => {
                    setHtmlXpathText(DEFAULT_XPATH_GET_HTML_TEXT)
                    setHtmlMaxCharsText(String(DEFAULT_XPATH_GET_HTML_MAXCHARS))
                    setHtmlUploadError(null)
                    setHtmlUploadResp(null)
                  }}
                  disabled={htmlRunning || htmlUploadRunning}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: htmlRunning ? "not-allowed" : "pointer" }}
                >
                  Reset
                </button>
                <button
                  onClick={() =>
                    void copyText(
                      "Nitro File URL",
                      htmlUploadResp && htmlUploadResp.ok ? resolveDownloadUrl(nitroBaseUrl, htmlUploadResp.url) : "",
                      setHtmlUploadError
                    )
                  }
                  disabled={!htmlUploadResp || htmlUploadResp.ok === false}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    cursor: !htmlUploadResp || htmlUploadResp.ok === false ? "not-allowed" : "pointer"
                  }}
                >
                  Copy URL
                </button>
              </div>

              {htmlError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{htmlError}</div>}
              {htmlUploadError && <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{htmlUploadError}</div>}
            </div>

            <div className="flex-1 min-w-[320px] min-w-0">
              <div style={{ fontSize: 12, color: "#333", marginBottom: 6 }}>结果</div>
              <div className="min-h-[180px] max-h-[60vh] rounded-md border bg-muted/40 p-2 overflow-auto">
                <pre className="m-0 text-xs font-mono whitespace-pre break-normal">
                  {htmlUploadResp
                    ? htmlUploadResp.ok
                      ? JSON.stringify(
                          {
                            ...htmlUploadResp,
                            fullUrl: resolveDownloadUrl(nitroBaseUrl, htmlUploadResp.url)
                          },
                          null,
                          2
                        )
                      : JSON.stringify(htmlUploadResp, null, 2)
                    : htmlRunning || htmlUploadRunning
                      ? "Running..."
                      : "（尚未执行）"}
                </pre>
              </div>
              {htmlResp && htmlResp.ok && htmlResp.matched && htmlResp.meta?.truncated && (
                <div style={{ marginTop: 8, color: "#555", fontSize: 12 }}>提示：innerHTML 已截断（meta.truncated=true），上传的是截断后的内容</div>
              )}
            </div>
          </div>
        </section>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Viewport Screenshot</CardTitle>
            <p className="text-sm text-muted-foreground">说明：通过扩展后台对目标 Tab 当前可视 viewport 截图。</p>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[280px]">
                <div className="flex gap-2 items-center">
                  <Button onClick={() => void runScreenshot()} disabled={shotRunning}>
                    {shotRunning ? "Capturing..." : "Capture Viewport"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (downloadUrlFromApi) {
                        downloadUrl(toFilename(targetTabId), downloadUrlFromApi)
                      } else if (dataUrl) {
                        downloadDataUrl(toFilename(targetTabId), dataUrl)
                      }
                    }}
                    disabled={!downloadUrlFromApi && !dataUrl}
                    variant="outline"
                  >
                    Download PNG
                  </Button>
                </div>
                {shotTaskId && <p className="mt-2 text-xs text-muted-foreground">TaskId: {shotTaskId}</p>}
                {shotError && <p className="mt-2 text-sm text-destructive">{shotError}</p>}
              </div>
              <div className="flex-[1.5] min-w-[320px] min-w-0">
                <div className="text-xs text-muted-foreground mb-2">预览</div>
                <div className="min-h-[180px] max-h-[60vh] rounded-md border bg-muted/40 p-2 overflow-auto">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="viewport screenshot"
                      className="max-w-full h-auto max-h-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">{previewHint}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-3 mb-2">响应（调试）</div>
                <pre className="m-0 min-h-[120px] rounded-md border bg-muted/40 p-2 overflow-auto text-xs whitespace-pre-wrap break-words">
                  {shotResultForDisplay ? JSON.stringify(shotResultForDisplay, null, 2) : "（尚未执行）"}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

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

