import { eventHandler } from "h3"
import { readTaskJsonl, readTaskScreenshotBase64 } from "@/utils/control/auditStore"

export default eventHandler(async (event) => {
  const taskId = String((event.context.params as any)?.taskId ?? "")
  if (!taskId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing taskId" }
  }

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
  for (const it of items) {
    const before = typeof it?.artifacts?.beforeScreenshot === "string" ? it.artifacts.beforeScreenshot : ""
    const after = typeof it?.artifacts?.afterScreenshot === "string" ? it.artifacts.afterScreenshot : ""
    if (before && !screenshots[before]) {
      const b64 = await readTaskScreenshotBase64(taskId, before)
      if (b64) screenshots[before] = b64
    }
    if (after && !screenshots[after]) {
      const b64 = await readTaskScreenshotBase64(taskId, after)
      if (b64) screenshots[after] = b64
    }
  }

  return { ok: true, taskId, count: items.length, items, screenshots }
})


