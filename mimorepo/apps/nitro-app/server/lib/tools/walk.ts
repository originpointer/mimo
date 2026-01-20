import { readdir, stat } from "node:fs/promises"
import type { Dirent } from "node:fs"
import path from "node:path"

export type WalkFilesOptions = {
  limit: number
  maxDepth?: number
  ignoreDirNames?: Set<string>
}

export async function walkFiles(rootDir: string, opts: WalkFilesOptions): Promise<string[]> {
  const limit = Math.max(0, Math.floor(opts.limit))
  const maxDepth = opts.maxDepth ?? 50
  const ignore = opts.ignoreDirNames ?? new Set<string>()

  if (!limit) return []

  const results: string[] = []
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }]

  while (queue.length && results.length < limit) {
    const { dir, depth } = queue.shift()!
    if (depth > maxDepth) continue

    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const ent of entries) {
      if (results.length >= limit) break
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ignore.has(ent.name)) continue
        queue.push({ dir: full, depth: depth + 1 })
        continue
      }
      if (ent.isFile()) {
        results.push(full)
      } else if (ent.isSymbolicLink()) {
        // 避免跟随 symlink 造成越界/环；只把“指向文件”的 symlink 当文件处理
        try {
          const st = await stat(full)
          if (st.isFile()) results.push(full)
        } catch {
          // ignore
        }
      }
    }
  }

  return results
}

