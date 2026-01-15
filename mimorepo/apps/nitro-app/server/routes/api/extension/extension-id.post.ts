import { eventHandler, readBody } from "h3"
import { setExtensionId } from "@/stores/extensionConfigStore"

type Body = {
  extensionId?: string
  extensionName?: string
}

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as Body | null
  const extensionId = String(body?.extensionId || "").trim()
  const extensionName = String(body?.extensionName || "").trim()
  if (!extensionId || !extensionName) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing extensionId/extensionName" }
  }

  try {
    await setExtensionId(extensionName, extensionId)
  } catch {
    event.node.res.statusCode = 500
    return { ok: false, error: "failed to persist extensionId" }
  }

  return { ok: true, extensionId, extensionName }
})

