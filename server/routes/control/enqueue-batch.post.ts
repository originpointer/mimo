import { eventHandler, readBody } from "h3"
import { controlBus, type ControlCommandEnvelope } from "@/utils/control/bus"
import { signJws } from "@/utils/control/keys"

type BatchItem = {
  method: string
  params?: Record<string, unknown>
  tabId?: number
  ttlMs?: number
}

type EnqueueBatchBody = {
  extensionId: string
  replyUrl: string
  items: BatchItem[]
  ttlMs?: number
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<EnqueueBatchBody> | null
  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.extensionId" }
  }
  if (typeof body.replyUrl !== "string" || !body.replyUrl) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.replyUrl" }
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.items[]" }
  }

  const batchTtl = typeof body.ttlMs === "number" && Number.isFinite(body.ttlMs) ? Math.max(1_000, body.ttlMs) : 30_000
  const issuedAt = Date.now()

  const results: Array<{ ok: true; commandId: string; traceId: string; method: string } | { ok: false; method: string; error: string }> =
    []

  for (const item of body.items) {
    const method = typeof item?.method === "string" ? item.method : ""
    if (!method) {
      results.push({ ok: false, method: String(item?.method ?? ""), error: "Missing item.method" })
      continue
    }

    const ttlMs = typeof item.ttlMs === "number" && Number.isFinite(item.ttlMs) ? Math.max(1_000, item.ttlMs) : batchTtl
    const { commandId, traceId, callbackToken } = controlBus.issueIds()

    const signedPayload = {
      iss: "control-server",
      aud: "browser-extension",
      commandId,
      traceId,
      issuedAt,
      ttlMs,
      target: { tabId: typeof item.tabId === "number" ? item.tabId : undefined },
      op: { kind: "cdp.send", method, params: item.params ?? {} },
      reply: { url: body.replyUrl, callbackToken }
    }

    const { jws } = signJws(signedPayload)

    const envelope: ControlCommandEnvelope = {
      type: "control.command",
      commandId,
      traceId,
      issuedAt,
      ttlMs,
      target: { extensionId: body.extensionId, tabId: typeof item.tabId === "number" ? item.tabId : undefined },
      jws
    }

    controlBus.publish(envelope, { commandId, traceId, callbackToken, expiresAt: issuedAt + ttlMs })
    results.push({ ok: true, commandId, traceId, method })
  }

  return { ok: true, issuedAt, count: results.length, results }
})


