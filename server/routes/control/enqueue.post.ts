import { eventHandler, readBody } from "h3"
import { controlBus, type ControlCommandEnvelope } from "@/utils/control/bus"
import { signJws } from "@/utils/control/keys"

type EnqueueBody = {
  extensionId: string
  tabId?: number
  sessionId?: string // 子 session ID（用于 iframe/OOPIF 命令）
  ttlMs?: number
  op: { kind: "cdp.send"; method: string; params?: Record<string, unknown>; sessionId?: string; keepAttached?: boolean }
  replyUrl: string
  options?: { keepAttached?: boolean }
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<EnqueueBody> | null
  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.extensionId" }
  }
  if (!body.op || body.op.kind !== "cdp.send" || typeof body.op.method !== "string" || !body.op.method) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.op (cdp.send)" }
  }
  if (typeof body.replyUrl !== "string" || !body.replyUrl) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.replyUrl" }
  }

  const ttlMs = typeof body.ttlMs === "number" && Number.isFinite(body.ttlMs) ? Math.max(1_000, body.ttlMs) : 30_000
  const { commandId, traceId, callbackToken } = controlBus.issueIds()
  const issuedAt = Date.now()

  // 合并 sessionId 到 op（如果在 body 顶层指定）
  const opWithSession = {
    ...body.op,
    sessionId: body.op.sessionId || body.sessionId || undefined,
    keepAttached: body.op.keepAttached || body.options?.keepAttached || undefined
  }

  const signedPayload = {
    iss: "control-server",
    aud: "browser-extension",
    commandId,
    traceId,
    issuedAt,
    ttlMs,
    target: {
      tabId: typeof body.tabId === "number" ? body.tabId : undefined,
      sessionId: opWithSession.sessionId
    },
    op: opWithSession,
    options: { keepAttached: opWithSession.keepAttached },
    reply: { url: body.replyUrl, callbackToken }
  }

  const { jws } = signJws(signedPayload)

  const envelope: ControlCommandEnvelope = {
    type: "control.command",
    commandId,
    traceId,
    issuedAt,
    ttlMs,
    target: { extensionId: body.extensionId, tabId: typeof body.tabId === "number" ? body.tabId : undefined },
    jws
  }

  controlBus.publish(envelope, {
    commandId,
    traceId,
    callbackToken,
    expiresAt: issuedAt + ttlMs,
    meta: {
      method: opWithSession.method,
      tabId: typeof body.tabId === "number" ? body.tabId : undefined,
      sessionId: opWithSession.sessionId
    }
  })

  return { ok: true, commandId, traceId, issuedAt, ttlMs }
})


