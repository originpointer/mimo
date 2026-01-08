import { execFile } from 'node:child_process'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { cpus } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import YAML from 'yaml'

type Manifest = {
  rootDir?: string
  sources: SourceItem[]
}

type SourceItem = {
  name: string
  repo: string
  ref?: string
  shallow?: boolean
  notes?: string
}

type Options = {
  repoRoot: string
  manifestPath: string
  rootDir: string
  only?: Set<string>
  concurrency: number
  force: boolean
}

function parseArgs(argv: string[]): {
  manifest?: string
  root?: string
  only?: string
  concurrency?: number
  force?: boolean
  help?: boolean
} {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue
    if (a === '--help' || a === '-h') out.help = true
    else if (a === '--manifest') out.manifest = argv[++i]
    else if (a === '--root') out.root = argv[++i]
    else if (a === '--only') out.only = argv[++i]
    else if (a === '--concurrency') out.concurrency = Number(argv[++i])
    else if (a === '--force') out.force = true
    else throw new Error(`Unknown arg: ${a}`)
  }
  return out as any
}

function printHelp() {
  // Keep it short; full docs live in sources/README.md
  console.log(`sources-sync

Usage:
  tsx sources/sources-sync.ts [--manifest <path>] [--root <dir>] [--only a,b] [--concurrency N] [--force]

Options:
  --manifest     Path to manifest.yml (default: sources/manifest.yml)
  --root         Override materialization dir (default: manifest rootDir or .sources)
  --only         Comma-separated names to sync
  --concurrency  Parallelism (default: 4)
  --force        Hard reset dirty repos (DANGEROUS)
`)
}

function execGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    execFile('git', args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        const e = new Error(`git ${args.join(' ')} failed in ${cwd}\n${stderr || stdout}`)
        ;(e as any).cause = err
        reject(e)
      } else {
        resolvePromise({ stdout: String(stdout), stderr: String(stderr) })
      }
    })
  })
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function isGitRepo(dir: string): Promise<boolean> {
  // checking `.git` folder exists is good enough for our use case
  return await pathExists(resolve(dir, '.git'))
}

async function isDirty(dir: string): Promise<boolean> {
  const { stdout } = await execGit(['status', '--porcelain'], dir)
  return stdout.trim().length > 0
}

async function ensureCheckoutRef(dir: string, ref: string) {
  // Prefer tags to be available.
  await execGit(['fetch', '--tags', '--prune'], dir)
  await execGit(['checkout', ref], dir)
}

async function cloneRepo(targetDir: string, item: SourceItem) {
  const shallow = item.shallow ?? true
  const args = ['clone', item.repo, targetDir]
  if (shallow) {
    // Let git choose depth=1; for non-default ref we will fetch tags later if needed.
    args.splice(1, 0, '--depth', '1')
  }
  console.log(`[clone] ${item.name} <- ${item.repo}`)
  await execGit(args, process.cwd())
}

async function updateRepo(dir: string) {
  console.log(`[update] ${dir}`)
  await execGit(['fetch', '--prune'], dir)
  // Keep it safe: fast-forward only
  await execGit(['pull', '--ff-only'], dir)
}

async function hardReset(dir: string) {
  console.log(`[force] hard reset ${dir}`)
  await execGit(['reset', '--hard'], dir)
  await execGit(['clean', '-fd'], dir)
}

async function loadManifest(manifestPath: string): Promise<Manifest> {
  const raw = await readFile(manifestPath, 'utf8')
  const parsed = YAML.parse(raw) as Manifest
  if (!parsed || !Array.isArray(parsed.sources)) {
    throw new Error(`Invalid manifest: missing "sources" array in ${manifestPath}`)
  }
  return parsed
}

function createLimiter(concurrency: number) {
  let active = 0
  const queue: Array<() => void> = []

  const runNext = () => {
    if (active >= concurrency) return
    const job = queue.shift()
    if (!job) return
    active++
    job()
  }

  return async <T>(fn: () => Promise<T>): Promise<T> =>
    await new Promise<T>((resolvePromise, reject) => {
      queue.push(() => {
        fn()
          .then(resolvePromise)
          .catch(reject)
          .finally(() => {
            active--
            runNext()
          })
      })
      runNext()
    })
}

async function syncOne(item: SourceItem, opts: Options) {
  if (!item.name || !item.repo) throw new Error(`Invalid source item: ${JSON.stringify(item)}`)
  if (opts.only && !opts.only.has(item.name)) return

  const targetDir = resolve(opts.repoRoot, opts.rootDir, item.name)

  // Ensure root dir exists.
  await mkdir(resolve(opts.repoRoot, opts.rootDir), { recursive: true })

  const exists = await isGitRepo(targetDir)
  if (!exists) {
    await cloneRepo(targetDir, item)
  } else {
    const dirty = await isDirty(targetDir)
    if (dirty) {
      if (!opts.force) {
        console.log(`[skip] ${item.name} has local changes. Re-run with --force to overwrite.`)
        return
      }
      await hardReset(targetDir)
    }
    await updateRepo(targetDir)
  }

  if (item.ref) {
    console.log(`[ref] ${item.name} -> ${item.ref}`)
    await ensureCheckoutRef(targetDir, item.ref)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const repoRoot = process.cwd()
  const manifestPath = resolve(repoRoot, args.manifest ?? 'sources/manifest.yml')
  const manifest = await loadManifest(manifestPath)

  const rootDir = args.root ?? manifest.rootDir ?? '.sources'
  const only = args.only
    ? new Set(
        args.only
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : undefined
  const concurrency =
    typeof args.concurrency === 'number' && Number.isFinite(args.concurrency) && args.concurrency > 0
      ? Math.floor(args.concurrency)
      : 4

  const force = Boolean(args.force)
  const opts: Options = { repoRoot, manifestPath, rootDir, only, concurrency, force }

  // Heuristic default if user sets concurrency too high.
  if (opts.concurrency > cpus().length * 2) opts.concurrency = cpus().length * 2

  const limiter = createLimiter(opts.concurrency)
  const selected = (manifest.sources ?? []).filter((s) => !opts.only || opts.only.has(s.name))
  if (selected.length === 0) {
    console.log(`[done] nothing to sync (check your manifest or --only)`)
    return
  }

  console.log(
    `[start] manifest=${opts.manifestPath} root=${opts.rootDir} items=${selected.length} concurrency=${opts.concurrency} force=${opts.force}`,
  )

  const results = await Promise.allSettled(selected.map((s) => limiter(() => syncOne(s, opts))))

  const failed = results
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.status === 'rejected') as Array<{ r: PromiseRejectedResult; i: number }>

  if (failed.length) {
    console.error(`\n[failed] ${failed.length}/${selected.length}`)
    for (const f of failed) {
      console.error(`- ${selected[f.i]?.name}: ${(f.r.reason as Error)?.message ?? String(f.r.reason)}`)
    }
    process.exitCode = 1
  } else {
    console.log(`\n[done] ${selected.length}/${selected.length} synced`)
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e))
  process.exitCode = 1
})


