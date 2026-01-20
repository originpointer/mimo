import { eventHandler, readBody } from "h3"

import { ReadTextInputSchema, readTextInUploads } from "@/lib/tools/readText"

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as unknown
  const parsed = ReadTextInputSchema.safeParse(body)
  if (!parsed.success) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid input", issues: parsed.error.issues }
  }

  try {
    const result = await readTextInUploads(parsed.data)
    return { ok: true, ...result }
  } catch (e: any) {
    const msg = String(e?.message || e)
    if (msg === "invalid path") {
      event.node.res.statusCode = 400
      return { ok: false, error: msg }
    }
    if (msg === "not found") {
      event.node.res.statusCode = 404
      return { ok: false, error: msg }
    }
    if (msg.includes("binary")) {
      event.node.res.statusCode = 400
      return { ok: false, error: msg }
    }
    event.node.res.statusCode = 500
    return { ok: false, error: msg }
  }
})

