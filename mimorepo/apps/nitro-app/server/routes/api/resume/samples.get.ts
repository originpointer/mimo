import { eventHandler } from "h3"
import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import { createSampleStore } from "../../../lib/sampleStore"
import { isPreflight, setCors } from "../../../lib/http"

export default eventHandler(async (event) => {
  setCors(event)
  if (isPreflight(event)) return { ok: true }

  const store = createSampleStore()
  await store.ensure()

  const base = store.baseDir
  const entries = await readdir(base, { withFileTypes: true })
  const sampleDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  const samples = []
  for (const id of sampleDirs.slice(0, 200)) {
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
      samples.push({ sampleId: id, files: fileNames, mtimeMs })
    } catch {
      // ignore invalid dirs
    }
  }

  samples.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return { ok: true, samplesDir: base, samples }
})

