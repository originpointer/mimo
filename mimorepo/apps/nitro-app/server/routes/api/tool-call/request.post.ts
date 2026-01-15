import { eventHandler, readBody } from "h3"

import { createToolCallTask } from "@/stores/toolCallTaskStore"

const TOOL_VIEWPORT_SCREENSHOT = "viewportScreenshot" as const

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as any
  const extensionId = String(body?.extensionId || "").trim()
  const toolType = body?.toolType
  const targetTabId = typeof body?.targetTabId === "number" ? body.targetTabId : undefined

  if (!extensionId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "extensionId required" }
  }

  if (toolType !== TOOL_VIEWPORT_SCREENSHOT) {
    event.node.res.statusCode = 400
    return { ok: false, error: "unsupported toolType" }
  }

  const task = await createToolCallTask({ extensionId, toolType, targetTabId })

  return {
    ok: true,
    taskId: task.taskId,
    instruction: {
      type: "STAGEHAND_VIEWPORT_SCREENSHOT",
      payload: {
        taskId: task.taskId,
        ...(typeof targetTabId === "number" ? { targetTabId } : {})
      }
    }
  }
})
