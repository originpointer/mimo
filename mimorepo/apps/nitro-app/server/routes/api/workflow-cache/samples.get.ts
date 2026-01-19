import { eventHandler } from "h3"
import { readdir, stat } from "node:fs/promises"
import path from "node:path"

import { createSampleStore } from "@/lib/sampleStore"

/**
 * Debug helper (mirrors `resume/samples.get.ts` style):
 * Lists workflow-cache sample directories under `${SAMPLES_DIR}/workflow-cache/`.
 */
export default eventHandler(async () => {
  const store = createSampleStore()
  await store.ensure()

  const base = path.join(store.baseDir, "workflow-cache")
  try {
    const st = await stat(base)
    if (!st.isDirectory()) return { ok: true, baseDir: base, samples: [] }
  } catch {
    return { ok: true, baseDir: base, samples: [] }
  }

  const entries = await readdir(base, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  const samples: Array<{ cacheId: string; files: string[]; mtimeMs: number }> = []
  for (const id of dirs.slice(0, 200)) {
    const dir = path.join(base, id)
    try {
      const files = await readdir(dir, { withFileTypes: true })
      const fileNames = files.filter((f) => f.isFile()).map((f) => f.name).sort()
      let mtimeMs = 0
      try {
        const st = await stat(dir)
        mtimeMs = st.mtimeMs
      } catch {
        mtimeMs = 0
      }
      samples.push({ cacheId: id, files: fileNames, mtimeMs })
    } catch {
      // ignore
    }
  }

  samples.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return { ok: true, baseDir: base, samples }
})

