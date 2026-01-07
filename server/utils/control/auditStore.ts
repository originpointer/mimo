import fs from "node:fs/promises"
import path from "node:path"

export type AuditRisk = "low" | "medium" | "high"

export type AuditLine = {
  ts: number
  taskId: string
  actionId: string
  kind: "act2"
  status: "ok" | "error"
  error?: { code?: string; message: string }
  page?: { url?: string; title?: string }
  action?: {
    type: string
    target?: { selector?: string; frameSelector?: string }
    params?: Record<string, unknown>
    risk?: AuditRisk
    requiresConfirmation?: boolean
    reason?: string
  }
  artifacts?: {
    beforeScreenshot?: string
    afterScreenshot?: string
  }
  result?: unknown
}

function auditRootDir(): string {
  return path.resolve(process.cwd(), "audit")
}

export function taskDir(taskId: string): string {
  return path.join(auditRootDir(), taskId)
}

export function taskJsonlPath(taskId: string): string {
  return path.join(auditRootDir(), `${taskId}.jsonl`)
}

export function taskScreenshotsDir(taskId: string): string {
  return path.join(taskDir(taskId), "screenshots")
}

export async function ensureAuditDirs(taskId: string): Promise<void> {
  await fs.mkdir(auditRootDir(), { recursive: true })
  await fs.mkdir(taskScreenshotsDir(taskId), { recursive: true })
}

export async function writeAuditLine(taskId: string, line: AuditLine): Promise<void> {
  await ensureAuditDirs(taskId)
  const json = JSON.stringify(redact(line))
  await fs.appendFile(taskJsonlPath(taskId), json + "\n", "utf8")
}

export async function writeScreenshotFile(opts: {
  taskId: string
  actionId: string
  when: "before" | "after"
  format: "png" | "jpeg"
  dataBase64: string
}): Promise<{ absPath: string; relPath: string } | null> {
  if (!opts.dataBase64) return null
  await ensureAuditDirs(opts.taskId)
  const fileName = `${opts.actionId}-${opts.when}.${opts.format === "jpeg" ? "jpg" : "png"}`
  const absPath = path.join(taskScreenshotsDir(opts.taskId), fileName)
  const buf = Buffer.from(opts.dataBase64, "base64")
  await fs.writeFile(absPath, buf)
  const relPath = path.relative(auditRootDir(), absPath)
  return { absPath, relPath }
}

export async function readTaskJsonl(taskId: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(taskJsonlPath(taskId), "utf8")
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function readTaskScreenshotBase64(taskId: string, relPathFromAuditRoot: string): Promise<string | null> {
  try {
    const abs = path.join(auditRootDir(), relPathFromAuditRoot)
    // Ensure path traversal can't escape audit root.
    const root = auditRootDir()
    const resolved = path.resolve(abs)
    if (!resolved.startsWith(root + path.sep)) return null
    const buf = await fs.readFile(resolved)
    return buf.toString("base64")
  } catch {
    return null
  }
}

function redact<T>(obj: T): T {
  // Minimal redaction: remove obvious secrets keys recursively and truncate long strings.
  return redactAny(obj) as T
}

function redactAny(v: unknown): unknown {
  if (typeof v === "string") {
    if (v.length > 2000) return v.slice(0, 2000) + "…(truncated)"
    return v
  }
  if (Array.isArray(v)) return v.map(redactAny)
  if (!v || typeof v !== "object") return v
  const out: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const lk = k.toLowerCase()
    if (lk.includes("password") || lk.includes("cookie") || lk.includes("token") || lk.includes("authorization")) {
      out[k] = "[redacted]"
      continue
    }
    out[k] = redactAny(val)
  }
  return out
}


