import { eventHandler, readBody } from "h3"

import { getToolCallWsHub } from "@/lib/toolCallWsHub"
import { writeUploadBytes } from "@/lib/uploadStore"
import { setToolCallResult } from "@/stores/toolCallTaskStore"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const UPLOADS_PREFIXES = [".data/uploads/", "data/uploads/", "uploads/"]

function parseDataUrl(dataUrl: string) {
  const raw = String(dataUrl || "").trim()
  const m = raw.match(/^data:([^;]+);base64,(.*)$/i)
  if (!m) return null
  return { mimeType: String(m[1] || "").trim().toLowerCase(), base64: String(m[2] || "") }
}

function toUploadsRelPath(relPath: string) {
  let normalized = String(relPath || "").replace(/\\/g, "/")
  for (const prefix of UPLOADS_PREFIXES) {
    if (normalized.startsWith(prefix)) return normalized.slice(prefix.length)
  }
  const idx = normalized.indexOf("/.data/uploads/")
  if (idx >= 0) return normalized.slice(idx + "/.data/uploads/".length)
  return normalized.replace(/^\/+/, "")
}

function mergeMeta(meta: unknown, patch: Record<string, unknown>) {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) return { ...(meta as any), ...patch }
  return { ...patch }
}

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as any
  const taskId = String(body?.taskId || "").trim()
  const extensionId = String(body?.extensionId || "").trim()
  const toolType = String(body?.toolType || "").trim()
  const ok = Boolean(body?.ok)
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : undefined
  const base64 = typeof body?.base64 === "string" ? body.base64 : undefined
  const meta = body?.meta
  const error = typeof body?.error === "string" ? body.error : undefined

  if (!taskId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "taskId required" }
  }

  let nextMeta = meta
  let imageUrl: string | undefined
  // 内部“调用 upload”：将截图二进制落盘到 .data/uploads/...
  if (ok) {
    try {
      let mimeType = "image/png"
      let b64 = base64 || ""

      if (typeof dataUrl === "string" && dataUrl.trim()) {
        const parsed = parseDataUrl(dataUrl)
        if (parsed?.base64) {
          mimeType = parsed.mimeType || mimeType
          b64 = parsed.base64
        }
      }

      b64 = String(b64 || "").trim()
      if (b64) {
        const buf = Buffer.from(b64, "base64")
        if (buf.length && buf.length <= MAX_BYTES) {
          const fileName = `tool-call-${taskId}.png`
          const saved = await writeUploadBytes({ fileName, mimeType, bytes: buf })
          const relPathInUploads = toUploadsRelPath(saved.relPath)
          imageUrl = `/api/image?path=${encodeURIComponent(relPathInUploads)}`
          nextMeta = mergeMeta(nextMeta, {
            upload: {
              relPath: saved.relPath,
              bytes: saved.bytes,
              mimeType: saved.mimeType,
              uploadId: saved.uploadId,
              url: imageUrl
            }
          })
        } else if (buf.length > MAX_BYTES) {
          nextMeta = mergeMeta(nextMeta, { upload: { error: `file too large (max ${MAX_BYTES} bytes)` } })
        }
      }
    } catch (e) {
      nextMeta = mergeMeta(nextMeta, { upload: { error: e instanceof Error ? e.message : String(e) } })
    }
  }

  const updated = await setToolCallResult({ taskId, extensionId, ok, dataUrl, base64, meta: nextMeta, error })
  if (!updated) {
    event.node.res.statusCode = 404
    return { ok: false, error: "taskId not found" }
  }

  getToolCallWsHub().broadcast({
    type: "tool-call:result",
    taskId,
    toolType: toolType || updated.toolType,
    ok,
    dataUrl,
    imageUrl,
    meta: nextMeta,
    error
  } as any)

  return { ok: true, taskId, imageUrl }
})
