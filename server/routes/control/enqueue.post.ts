import { eventHandler, readBody } from "h3"
import { controlBus, type ControlCommandEnvelope } from "@/utils/control/bus"
import { signJws } from "@/utils/control/keys"

type EnqueueBody = {
  extensionId: string
  tabId?: number
  ttlMs?: number
  op: { kind: "cdp.send"; method: string; params?: Record<string, unknown> }
  replyUrl: string
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

  const signedPayload = {
    iss: "control-server",
    aud: "browser-extension",
    commandId,
    traceId,
    issuedAt,
    ttlMs,
    target: { tabId: typeof body.tabId === "number" ? body.tabId : undefined },
    op: body.op,
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

  controlBus.publish(envelope, { commandId, traceId, callbackToken, expiresAt: issuedAt + ttlMs })

  return { ok: true, commandId, traceId, issuedAt, ttlMs }
})


