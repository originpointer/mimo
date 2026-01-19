import { eventHandler, getQuery, setResponseHeader } from "h3"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

import { getUploadsDir } from "../../lib/uploadStore"

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".png") return "image/png"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".webp") return "image/webp"
  if (ext === ".gif") return "image/gif"
  return "application/octet-stream"
}

function normalizePathInput(raw: string) {
  let p = String(raw || "").trim()
  if (!p) return ""
  if (p.includes("\\")) return ""
  p = p.replace(/^\/+/, "")
  if (p.startsWith(".data/uploads/")) p = p.slice(".data/uploads/".length)
  if (p.startsWith("data/uploads/")) p = p.slice("data/uploads/".length)
  if (p.startsWith("uploads/")) p = p.slice("uploads/".length)
  p = p.replace(/^\/+/, "")
  p = p.replace(/\/{2,}/g, "/")
  return p
}

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const rawPath = typeof query.path === "string" ? query.path : ""
  const relPath = normalizePathInput(rawPath)

  if (!relPath || relPath.includes("..")) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid path" }
  }

  const baseDir = getUploadsDir()
  const absPath = path.resolve(baseDir, relPath)
  const base = baseDir.endsWith(path.sep) ? baseDir : `${baseDir}${path.sep}`
  if (!absPath.startsWith(base)) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid path" }
  }

  try {
    const st = await stat(absPath)
    if (!st.isFile()) {
      event.node.res.statusCode = 404
      return { ok: false, error: "not found" }
    }
  } catch {
    event.node.res.statusCode = 404
    return { ok: false, error: "not found" }
  }

  const data = await readFile(absPath)
  setResponseHeader(event, "Content-Type", guessContentType(absPath))
  setResponseHeader(event, "Cache-Control", "public, max-age=31536000, immutable")
  return data
})

