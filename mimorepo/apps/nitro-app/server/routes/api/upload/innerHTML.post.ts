import { randomUUID } from "node:crypto"
import { eventHandler, readBody } from "h3"

import { createUploadStore } from "../../../lib/uploadStore"

const MAX_BYTES = 100 * 1024 * 1024 // 100MB
const DEFAULT_MIME = "text/html"
const ALLOWED_MIME = new Set(["text/html", "text/plain", "application/json"])

function formatDateYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function withHtmlExt(fileName: string) {
  const raw = String(fileName || "").trim()
  if (!raw) return "upload.html"
  if (/\.(html?|txt|json)$/i.test(raw)) return raw
  return `${raw}.html`
}

export default eventHandler(async (event) => {
  // h3 的 readBody 在不同版本类型定义可能不包含 limit，这里用 any 绕过类型限制
  const body = (await (readBody as any)(event, { limit: "100mb" }).catch(() => null)) as any
  let content = typeof body?.content === "string" ? body.content : ""
  const mimeType = String(body?.mimeType || DEFAULT_MIME).trim().toLowerCase()
  const fileNameRaw = typeof body?.fileName === "string" ? body.fileName : ""
  let svgReplacedCount = 0

  if (!content) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing body.content" }
  }
  if (!mimeType) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing mimeType" }
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    event.node.res.statusCode = 400
    return { ok: false, error: `unsupported mimeType: ${mimeType}` }
  }

  // 对 HTML 内容做 SVG 占位符替换（减少体积/避免内联矢量干扰）
  // NOTE: 这是纯字符串替换；若 SVG 出现在脚本字符串中也可能被替换。
  if (mimeType === "text/html") {
    const placeholder = `<svg data-mimo-placeholder="1"></svg>`
    const reSvg = /<svg\b[\s\S]*?<\/svg\s*>/gi
    const reSvgSelfClosing = /<svg\b[^>]*\/\s*>/gi

    const countA = (content.match(reSvg) || []).length
    if (countA) content = content.replace(reSvg, placeholder)

    const countB = (content.match(reSvgSelfClosing) || []).length
    if (countB) content = content.replace(reSvgSelfClosing, placeholder)

    svgReplacedCount = countA + countB
  }

  let base64ReplacedCount = 0
  if (mimeType === "text/html") {
    const placeholder = `<base64>`
    const reBase64DataUrl = /data:([^;,]+);base64,([^"'\s)\]]+)/gi

    const matches = content.matchAll(reBase64DataUrl)
    base64ReplacedCount = [...matches].length
    content = content.replace(reBase64DataUrl, placeholder)
  }

  const bytes = Buffer.from(content, "utf-8")
  if (!bytes.length) {
    event.node.res.statusCode = 400
    return { ok: false, error: "empty content" }
  }
  if (bytes.length > MAX_BYTES) {
    event.node.res.statusCode = 400
    return { ok: false, error: `content too large (max ${MAX_BYTES} bytes)` }
  }

  const store = createUploadStore()
  const date = formatDateYMD(new Date())
  const uploadId = randomUUID()
  const safeFileName = store.sanitizeFileName(withHtmlExt(fileNameRaw || "mimo-xpath-innerhtml.html"), { mimeType })

  const relPathInUploads = `${date}/${uploadId}/${safeFileName}`
  const absPath = await store.writeBytes(relPathInUploads, bytes)
  const relPath = store.toRelPath(absPath)
  const url = `/api/file?path=${encodeURIComponent(relPathInUploads)}`

  return {
    ok: true,
    uploadId,
    fileName: safeFileName,
    mimeType,
    bytes: bytes.length,
    svgReplacedCount,
    base64ReplacedCount,
    relPath,
    url
  }
})

