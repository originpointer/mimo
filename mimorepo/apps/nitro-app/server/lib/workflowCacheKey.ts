import { createHash } from "node:crypto"

/**
 * Stable stringify (sort object keys) to make hashing deterministic.
 * Avoids relying on JS insertion order when composing cache keys.
 */
function stableStringify(value: unknown): string {
  if (value == null) return "null"
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    const props = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    return `{${props.join(",")}}`
  }
  // functions/symbols are not expected; stringify best-effort
  return JSON.stringify(String(value))
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export function hashWorkflowCacheKey(key: unknown, opts?: { prefix?: string; shortLen?: number }) {
  const prefix = typeof opts?.prefix === "string" ? opts.prefix : "workflow-cache"
  const shortLen = typeof opts?.shortLen === "number" && opts.shortLen > 0 ? Math.floor(opts.shortLen) : 24

  const canonical = stableStringify(key)
  const full = sha256Hex(`${prefix}:${canonical}`)
  const cacheId = full.slice(0, Math.min(shortLen, full.length))

  return { cacheId, canonical, fullHash: full }
}

