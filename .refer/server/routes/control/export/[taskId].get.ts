import { eventHandler, getQuery } from "h3"
import { readAuditFileBuffer, readTaskJsonl, readTaskScreenshotBase64 } from "@/utils/control/auditStore"
import { createZipStore } from "@/utils/control/zipStore"

export default eventHandler(async (event) => {
  const taskId = String((event.context.params as any)?.taskId ?? "")
  if (!taskId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing taskId" }
  }

  const q = getQuery(event)
  const format = typeof q.format === "string" ? q.format : ""

  const lines = await readTaskJsonl(taskId)
  const items = []
  for (const l of lines) {
    try {
      items.push(JSON.parse(l))
    } catch {
      // ignore malformed lines
    }
  }

  // Embed screenshots as base64 for MVP export.
  const screenshots: Record<string, string> = {}
  const screenshotPaths: string[] = []
  for (const it of items) {
    const before = typeof it?.artifacts?.beforeScreenshot === "string" ? it.artifacts.beforeScreenshot : ""
    const after = typeof it?.artifacts?.afterScreenshot === "string" ? it.artifacts.afterScreenshot : ""
    if (before && !screenshots[before]) {
      screenshotPaths.push(before)
      const b64 = await readTaskScreenshotBase64(taskId, before)
      if (b64) screenshots[before] = b64
    }
    if (after && !screenshots[after]) {
      screenshotPaths.push(after)
      const b64 = await readTaskScreenshotBase64(taskId, after)
      if (b64) screenshots[after] = b64
    }
  }

  // For verification and debugging: keep JSON export via ?format=json
  if (format === "json") {
    return { ok: true, taskId, count: items.length, items, screenshots }
  }

  // Default: export as zip (task.jsonl + screenshots)
  const files: Array<{ path: string; data: Buffer }> = []
  const jsonl = lines.join("\n") + (lines.length ? "\n" : "")
  files.push({ path: "task.jsonl", data: Buffer.from(jsonl, "utf8") })

  for (const rel of screenshotPaths) {
    const buf = await readAuditFileBuffer(rel)
    if (!buf) continue
    // Keep relative path under audit root, but pack under screenshots/
    const name = rel.split("/").slice(-1)[0] || "image.jpg"
    files.push({ path: `screenshots/${name}`, data: buf })
  }

  const zip = createZipStore(files, { mtimeMs: Date.now() })
  event.node.res.setHeader("content-type", "application/zip")
  event.node.res.setHeader("content-disposition", `attachment; filename="${taskId}.zip"`)
  return zip
})


