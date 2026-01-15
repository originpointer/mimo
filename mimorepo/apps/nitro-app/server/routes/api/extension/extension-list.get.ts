import { eventHandler } from "h3"
import { listExtensions } from "@/stores/extensionConfigStore"

export default eventHandler(async (event) => {
  let items = []
  try {
    items = await listExtensions()
  } catch {
    event.node.res.statusCode = 500
    return { ok: false, error: "failed to load extension list" }
  }

  const deduped = new Map<string, { extensionName: string; extensionId: string; updatedAt: number }>()
  for (const item of items) {
    const current = deduped.get(item.extensionId)
    if (!current || item.extensionName.localeCompare(current.extensionName) < 0) {
      deduped.set(item.extensionId, {
        extensionName: item.extensionName,
        extensionId: item.extensionId,
        updatedAt: item.updatedAt
      })
    }
  }

  const extensions = Array.from(deduped.values()).sort((a, b) => a.extensionName.localeCompare(b.extensionName))

  const latest = extensions.reduce<null | { extensionName: string; extensionId: string; updatedAt: number }>(
    (acc, item) => {
      if (!acc || item.updatedAt > acc.updatedAt) return item
      return acc
    },
    null
  )

  return {
    ok: true,
    extensions,
    latest
  }
})
