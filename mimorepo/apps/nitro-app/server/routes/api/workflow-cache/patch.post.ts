import { eventHandler, readBody } from "h3"

import { createSampleStore } from "@/lib/sampleStore"
import { hashWorkflowCacheKey } from "@/lib/workflowCacheKey"
import { patchWorkflowCacheEntry, type WorkflowCacheEntry, type WorkflowCacheKey } from "@/stores/workflowCacheStore"

type Body = {
  extensionId?: string
  key?: WorkflowCacheKey
  patch?: Partial<Pick<WorkflowCacheEntry, "xpaths" | "validation" | "qualityScore" | "updatedAt" | "history">>
}

export default eventHandler(async (event) => {
  const started = Date.now()
  const body = (await readBody(event).catch(() => null)) as Body | null

  const extensionId = String(body?.extensionId || "").trim()
  const key = body?.key
  const patch = body?.patch
  if (!extensionId || !key || !patch) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing extensionId/key/patch" }
  }

  const { cacheId } = hashWorkflowCacheKey(key)
  const updated = await patchWorkflowCacheEntry({ extensionId, cacheId, patch })
  if (!updated) {
    event.node.res.statusCode = 404
    return { ok: false, error: "cache entry not found", cacheId }
  }

  const durationMs = Date.now() - started
  const at = Date.now()
  const store = createSampleStore()
  await store.writeJson(`workflow-cache/${cacheId}/patch-${at}.json`, { key, patch, at })
  await store.appendJsonl("events.jsonl", {
    type: "workflow_cache_patch",
    extensionId,
    cacheId,
    at,
    durationMs
  })

  return { ok: true, cacheId }
})

