type Risk = "low" | "medium" | "high"

export type ActionIdentity = {
  taskId: string
  actionId: string
  risk?: Risk
  requiresConfirmation?: boolean
}

type CacheEntry<T> = { value: T; expiresAt: number }

const taskLocks = new Map<string, string>() // taskId -> actionId (in-flight)
const inFlightByActionKey = new Map<string, Promise<any>>() // actionKey -> promise
const successCache = new Map<string, CacheEntry<any>>() // actionKey -> cached response

function actionKey(taskId: string, actionId: string): string {
  return `${taskId}:${actionId}`
}

function now(): number {
  return Date.now()
}

export async function runWithTaskLock<T>(
  id: ActionIdentity,
  fn: () => Promise<T>,
  opts?: { cacheTtlMs?: number }
): Promise<{ ok: true; cached: boolean; value: T } | { ok: false; code: string; message: string }> {
  const key = actionKey(id.taskId, id.actionId)

  const cached = successCache.get(key)
  if (cached && cached.expiresAt > now()) {
    return { ok: true, cached: true, value: cached.value as T }
  }

  const existingInFlight = inFlightByActionKey.get(key)
  if (existingInFlight) {
    const v = await existingInFlight
    return { ok: true, cached: false, value: v as T }
  }

  const lockedBy = taskLocks.get(id.taskId)
  if (lockedBy && lockedBy !== id.actionId) {
    return { ok: false, code: "TASK_LOCKED", message: `Task ${id.taskId} has in-flight action ${lockedBy}` }
  }

  taskLocks.set(id.taskId, id.actionId)
  const p = (async () => {
    try {
      const v = await fn()
      // Only cache success payloads; errors should be retryable (e.g. after confirmation).
      successCache.set(key, { value: v, expiresAt: now() + (opts?.cacheTtlMs ?? 5 * 60 * 1000) })
      return v
    } finally {
      taskLocks.delete(id.taskId)
      inFlightByActionKey.delete(key)
    }
  })()

  inFlightByActionKey.set(key, p)
  try {
    const v = await p
    return { ok: true, cached: false, value: v as T }
  } catch (e) {
    // Don't cache errors; allow retry.
    const code = (e as any)?.code
    return {
      ok: false,
      code: typeof code === "string" && code ? code : "ACTION_FAILED",
      message: e instanceof Error ? e.message : String(e)
    }
  }
}


