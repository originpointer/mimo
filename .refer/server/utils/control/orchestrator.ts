import { controlBus, type ExecutionCallback } from "./bus"
import { signJws } from "./keys"

export type CdpSendOp = {
  kind: "cdp.send"
  method: string
  params?: Record<string, unknown>
  target?: { type?: "iframe" | "root"; sessionId?: string }
}

export type WaitFixedOp = {
  kind: "wait.fixed"
  durationMs: number
}

export type RunOp = CdpSendOp | WaitFixedOp

export type RunStep = {
  name?: string
  tabId?: number
  ttlMs?: number
  op: RunOp
  dependsOn?: string // Name of step this depends on (for template resolution)
  keepAttached?: boolean // Keep debugger attached after this step (for nodeId/objectId persistence)
}

export type RunPlan = {
  extensionId: string
  replyUrl: string
  defaultTtlMs?: number
  keepAttached?: boolean // Default keepAttached for all steps
  steps: RunStep[]
}

// Helper to get nested value from object using dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// Replace template variables like {{stepName.path.to.value}} with actual values
function resolveTemplates(obj: unknown, results: Map<string, unknown>): unknown {
  if (typeof obj === "string") {
    // Check for template pattern {{stepName.field.path}}
    const match = obj.match(/^\{\{(\w+)\.(.+)\}\}$/)
    if (match) {
      const [, stepName, fieldPath] = match
      const stepResult = results.get(stepName)
      if (stepResult) {
        const value = getNestedValue(stepResult, fieldPath)
        return value
      }
      return obj // Return original if not found
    }
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTemplates(item, results))
  }
  if (obj != null && typeof obj === "object") {
    const resolved: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveTemplates(value, results)
    }
    return resolved
  }
  return obj
}

export type RunResult = {
  ok: boolean
  traceId: string
  startedAt: number
  finishedAt: number
  steps: Array<{
    name?: string
    commandId: string
    traceId: string
    issuedAt: number
    ttlMs: number
    status: "ok" | "error" | "timeout"
    callback?: ExecutionCallback
    error?: { message: string }
  }>
}

/**
 * Stagehand-like 最小编排：
 * - 顺序下发 step（每步一个 commandId）
 * - 等待 callback 后推进下一步
 * - 任一步失败/超时即终止
 * - 支持模板变量 {{stepName.path.to.value}} 从前置步骤结果获取值
 * - 支持 wait.fixed 操作
 */
export async function runPlan(plan: RunPlan): Promise<RunResult> {
  const startedAt = Date.now()
  const traceId = `tr_run_${startedAt}`
  const stepsOut: RunResult["steps"] = []
  const stepResults = new Map<string, unknown>() // Store results by step name

  for (const step of plan.steps) {
    const ttlMs =
      typeof step.ttlMs === "number" && Number.isFinite(step.ttlMs)
        ? Math.max(1_000, step.ttlMs)
        : typeof plan.defaultTtlMs === "number" && Number.isFinite(plan.defaultTtlMs)
          ? Math.max(1_000, plan.defaultTtlMs)
          : 30_000

    // Handle wait.fixed operation
    if (step.op.kind === "wait.fixed") {
      const waitOp = step.op as WaitFixedOp
      await new Promise((resolve) => setTimeout(resolve, waitOp.durationMs))
      stepsOut.push({
        name: step.name,
        commandId: `wait_${Date.now()}`,
        traceId: `tr_wait_${Date.now()}`,
        issuedAt: Date.now(),
        ttlMs: waitOp.durationMs,
        status: "ok",
        callback: { type: "control.callback", commandId: "", traceId: "", at: Date.now(), status: "ok", result: { waited: waitOp.durationMs } }
      })
      if (step.name) {
        stepResults.set(step.name, { waited: waitOp.durationMs })
      }
      continue
    }

    // Resolve template variables in op.params
    const resolvedOp = resolveTemplates(step.op, stepResults) as CdpSendOp

    const { commandId, traceId: stepTraceId, callbackToken } = controlBus.issueIds()
    const issuedAt = Date.now()

    // Determine keepAttached: step-level overrides plan-level
    const keepAttached = step.keepAttached ?? plan.keepAttached ?? false

    const signedPayload = {
      iss: "control-server",
      aud: "browser-extension",
      commandId,
      traceId: stepTraceId,
      issuedAt,
      ttlMs,
      target: { tabId: typeof step.tabId === "number" ? step.tabId : undefined, keepAttached, ...(resolvedOp.target || {}) },
      op: { kind: resolvedOp.kind, method: resolvedOp.method, params: resolvedOp.params },
      reply: { url: plan.replyUrl, callbackToken }
    }

    const { jws } = signJws(signedPayload)

    controlBus.publish(
      {
        type: "control.command",
        commandId,
        traceId: stepTraceId,
        issuedAt,
        ttlMs,
        target: { extensionId: plan.extensionId, tabId: typeof step.tabId === "number" ? step.tabId : undefined },
        jws
      },
      {
        commandId,
        traceId: stepTraceId,
        callbackToken,
        expiresAt: issuedAt + ttlMs,
        meta: {
          method: resolvedOp.method,
          tabId: typeof step.tabId === "number" ? step.tabId : undefined,
          sessionId: resolvedOp.target?.sessionId
        }
      }
    )

    try {
      const cb = await controlBus.waitForCallback(commandId, ttlMs + 5_000)
      if (!cb) {
        stepsOut.push({
          name: step.name,
          commandId,
          traceId: stepTraceId,
          issuedAt,
          ttlMs,
          status: "timeout",
          error: { message: "Callback timeout" }
        })
        return { ok: false, traceId, startedAt, finishedAt: Date.now(), steps: stepsOut }
      }
      stepsOut.push({
        name: step.name,
        commandId,
        traceId: stepTraceId,
        issuedAt,
        ttlMs,
        status: cb.status,
        callback: cb
      })

      // Store result for template resolution in later steps
      if (step.name && cb.status === "ok" && cb.result) {
        // Extract the response from the callback result
        const response = (cb.result as { response?: unknown })?.response
        stepResults.set(step.name, response ?? cb.result)
      }

      if (cb.status !== "ok") {
        return { ok: false, traceId, startedAt, finishedAt: Date.now(), steps: stepsOut }
      }
    } catch (e) {
      stepsOut.push({
        name: step.name,
        commandId,
        traceId: stepTraceId,
        issuedAt,
        ttlMs,
        status: "timeout",
        error: { message: e instanceof Error ? e.message : "Timeout" }
      })
      return { ok: false, traceId, startedAt, finishedAt: Date.now(), steps: stepsOut }
    }
  }

  return { ok: true, traceId, startedAt, finishedAt: Date.now(), steps: stepsOut }
}


