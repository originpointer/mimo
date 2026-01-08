import crypto from "node:crypto"
import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter, type ActionMeta } from "@/utils/control/driverAdapter"
import { runWithTaskLock } from "@/utils/control/taskExecution"
import { writeAuditLine, writeScreenshotFile, type AuditLine } from "@/utils/control/auditStore"
import { evaluateAct2Policy, maxRisk, type Risk } from "@/utils/control/policy"

type Act2Action =
  | "click.selector"
  | "type.selector"
  | "click.iframeSelector"
  | "type.iframeSelector"

type Act2Body = {
  extensionId: string
  tabId: number
  replyUrl?: string
  taskId?: string
  actionId?: string
  risk?: "low" | "medium" | "high"
  requiresConfirmation?: boolean
  reason?: string
  action: Act2Action
  selector?: string
  text?: string
  frameSelector?: string
  timeoutMs?: number
  wait?: "stable" | "domReady" | "none"
  idleMs?: number
}

/**
 * POST /control/act2
 * 确定性“语义 act”最小实现（不依赖 LLM）：
 * - click/type by selector（同文档）
 * - click/type inside same-origin iframe（通过 iframeRect + elRect 推导页面坐标）
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<Act2Body> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }
  if (!body.action) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.action" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`
  const timeoutMs = typeof body.timeoutMs === "number" ? body.timeoutMs : 30000

  const taskId =
    typeof body.taskId === "string" && body.taskId
      ? body.taskId
      : `tsk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
  const actionId =
    typeof body.actionId === "string" && body.actionId
      ? body.actionId
      : `act_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

  // Phase9-B: Server-authoritative policy (request may provide hints, but cannot downgrade below policy)
  const policy = evaluateAct2Policy({
    action: String(body.action),
    selector: typeof body.selector === "string" ? body.selector : undefined,
    frameSelector: typeof body.frameSelector === "string" ? body.frameSelector : undefined,
    text: typeof body.text === "string" ? body.text : undefined
  })

  const reqRisk = typeof body.risk === "string" ? (body.risk as Risk) : undefined
  const reqRequires = typeof body.requiresConfirmation === "boolean" ? body.requiresConfirmation : undefined
  const reqReason = typeof body.reason === "string" ? body.reason : undefined

  const appliedRisk = reqRisk ? maxRisk(reqRisk, policy.risk) : policy.risk
  const appliedRequiresConfirmation = Boolean(reqRequires ?? false) || policy.requiresConfirmation
  const overridden = Boolean(reqRisk && appliedRisk !== reqRisk) || Boolean(reqRequires === false && policy.requiresConfirmation)
  const appliedReason = reqReason ? `${reqReason}（policy: ${policy.reason}）` : policy.reason

  const actionMeta: ActionMeta = {
    taskId,
    actionId,
    risk: appliedRisk,
    requiresConfirmation: appliedRequiresConfirmation,
    reason: appliedReason
  }

  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    defaultTtlMs: timeoutMs,
    keepAttached: true
  })

  try {
    const identity = { taskId, actionId, risk: appliedRisk, requiresConfirmation: appliedRequiresConfirmation }
    const out = await runWithTaskLock(identity, async () => {
      // Optional wait before action
      const waitMode = body.wait ?? "none"
      if (waitMode === "domReady") {
        await driver.waitForDomReady(body.tabId, timeoutMs)
      } else if (waitMode === "stable") {
        await driver.waitForStable(body.tabId, { timeoutMs, idleMs: body.idleMs })
      }

      // Evidence: before screenshot (jpeg, smaller)
      const beforeData = await driver.screenshot({ format: "jpeg", quality: 60 })
      const beforeRef = await writeScreenshotFile({ taskId, actionId, when: "before", format: "jpeg", dataBase64: beforeData })

      let resolved: unknown = null
      let performed: unknown = null

      switch (body.action) {
        case "click.selector": {
          if (typeof body.selector !== "string" || !body.selector) {
            throw createError({ statusCode: 400, statusMessage: "Missing selector for click.selector" })
          }
          const r = await driver.clickSelector(body.selector, { tabId: body.tabId, timeoutMs, action: actionMeta })
          resolved = { nodeId: r.nodeId, x: r.x, y: r.y }
          performed = { clicked: true }
          break
        }
        case "type.selector": {
          if (typeof body.selector !== "string" || !body.selector) {
            throw createError({ statusCode: 400, statusMessage: "Missing selector for type.selector" })
          }
          if (typeof body.text !== "string") {
            throw createError({ statusCode: 400, statusMessage: "Missing text for type.selector" })
          }
          const r = await driver.typeSelector(body.selector, body.text, { tabId: body.tabId, action: actionMeta })
          resolved = { nodeId: r.nodeId, x: r.x, y: r.y }
          performed = { typed: true, text: body.text }
          break
        }
        case "click.iframeSelector": {
          if (typeof body.frameSelector !== "string" || !body.frameSelector) {
            throw createError({ statusCode: 400, statusMessage: "Missing frameSelector for click.iframeSelector" })
          }
          if (typeof body.selector !== "string" || !body.selector) {
            throw createError({ statusCode: 400, statusMessage: "Missing selector for click.iframeSelector" })
          }
          const r = await driver.clickIframeSelector(body.frameSelector, body.selector, { tabId: body.tabId, action: actionMeta })
          resolved = { x: r.x, y: r.y }
          performed = { clicked: true }
          break
        }
        case "type.iframeSelector": {
          if (typeof body.frameSelector !== "string" || !body.frameSelector) {
            throw createError({ statusCode: 400, statusMessage: "Missing frameSelector for type.iframeSelector" })
          }
          if (typeof body.selector !== "string" || !body.selector) {
            throw createError({ statusCode: 400, statusMessage: "Missing selector for type.iframeSelector" })
          }
          if (typeof body.text !== "string") {
            throw createError({ statusCode: 400, statusMessage: "Missing text for type.iframeSelector" })
          }
          const r = await driver.typeIframeSelector(body.frameSelector, body.selector, body.text, { tabId: body.tabId, action: actionMeta })
          resolved = { x: r.x, y: r.y }
          performed = { typed: true, text: body.text }
          break
        }
        default:
          throw createError({ statusCode: 400, statusMessage: `Unknown action: ${String(body.action)}` })
      }

      const afterData = await driver.screenshot({ format: "jpeg", quality: 60 })
      const afterRef = await writeScreenshotFile({ taskId, actionId, when: "after", format: "jpeg", dataBase64: afterData })

      const line: AuditLine = {
        ts: Date.now(),
        taskId,
        actionId,
        kind: "act2",
        status: "ok",
        policy: {
          computedRisk: policy.risk,
          computedRequiresConfirmation: policy.requiresConfirmation,
          appliedRisk,
          appliedRequiresConfirmation,
          reason: policy.reason,
          requestProvided: { risk: reqRisk, requiresConfirmation: reqRequires, reason: reqReason },
          overridden
        },
        action: {
          type: body.action,
          target: { selector: body.selector, frameSelector: body.frameSelector },
          params: body.text ? { text: body.text } : {},
          risk: appliedRisk,
          requiresConfirmation: appliedRequiresConfirmation,
          reason: appliedReason
        },
        artifacts: {
          beforeScreenshot: beforeRef?.relPath,
          afterScreenshot: afterRef?.relPath
        },
        result: { resolved, performed }
      }
      await writeAuditLine(taskId, line)

      return {
        ok: true as const,
        taskId,
        actionId,
        risk: appliedRisk,
        requiresConfirmation: appliedRequiresConfirmation,
        action: body.action,
        resolved,
        performed
      }
    })

    if (!out.ok) {
      event.node.res.statusCode = out.code === "TASK_LOCKED" ? 409 : 500
      return {
        ok: false,
        taskId,
        actionId,
        risk: appliedRisk,
        requiresConfirmation: appliedRequiresConfirmation,
        action: body.action,
        error: { code: out.code, message: out.message }
      }
    }
    return out.value
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const code = (e as any)?.code
    const line: AuditLine = {
      ts: Date.now(),
      taskId,
      actionId,
      kind: "act2",
      status: "error",
      error: { code, message },
      policy: {
        computedRisk: policy.risk,
        computedRequiresConfirmation: policy.requiresConfirmation,
        appliedRisk,
        appliedRequiresConfirmation,
        reason: policy.reason,
        requestProvided: { risk: reqRisk, requiresConfirmation: reqRequires, reason: reqReason },
        overridden
      },
      action: {
        type: String(body?.action ?? "unknown"),
        target: { selector: (body as any)?.selector, frameSelector: (body as any)?.frameSelector },
        params: (body as any)?.text ? { text: (body as any)?.text } : {},
        risk: appliedRisk,
        requiresConfirmation: appliedRequiresConfirmation,
        reason: appliedReason
      }
    }
    await writeAuditLine(taskId, line)
    // Keep same style as /control/act: ok:false payload
    return {
      ok: false,
      taskId,
      actionId,
      risk: appliedRisk,
      requiresConfirmation: appliedRequiresConfirmation,
      action: body.action,
      error: { code, message }
    }
  }
})


