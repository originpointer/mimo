import { randomUUID } from "node:crypto"
import { eventHandler, readMultipartFormData } from "h3"

import { createUploadStore } from "../../../lib/uploadStore"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"])

function formatDateYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function asString(v: unknown) {
  if (typeof v === "string") return v
  if (v instanceof Uint8Array) return Buffer.from(v).toString("utf-8")
  return String(v ?? "")
}

export default eventHandler(async (event) => {
  const parts = await readMultipartFormData(event).catch(() => null)
  if (!parts || !Array.isArray(parts)) {
    event.node.res.statusCode = 400
    return { ok: false, error: "multipart/form-data required" }
  }

  const filePart = parts.find((p) => p?.name === "file")
  if (!filePart?.data) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing form field: file" }
  }

  const fileBytes = Buffer.isBuffer(filePart.data) ? filePart.data : Buffer.from(filePart.data as Uint8Array)
  if (!fileBytes.length) {
    event.node.res.statusCode = 400
    return { ok: false, error: "empty file" }
  }
  if (fileBytes.length > MAX_BYTES) {
    event.node.res.statusCode = 400
    return { ok: false, error: `file too large (max ${MAX_BYTES} bytes)` }
  }

  const mimeTypeField = asString(parts.find((p) => p?.name === "mimeType")?.data).trim()
  const mimeType = String((filePart as any)?.type || mimeTypeField || "").trim().toLowerCase()
  if (!mimeType) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing mimeType" }
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    event.node.res.statusCode = 400
    return { ok: false, error: `unsupported mimeType: ${mimeType}` }
  }

  const fileNameField = asString(parts.find((p) => p?.name === "fileName")?.data).trim()
  const rawFileName = String((filePart as any)?.filename || fileNameField || "").trim()
  if (!rawFileName) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing fileName" }
  }

  const store = createUploadStore()
  const date = formatDateYMD(new Date())
  const uploadId = randomUUID()
  const safeFileName = store.sanitizeFileName(rawFileName, { mimeType })

  const relPathInUploads = `${date}/${uploadId}/${safeFileName}`
  const absPath = await store.writeBytes(relPathInUploads, fileBytes)
  const relPath = store.toRelPath(absPath)
  const url = `/api/image?path=${encodeURIComponent(relPathInUploads)}`

  return {
    ok: true,
    uploadId,
    fileName: safeFileName,
    mimeType,
    bytes: fileBytes.length,
    relPath,
    url
  }
})

