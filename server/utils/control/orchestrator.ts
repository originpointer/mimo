import { controlBus, type ExecutionCallback } from "./bus"
import { signJws } from "./keys"

export type CdpSendOp = {
  kind: "cdp.send"
  method: string
  params?: Record<string, unknown>
}

export type RunStep = {
  name?: string
  tabId?: number
  ttlMs?: number
  op: CdpSendOp
}

export type RunPlan = {
  extensionId: string
  replyUrl: string
  defaultTtlMs?: number
  steps: RunStep[]
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
 */
export async function runPlan(plan: RunPlan): Promise<RunResult> {
  const startedAt = Date.now()
  const traceId = `tr_run_${startedAt}`
  const stepsOut: RunResult["steps"] = []

  for (const step of plan.steps) {
    const ttlMs =
      typeof step.ttlMs === "number" && Number.isFinite(step.ttlMs)
        ? Math.max(1_000, step.ttlMs)
        : typeof plan.defaultTtlMs === "number" && Number.isFinite(plan.defaultTtlMs)
          ? Math.max(1_000, plan.defaultTtlMs)
          : 30_000

    const { commandId, traceId: stepTraceId, callbackToken } = controlBus.issueIds()
    const issuedAt = Date.now()

    const signedPayload = {
      iss: "control-server",
      aud: "browser-extension",
      commandId,
      traceId: stepTraceId,
      issuedAt,
      ttlMs,
      target: { tabId: typeof step.tabId === "number" ? step.tabId : undefined },
      op: step.op,
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
      { commandId, traceId: stepTraceId, callbackToken, expiresAt: issuedAt + ttlMs }
    )

    try {
      const cb = await controlBus.waitForCallback(commandId, ttlMs + 5_000)
      stepsOut.push({
        name: step.name,
        commandId,
        traceId: stepTraceId,
        issuedAt,
        ttlMs,
        status: cb.status,
        callback: cb
      })
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


