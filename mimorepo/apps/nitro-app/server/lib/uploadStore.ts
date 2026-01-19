import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

export type UploadStore = {
  baseDir: string
  ensure(): Promise<void>
  writeBytes(relPath: string, data: Uint8Array): Promise<string>
  toRelPath(absPath: string): string
  sanitizeFileName(input: string, opts?: { mimeType?: string }): string
}

export type WriteUploadBytesInput = {
  /**
   * 原始文件名（会被 sanitize）；若无扩展名会尝试按 mimeType 补全扩展名。
   */
  fileName: string
  /**
   * 用于补全扩展名与元信息返回；例如 image/png。
   */
  mimeType?: string
  /**
   * 要落盘的二进制内容。
   */
  bytes: Uint8Array
}

export type WriteUploadBytesResult = {
  uploadId: string
  date: string
  fileName: string
  mimeType?: string
  bytes: number
  absPath: string
  relPath: string
}

const DEFAULT_UPLOADS_DIR = ".data/uploads"

export function getUploadsDir(): string {
  const raw = process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR
  return path.resolve(process.cwd(), raw)
}

function formatDateYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function safeJoin(baseDir: string, relPath: string) {
  const p = path.resolve(baseDir, relPath)
  if (!p.startsWith(baseDir)) throw new Error("Invalid path")
  return p
}

function normalizeRel(p: string) {
  return p.split(path.sep).join("/")
}

function extFromMime(mimeType: string | undefined) {
  const mt = String(mimeType || "").toLowerCase()
  if (mt === "image/png") return ".png"
  if (mt === "image/jpeg" || mt === "image/jpg") return ".jpg"
  if (mt === "image/webp") return ".webp"
  if (mt === "image/gif") return ".gif"
  return ""
}

export function sanitizeFileName(input: string, opts?: { mimeType?: string }): string {
  const raw = String(input || "").trim()
  const base = path.basename(raw) || ""
  // 允许常见的安全字符，其他统一替换为下划线
  let name = base.replace(/[^a-zA-Z0-9._-]+/g, "_")
  name = name.replace(/^_+/, "").replace(/_+$/, "")

  if (!name) name = "upload"

  // 限制长度，避免极端长文件名
  if (name.length > 120) {
    const ext = path.extname(name)
    const stem = path.basename(name, ext).slice(0, 120 - ext.length)
    name = `${stem}${ext}`
  }

  // 若没有扩展名，尝试从 mimeType 补一个
  if (!path.extname(name)) {
    const ext = extFromMime(opts?.mimeType)
    if (ext) name = `${name}${ext}`
  }

  return name
}

export function createUploadStore(baseDir = getUploadsDir()): UploadStore {
  const ensure = async () => {
    await mkdir(baseDir, { recursive: true })
  }

  const writeBytes = async (relPath: string, data: Uint8Array) => {
    await ensure()
    const p = safeJoin(baseDir, relPath)
    await mkdir(path.dirname(p), { recursive: true })
    await writeFile(p, data)
    return p
  }

  const toRelPath = (absPath: string) => {
    const rel = path.relative(process.cwd(), absPath)
    return normalizeRel(rel)
  }

  return { baseDir, ensure, writeBytes, toRelPath, sanitizeFileName }
}

/**
 * 高层落盘：自动生成 `.data/uploads/<YYYY-MM-DD>/<uuid>/<safeFileName>`，并返回 relPath。
 */
export async function writeUploadBytes(input: WriteUploadBytesInput, opts?: { baseDir?: string }) {
  const store = createUploadStore(opts?.baseDir)
  const date = formatDateYMD(new Date())
  const uploadId = randomUUID()
  const safeFileName = store.sanitizeFileName(input.fileName, { mimeType: input.mimeType })
  const absPath = await store.writeBytes(`${date}/${uploadId}/${safeFileName}`, input.bytes)
  const relPath = store.toRelPath(absPath)

  const result: WriteUploadBytesResult = {
    uploadId,
    date,
    fileName: safeFileName,
    mimeType: input.mimeType,
    bytes: input.bytes?.byteLength ?? 0,
    absPath,
    relPath
  }
  return result
}

