import fs from "node:fs/promises"
import path from "node:path"
import readline from "node:readline/promises"

import { Stagehand } from "@browserbasehq/stagehand"
import { chromium } from "playwright"

import { scanXpathsViaCdp, type ScanOptions } from "./cdpXpathScanner.js"

const URL = "https://www.zhipin.com/web/chat/recommend"

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function resolveCdpUrlFromPort(port: number, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let lastErr = ""

  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (resp.ok) {
        const json = (await resp.json()) as { webSocketDebuggerUrl?: string }
        if (json?.webSocketDebuggerUrl) return json.webSocketDebuggerUrl
        lastErr = "missing webSocketDebuggerUrl"
      } else {
        lastErr = `${resp.status} ${resp.statusText}`
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  throw new Error(`Timed out waiting for /json/version on port ${port}${lastErr ? ` (last error: ${lastErr})` : ""}`)
}

async function main() {
  const profileDir = process.env.STAGEHAND_PROFILE_DIR
  const cdpPort = process.env.STAGEHAND_CDP_PORT ? Number(process.env.STAGEHAND_CDP_PORT) : undefined
  const cdpUrlEnv = process.env.STAGEHAND_CDP_URL
  const executablePath = process.env.STAGEHAND_EXECUTABLE_PATH || chromium.executablePath()
  const connectTimeoutMs = process.env.STAGEHAND_CONNECT_TIMEOUT_MS
    ? Math.max(1000, Math.floor(Number(process.env.STAGEHAND_CONNECT_TIMEOUT_MS)))
    : 30_000

  // 两种模式：
  // A) 直接 attach 到你手动启动的 Chrome（更稳定，避免 userDataDir 被占用）
  //    - STAGEHAND_CDP_PORT=9222 （脚本会自动读 /json/version 拿 ws url）
  //    - 或 STAGEHAND_CDP_URL=ws://...
  // B) 由 Stagehand 自动启动 Chrome（需要 userDataDir 不被其它 Chrome 实例占用）
  const userDataDir =
    process.env.STAGEHAND_USER_DATA_DIR || path.resolve(process.cwd(), "outputs", "chrome-user-data")

  const selector =
    process.env.STAGEHAND_SELECTOR?.trim() ||
    "a,button,input,textarea,select,[role='button'],[onclick]"
  const maxItems = Number.isFinite(Number(process.env.STAGEHAND_MAX_ITEMS))
    ? Math.max(1, Math.floor(Number(process.env.STAGEHAND_MAX_ITEMS)))
    : 200
  const includeShadow = process.env.STAGEHAND_INCLUDE_SHADOW === "1"

  const options: ScanOptions = { maxItems, selector, includeShadow }

  const cdpUrl =
    typeof cdpUrlEnv === "string" && cdpUrlEnv.trim()
      ? cdpUrlEnv.trim()
      : typeof cdpPort === "number" && Number.isFinite(cdpPort) && cdpPort > 0
        ? await resolveCdpUrlFromPort(cdpPort, connectTimeoutMs)
        : undefined

  // userDataDir 已有默认值（outputs/chrome-user-data），这里不再强制要求必须传环境变量。
  // 注意：Stagehand/launcher 会在 userDataDir 下写入 chrome-out.log，因此必须确保目录存在。
  if (!cdpUrl) {
    await ensureDir(userDataDir)
  }

  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: false,
      ...(cdpUrl ? { cdpUrl } : {}),
      ...(executablePath ? { executablePath } : {}),
      ...(typeof connectTimeoutMs === "number" && Number.isFinite(connectTimeoutMs) ? { connectTimeoutMs } : {}),
      ...(userDataDir ? { userDataDir } : {}),
      args: profileDir ? [`--profile-directory=${profileDir}`] : []
    }
  })

  await stagehand.init()
  try {
    const page = stagehand.context.pages()[0] as any
    await page.goto(URL, { waitUntil: "domcontentloaded", timeoutMs: 60000 })

    if (process.env.STAGEHAND_NO_PROMPT !== "1" && process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      try {
        await rl.question(
          `请在弹出的浏览器里确认已登录并进入页面后回到终端，按回车继续抓取 XPath...\n`
        )
      } finally {
        rl.close()
      }
    }

    const send = async <T = unknown>(method: string, params?: Record<string, unknown>) => {
      if (typeof page.sendCDP !== "function") {
        throw new Error("Stagehand Page 缺少 sendCDP(method, params)。请确认 @browserbasehq/stagehand 版本与接口。")
      }
      return (await page.sendCDP(method, params)) as T
    }

    const result = await scanXpathsViaCdp(send, URL, options)

    const outDir = path.resolve(process.cwd(), "outputs")
    await ensureDir(outDir)

    const stamp = nowStamp()
    const latestPath = path.join(outDir, "zhipin-xpath.latest.json")
    const tsPath = path.join(outDir, `zhipin-xpath.${stamp}.json`)

    const payload = {
      ...result,
      meta: {
        ...result.meta,
        capturedAt: new Date().toISOString(),
        options
      }
    }

    await fs.writeFile(tsPath, JSON.stringify(payload, null, 2), "utf8")
    await fs.writeFile(latestPath, JSON.stringify(payload, null, 2), "utf8")

    console.log(`[stagehand-app] wrote: ${path.relative(process.cwd(), tsPath)}`)
    console.log(`[stagehand-app] wrote: ${path.relative(process.cwd(), latestPath)}`)
    console.log(`[stagehand-app] items=${result.items.length} framesScanned=${result.meta.framesScanned} durationMs=${result.meta.durationMs}`)
  } finally {
    // best-effort cleanup
    try {
      await stagehand.close()
    } catch {
      // ignore
    }
  }
}

main().catch((e) => {
  console.error(`[stagehand-app] failed:`, e)
  if (e && typeof e === "object" && "code" in e && (e as any).code === "ECONNREFUSED") {
    console.error(
      [
        "",
        "[stagehand-app] 提示：ECONNREFUSED 通常是 Chrome 没能成功启动或立刻退出（常见原因：userDataDir 被正在运行的 Chrome 占用）。",
        "建议改用 attach 模式：先手动启动 Chrome + remote debugging，再设置 STAGEHAND_CDP_PORT=9222 运行脚本。",
      ].join("\n")
    )
  }
  process.exitCode = 1
})

