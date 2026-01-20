import path from "node:path"

import { getUploadsDir } from "@/lib/uploadStore"

export type ResolveUploadsPathResult = {
  baseDir: string
  relPathInUploads: string
  absPath: string
}

export function normalizeUploadsPathInput(raw: string) {
  let p = String(raw || "").trim()
  if (!p) return ""
  // Windows 路径/分隔符一律拒绝（避免绕过）
  if (p.includes("\\")) return ""
  p = p.replace(/^\/+/, "")
  if (p.startsWith(".data/uploads/")) p = p.slice(".data/uploads/".length)
  if (p.startsWith("data/uploads/")) p = p.slice("data/uploads/".length)
  if (p.startsWith("uploads/")) p = p.slice("uploads/".length)
  p = p.replace(/^\/+/, "")
  p = p.replace(/\/{2,}/g, "/")
  return p
}

export function resolvePathInUploads(rawPath: string): ResolveUploadsPathResult {
  return resolvePathInUploadsInternal(rawPath, { allowEmpty: false })
}

export function resolveDirInUploads(rawPath: string | undefined): ResolveUploadsPathResult {
  return resolvePathInUploadsInternal(rawPath || "", { allowEmpty: true })
}

function resolvePathInUploadsInternal(
  rawPath: string,
  opts: { allowEmpty: boolean },
): ResolveUploadsPathResult {
  const relPathInUploads = normalizeUploadsPathInput(rawPath)
  if (!opts.allowEmpty) {
    if (!relPathInUploads || relPathInUploads.includes("..")) throw new Error("invalid path")
  } else {
    if (relPathInUploads.includes("..")) throw new Error("invalid path")
  }

  const baseDir = getUploadsDir()
  const absPath = relPathInUploads ? path.resolve(baseDir, relPathInUploads) : baseDir
  const base = baseDir.endsWith(path.sep) ? baseDir : `${baseDir}${path.sep}`
  if (absPath !== baseDir && !absPath.startsWith(base)) {
    throw new Error("invalid path")
  }

  return { baseDir, relPathInUploads, absPath }
}

