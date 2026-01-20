import { stat } from "node:fs/promises"
import path from "node:path"
import z from "zod"

import type { ToolResult } from "@/lib/tools/types"
import { resolveDirInUploads } from "@/lib/tools/uploadsPath"
import { walkFiles } from "@/lib/tools/walk"

const DEFAULT_LIMIT = 200

export const GlobFilesInputSchema = z.object({
  pattern: z.string().min(1).describe("glob 模式（支持 *, **, ?；不支持复杂 brace/class）"),
  path: z.string().optional().describe("uploads 内相对目录；默认 uploads 根目录"),
  limit: z.number().int().positive().max(5000).optional(),
})

export type GlobFilesInput = z.infer<typeof GlobFilesInputSchema>

function normalizeGlobPattern(pat: string) {
  let p = String(pat || "").trim()
  if (!p) return ""
  if (p.startsWith("/")) p = p.replace(/^\/+/, "")
  // 对齐 Cursor/rg 常用语义：未显式包含目录时，默认在任意子目录匹配
  if (!p.includes("/") && !p.startsWith("**/")) {
    p = `**/${p}`
  }
  return p
}

function escapeRegex(s: string) {
  return s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
}

function globToRegExp(pat: string): RegExp {
  // 仅实现 *, **, ? 三种；其他当字面量
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

export async function globFilesInUploads(
  input: GlobFilesInput,
): Promise<ToolResult<{ count: number; truncated: boolean }>> {
  const { absPath: rootDir, relPathInUploads } = resolveDirInUploads(input.path)
  const limit = input.limit ?? DEFAULT_LIMIT

  const pattern = normalizeGlobPattern(input.pattern)
  if (!pattern) throw new Error("pattern required")
  const re = globToRegExp(pattern)

  const files = await walkFiles(rootDir, {
    limit: Math.max(limit * 10, 1000), // 先多走一些，后面再筛
    maxDepth: 30,
    ignoreDirNames: new Set([".git", "node_modules"]),
  })

  const matched: Array<{ rel: string; mtime: number }> = []
  for (const full of files) {
    const relToRoot = path.relative(rootDir, full).split(path.sep).join("/")
    if (!relToRoot || relToRoot.startsWith("..")) continue
    if (!re.test(relToRoot)) continue
    const mtime = await stat(full)
      .then((s) => s.mtime.getTime())
      .catch(() => 0)
    const relInUploads = relPathInUploads ? `${relPathInUploads}/${relToRoot}` : relToRoot
    matched.push({ rel: relInUploads, mtime })
  }

  matched.sort((a, b) => b.mtime - a.mtime)
  const truncated = matched.length > limit
  const final = truncated ? matched.slice(0, limit) : matched

  const outputLines: string[] = []
  if (!final.length) outputLines.push("No files found")
  else outputLines.push(...final.map((x) => x.rel))
  if (truncated) {
    outputLines.push("")
    outputLines.push("(Results are truncated. Consider using a narrower path or pattern.)")
  }

  return {
    title: relPathInUploads ? `${relPathInUploads} :: ${pattern}` : pattern,
    output: outputLines.join("\n"),
    metadata: { count: final.length, truncated },
  }
}

