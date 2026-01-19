import { eventHandler, readBody } from "h3"

import { createSampleStore } from "@/lib/sampleStore"
import { hashWorkflowCacheKey } from "@/lib/workflowCacheKey"
import { getWorkflowCacheEntry, type WorkflowCacheKey } from "@/stores/workflowCacheStore"

type Body = {
  extensionId?: string
  key?: WorkflowCacheKey
}

export default eventHandler(async (event) => {
  const started = Date.now()
  const body = (await readBody(event).catch(() => null)) as Body | null

  const extensionId = String(body?.extensionId || "").trim()
  const key = body?.key
  if (!extensionId || !key) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing extensionId/key" }
  }

  const { cacheId } = hashWorkflowCacheKey(key)
  const entry = await getWorkflowCacheEntry({ extensionId, cacheId })

  const durationMs = Date.now() - started
  const at = Date.now()
  const store = createSampleStore()
  await store.appendJsonl("events.jsonl", {
    type: "workflow_cache_get",
    extensionId,
    cacheId,
    hit: Boolean(entry),
    at,
    durationMs
  })

  return { ok: true, hit: Boolean(entry), cacheId, ...(entry ? { entry } : {}) }
})

