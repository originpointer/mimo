import { eventHandler, readBody } from "h3"
import { runPlan, type RunPlan } from "@/utils/control/orchestrator"

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<RunPlan> | null
  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.extensionId" }
  }
  if (typeof body.replyUrl !== "string" || !body.replyUrl) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.replyUrl" }
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing body.steps[]" }
  }

  const plan: RunPlan = {
    extensionId: body.extensionId,
    replyUrl: body.replyUrl,
    defaultTtlMs: typeof body.defaultTtlMs === "number" ? body.defaultTtlMs : undefined,
    steps: body.steps as any
  }

  return await runPlan(plan)
})


