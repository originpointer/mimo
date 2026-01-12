import { readFile, access } from "node:fs/promises"
import { constants as FS_CONSTANTS } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

let cached: string | null = null

async function fileExists(absPath: string): Promise<boolean> {
  try {
    await access(absPath, FS_CONSTANTS.F_OK)
    return true
  } catch {
    return false
  }
}

async function resolveBuildDomTreePath(): Promise<URL> {
  // We intentionally avoid hard-coding a fixed number of "../".
  // Nitro runtime may execute from a build output directory, so we search upward until we find ".sources/...".
  const candidateRel = ".sources/nanobrowser/chrome-extension/public/buildDomTree.js"

  // 1) Search upwards from this module's directory
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i++) {
    const candidate = resolve(dir, candidateRel)
    if (await fileExists(candidate)) return pathToFileURL(candidate)
    const parent = resolve(dir, "..")
    if (parent === dir) break
    dir = parent
  }

  // 2) Fallback to process.cwd() variants (dev servers often run from repo root)
  const cwd = process.cwd()
  const candidates = [
    resolve(cwd, candidateRel),
    resolve(cwd, ".refer", candidateRel)
  ]
  for (const c of candidates) {
    if (await fileExists(c)) return pathToFileURL(c)
  }

  // 3) As a last resort, throw a helpful error
  throw new Error(
    `Cannot locate buildDomTree.js. Tried searching upwards from ${dirname(
      fileURLToPath(import.meta.url)
    )} and also from cwd=${cwd}. Expected relative path: ${candidateRel}`
  )
}

export async function getNanobrowserBuildDomTreeSource(): Promise<string> {
  if (cached) return cached
  const url = await resolveBuildDomTreePath()
  cached = await readFile(url, "utf-8")
  return cached
}

