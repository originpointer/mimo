import { readdir } from "node:fs/promises"
import type { Dirent } from "node:fs"
import path from "node:path"
import z from "zod"

import type { ToolResult } from "@/lib/tools/types"
import { resolveDirInUploads } from "@/lib/tools/uploadsPath"

const LIMIT = 200

export const ListTreeInputSchema = z.object({
  path: z.string().optional().describe("uploads 内相对目录；默认 uploads 根目录"),
  limit: z.number().int().positive().max(2000).optional(),
})

export type ListTreeInput = z.infer<typeof ListTreeInputSchema>

const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".cache",
  ".idea",
  ".vscode",
  "dist",
  "build",
  "tmp",
  "temp",
])

type Node = { kind: "dir"; name: string; children: Map<string, Node> } | { kind: "file"; name: string }

function ensureDir(root: Node, parts: string[]) {
  let cur = root
  for (const p of parts) {
    if (cur.kind !== "dir") break
    let child = cur.children.get(p)
    if (!child) {
      child = { kind: "dir", name: p, children: new Map() }
      cur.children.set(p, child)
    }
    cur = child
  }
}

function addFile(root: Node, parts: string[], fileName: string) {
  ensureDir(root, parts)
  let cur = root
  for (const p of parts) {
    const next = cur.kind === "dir" ? cur.children.get(p) : undefined
    if (!next || next.kind !== "dir") return
    cur = next
  }
  if (cur.kind !== "dir") return
  if (!cur.children.has(fileName)) {
    cur.children.set(fileName, { kind: "file", name: fileName })
  }
}

function renderDir(node: Node, depth: number): string {
  if (node.kind !== "dir") return ""
  const indent = "  ".repeat(depth)
  let out = ""
  if (depth > 0) out += `${indent}${node.name}/\n`

  const entries = Array.from(node.children.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const childIndent = "  ".repeat(depth + 1)
  for (const child of entries) {
    if (child.kind === "dir") out += renderDir(child, depth + 1)
    else out += `${childIndent}${child.name}\n`
  }

  return out
}

export async function listUploadsTree(input: ListTreeInput): Promise<ToolResult<{ count: number; truncated: boolean }>> {
  const { absPath, relPathInUploads } = resolveDirInUploads(input.path)
  const rootDir = absPath
  const title = relPathInUploads ? relPathInUploads : "uploads/"

  const limit = input.limit ?? LIMIT
  const root: Node = { kind: "dir", name: ".", children: new Map() }

  let count = 0
  let truncated = false
  const queue: Array<{ dir: string; relDir: string; depth: number }> = [{ dir: rootDir, relDir: "", depth: 0 }]

  while (queue.length && count < limit) {
    const { dir, relDir, depth } = queue.shift()!
    if (depth > 20) continue

    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const ent of entries) {
      if (count >= limit) break
      if (ent.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(ent.name)) continue
        const nextRel = relDir ? `${relDir}/${ent.name}` : ent.name
        ensureDir(root, nextRel ? nextRel.split("/") : [])
        queue.push({ dir: path.join(dir, ent.name), relDir: nextRel, depth: depth + 1 })
        continue
      }
      if (ent.isFile()) {
        const parts = relDir ? relDir.split("/") : []
        addFile(root, parts, ent.name)
        count++
      }
    }
  }

  if (queue.length || count >= limit) truncated = true
  const output = `${rootDir}/\n` + renderDir(root, 0)

  return {
    title,
    output: truncated ? output + "\n\n(Results are truncated. Use a narrower path or higher limit.)" : output,
    metadata: { count, truncated },
  }
}

