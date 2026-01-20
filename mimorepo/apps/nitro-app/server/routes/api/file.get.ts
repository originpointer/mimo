import { eventHandler, getQuery, setResponseHeader } from "h3"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

import { getUploadsDir } from "../../lib/uploadStore"

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8"
  if (ext === ".txt") return "text/plain; charset=utf-8"
  if (ext === ".json") return "application/json; charset=utf-8"
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
  const relPathInUploads = normalizePathInput(rawPath)

  if (!relPathInUploads || relPathInUploads.includes("..")) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid path" }
  }

  const baseDir = getUploadsDir()
  const absPath = path.resolve(baseDir, relPathInUploads)
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
  // 文本内容通常不希望长缓存；让调用方自行处理
  setResponseHeader(event, "Cache-Control", "no-store")
  return data
})

