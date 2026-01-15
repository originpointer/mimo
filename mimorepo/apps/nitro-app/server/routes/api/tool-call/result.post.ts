import { eventHandler, readBody } from "h3"

import { getToolCallWsHub } from "@/lib/toolCallWsHub"
import { setToolCallResult } from "@/stores/toolCallTaskStore"

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as any
  const taskId = String(body?.taskId || "").trim()
  const extensionId = String(body?.extensionId || "").trim()
  const toolType = String(body?.toolType || "").trim()
  const ok = Boolean(body?.ok)
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : undefined
  const base64 = typeof body?.base64 === "string" ? body.base64 : undefined
  const meta = body?.meta
  const error = typeof body?.error === "string" ? body.error : undefined

  if (!taskId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "taskId required" }
  }

  const updated = await setToolCallResult({ taskId, extensionId, ok, dataUrl, base64, meta, error })
  if (!updated) {
    event.node.res.statusCode = 404
    return { ok: false, error: "taskId not found" }
  }

  getToolCallWsHub().broadcast({
    type: "tool-call:result",
    taskId,
    toolType: toolType || updated.toolType,
    ok,
    dataUrl,
    meta,
    error
  })

  return { ok: true, taskId }
})
