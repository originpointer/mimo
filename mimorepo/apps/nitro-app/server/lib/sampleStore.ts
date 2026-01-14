import { mkdir, writeFile, appendFile, stat } from "node:fs/promises"
import path from "node:path"

export type SampleStore = {
  baseDir: string
  ensure(): Promise<void>
  writeJson(relPath: string, data: unknown): Promise<string>
  appendJsonl(relPath: string, data: unknown): Promise<string>
}

export function getSamplesDir(): string {
  const raw = process.env.SAMPLES_DIR || ".data/samples"
  return path.resolve(process.cwd(), raw)
}

export function createSampleStore(baseDir = getSamplesDir()): SampleStore {
  const ensure = async () => {
    await mkdir(baseDir, { recursive: true })
  }

  const safeJoin = (relPath: string) => {
    const p = path.resolve(baseDir, relPath)
    if (!p.startsWith(baseDir)) throw new Error("Invalid path")
    return p
  }

  const writeJson = async (relPath: string, data: unknown) => {
    await ensure()
    const p = safeJoin(relPath)
    await mkdir(path.dirname(p), { recursive: true })
    await writeFile(p, JSON.stringify(data, null, 2), "utf-8")
    return p
  }

  const appendJsonl = async (relPath: string, data: unknown) => {
    await ensure()
    const p = safeJoin(relPath)
    await mkdir(path.dirname(p), { recursive: true })
    const line = JSON.stringify(data) + "\n"
    await appendFile(p, line, "utf-8")
    return p
  }

  return { baseDir, ensure, writeJson, appendJsonl }
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p)
    return s.isFile()
  } catch {
    return false
  }
}

