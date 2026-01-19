import { eventHandler, readBody } from "h3"

import { createSampleStore } from "@/lib/sampleStore"
import { hashWorkflowCacheKey } from "@/lib/workflowCacheKey"
import { putWorkflowCacheEntry, type WorkflowCacheEntry } from "@/stores/workflowCacheStore"

type Body = {
  extensionId?: string
  entry?: WorkflowCacheEntry
}

export default eventHandler(async (event) => {
  const started = Date.now()
  const body = (await readBody(event).catch(() => null)) as Body | null

  const extensionId = String(body?.extensionId || "").trim()
  const entry = body?.entry
  if (!extensionId || !entry?.key) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing extensionId/entry" }
  }

  const { cacheId } = hashWorkflowCacheKey(entry.key)
  const now = Date.now()
  const normalized: WorkflowCacheEntry = {
    ...entry,
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : now,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : now,
    history: Array.isArray(entry.history) ? entry.history : []
  }

  await putWorkflowCacheEntry({ extensionId, cacheId, entry: normalized })

  const durationMs = Date.now() - started
  const at = Date.now()
  const store = createSampleStore()

  // debug samples (optional but useful for offline evaluation)
  await store.writeJson(`workflow-cache/${cacheId}/key.json`, normalized.key)
  await store.writeJson(`workflow-cache/${cacheId}/entry.json`, normalized)
  await store.appendJsonl("events.jsonl", {
    type: "workflow_cache_put",
    extensionId,
    cacheId,
    at,
    durationMs
  })

  return { ok: true, cacheId }
})

