import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import z from "zod"

import type { ToolResult } from "@/lib/tools/types"
import { resolveDirInUploads } from "@/lib/tools/uploadsPath"
import { walkFiles } from "@/lib/tools/walk"

const MAX_LINE_LENGTH = 2000
const DEFAULT_MATCH_LIMIT = 100
const DEFAULT_FILE_LIMIT = 2000
const MAX_FILE_BYTES = 2 * 1024 * 1024

export const GrepFilesInputSchema = z.object({
  pattern: z.string().min(1).describe("JS RegExp pattern（不是 ripgrep 语法）"),
  flags: z.string().optional().describe("JS RegExp flags，例如 i、m"),
  path: z.string().optional().describe("uploads 内相对目录；默认 uploads 根目录"),
  include: z.string().optional().describe("可选 glob（同 globFiles：*, **, ?）"),
  limit: z.number().int().positive().max(2000).optional().describe("最多返回多少条匹配行"),
})

export type GrepFilesInput = z.infer<typeof GrepFilesInputSchema>

function escapeRegex(s: string) {
  return s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
}

function normalizeGlobPattern(pat: string) {
  let p = String(pat || "").trim()
  if (!p) return ""
  if (p.startsWith("/")) p = p.replace(/^\/+/, "")
  if (!p.includes("/") && !p.startsWith("**/")) p = `**/${p}`
  return p
}

function globToRegExp(pat: string): RegExp {
  const parts = normalizeGlobPattern(pat).split("/")
  const reParts = parts.map((seg) => {
    if (seg === "**") return ".*"
    let out = ""
    for (let i = 0; i < seg.length; i++) {
      const ch = seg[i]
      if (ch === "*") out += "[^/]*"
      else if (ch === "?") out += "[^/]"
      else out += escapeRegex(ch)
    }
    return out
  })
  return new RegExp("^" + reParts.join("\\/") + "$")
}

function looksBinary(buf: Buffer) {
  const n = Math.min(buf.length, 4096)
  if (!n) return false
  let nonPrintable = 0
  for (let i = 0; i < n; i++) {
    const b = buf[i]
    if (b === 0) return true
    if (b < 9 || (b > 13 && b < 32)) nonPrintable++
  }
  return nonPrintable / n > 0.3
}

export async function grepFilesInUploads(
  input: GrepFilesInput,
): Promise<ToolResult<{ matches: number; truncated: boolean }>> {
  const { absPath: rootDir, relPathInUploads } = resolveDirInUploads(input.path)
  const limit = input.limit ?? DEFAULT_MATCH_LIMIT

  let re: RegExp
  try {
    re = new RegExp(input.pattern, input.flags)
  } catch (e: any) {
    throw new Error(`invalid regex: ${String(e?.message || e)}`)
  }

  const includeRe = input.include ? globToRegExp(input.include) : null

  const files = await walkFiles(rootDir, {
    limit: DEFAULT_FILE_LIMIT,
    maxDepth: 30,
    ignoreDirNames: new Set([".git", "node_modules"]),
  })

  const matches: Array<{ file: string; rel: string; lineNum: number; lineText: string; mtime: number }> = []
  let truncated = false

  for (const full of files) {
    if (matches.length >= limit) {
      truncated = true
      break
    }
    const relToRoot = path.relative(rootDir, full).split(path.sep).join("/")
    if (!relToRoot || relToRoot.startsWith("..")) continue
    if (includeRe && !includeRe.test(relToRoot)) continue

    const st = await stat(full).catch(() => null)
    if (!st || !st.isFile()) continue
    if (st.size > MAX_FILE_BYTES) continue

    const buf = await readFile(full).catch(() => null)
    if (!buf) continue
    if (looksBinary(buf)) continue

    const text = buf.toString("utf-8")
    const lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= limit) {
        truncated = true
        break
      }
      const line = lines[i]
      re.lastIndex = 0
      if (!re.test(line)) continue
      const lineText = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + "..." : line
      const relInUploads = relPathInUploads ? `${relPathInUploads}/${relToRoot}` : relToRoot
      matches.push({
        file: full,
        rel: relInUploads,
        lineNum: i + 1,
        lineText,
        mtime: st.mtime.getTime(),
      })
    }
  }

  matches.sort((a, b) => b.mtime - a.mtime)

  if (!matches.length) {
    return {
      title: input.pattern,
      output: "No files found",
      metadata: { matches: 0, truncated: false },
    }
  }

  const output: string[] = [`Found ${matches.length} matches`]
  let current = ""
  for (const m of matches) {
    if (m.rel !== current) {
      if (current) output.push("")
      current = m.rel
      output.push(`${m.rel}:`)
    }
    output.push(`  Line ${m.lineNum}: ${m.lineText}`)
  }
  if (truncated) {
    output.push("")
    output.push("(Results are truncated. Consider using a narrower scope or lower match volume.)")
  }

  return {
    title: input.pattern,
    output: output.join("\n"),
    metadata: { matches: matches.length, truncated },
  }
}

