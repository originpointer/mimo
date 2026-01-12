import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"
import { clearNanobrowserHighlightOverlays } from "@/utils/control/highlight/nanobrowserHighlight"

type ClearBody = {
  extensionId: string
  tabId: number
  replyUrl?: string
  sessionId?: string
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<ClearBody> | null
  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`
  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    keepAttached: true
  })
  driver.setTabId(body.tabId)

  try {
    const res = await clearNanobrowserHighlightOverlays(driver, { tabId: body.tabId, sessionId: body.sessionId })
    return { ok: true, result: { tabId: body.tabId, removed: res.removed } }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: { message } }
  }
})

