import { eventHandler, getQuery } from "h3"
import { getExtensionIdByName } from "../../../stores/extensionConfigStore"

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const extensionName = String(query?.extensionName || "").trim()
  if (!extensionName) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing extensionName" }
  }

  let latest = null
  try {
    latest = await getExtensionIdByName(extensionName)
  } catch {
    event.node.res.statusCode = 500
    return { ok: false, error: "failed to load extensionId" }
  }
  if (!latest) {
    event.node.res.statusCode = 404
    return { ok: false, error: "extensionId not set" }
  }

  return {
    ok: true,
    extensionId: latest.extensionId,
    extensionName: latest.extensionName,
    updatedAt: latest.updatedAt
  }
})

