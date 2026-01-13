import fs from "node:fs/promises"
import path from "node:path"

type AnyJson = any

function parseJsonTolerant(text: string): AnyJson {
  const t = text.trim()
  if (t.startsWith("{") || t.startsWith("[")) return JSON.parse(t)
  const i = t.indexOf("{")
  if (i >= 0) return JSON.parse(t.slice(i))
  throw new Error("Unable to locate JSON object in input")
}

function toXpathSet(obj: AnyJson): Set<string> {
  const items = Array.isArray(obj?.items) ? obj.items : []
  const s = new Set<string>()
  for (const it of items) {
    const xp = typeof it?.xpath === "string" ? it.xpath : ""
    if (xp) s.add(xp)
  }
  return s
}

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`
}

async function main() {
  const stagehandPath =
    process.env.STAGEHAND_XPATH_FILE ||
    path.resolve(process.cwd(), "outputs", "zhipin-xpath.latest.json")
  const plasmoPath =
    process.env.PLASMO_XPATH_FILE ||
    path.resolve(process.cwd(), "..", "plasmo-app", "docs", "xpath.json")

  const [aRaw, bRaw] = await Promise.all([
    fs.readFile(stagehandPath, "utf8"),
    fs.readFile(plasmoPath, "utf8")
  ])

  const stagehandJson = parseJsonTolerant(aRaw)
  const plasmoJson = parseJsonTolerant(bRaw)

  const A = toXpathSet(stagehandJson)
  const B = toXpathSet(plasmoJson)

  const onlyA: string[] = []
  const onlyB: string[] = []
  const both: string[] = []

  for (const x of A) {
    if (B.has(x)) both.push(x)
    else onlyA.push(x)
  }
  for (const x of B) {
    if (!A.has(x)) onlyB.push(x)
  }

  onlyA.sort()
  onlyB.sort()
  both.sort()

  const outDir = path.resolve(process.cwd(), "outputs")
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `compare.plasmo.${nowStamp()}.json`)

  const report = {
    inputs: {
      stagehand: stagehandPath,
      plasmo: plasmoPath
    },
    counts: {
      stagehand: A.size,
      plasmo: B.size,
      intersection: both.length,
      onlyStagehand: onlyA.length,
      onlyPlasmo: onlyB.length
    },
    onlyStagehand: onlyA,
    onlyPlasmo: onlyB,
    intersection: both
  }

  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8")

  console.log(`[compare] stagehand=${A.size} plasmo=${B.size} intersection=${both.length} onlyStagehand=${onlyA.length} onlyPlasmo=${onlyB.length}`)
  console.log(`[compare] wrote: ${path.relative(process.cwd(), outPath)}`)
}

main().catch((e) => {
  console.error(`[compare] failed:`, e)
  process.exitCode = 1
})

