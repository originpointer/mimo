import { eventHandler, getHeader, readBody } from "h3"
import { controlBus, type ExecutionCallback } from "@/utils/control/bus"

function parseBearer(auth: string | undefined): string {
  if (!auth) return ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : ""
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<ExecutionCallback> | null
  const commandId = typeof body?.commandId === "string" ? body.commandId : ""
  if (!commandId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.commandId" }
  }

  const token = parseBearer(getHeader(event, "authorization"))
  if (!token) {
    event.node.res.statusCode = 401
    return { ok: false, error: "Missing Authorization: Bearer <callbackToken>" }
  }

  const verified = controlBus.verifyCallbackToken(commandId, token)
  if (!verified.ok) {
    event.node.res.statusCode = 403
    return { ok: false, error: verified.error }
  }

  const cb: ExecutionCallback = {
    type: "control.callback",
    commandId,
    traceId: typeof body?.traceId === "string" ? body.traceId : verified.pending.traceId,
    at: typeof body?.at === "number" ? body.at : Date.now(),
    status: body?.status === "error" ? "error" : "ok",
    result: body?.result,
    error: body?.error,
    telemetry: body?.telemetry
  }

  controlBus.markCallback(cb)
  // 为联调/验收提供可观测性（后续可替换为审计落库）
  console.log("[control.callback]", JSON.stringify(cb))
  return { ok: true }
})


