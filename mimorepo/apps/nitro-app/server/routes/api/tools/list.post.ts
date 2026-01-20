import { eventHandler, readBody } from "h3"

import { ListTreeInputSchema, listUploadsTree } from "@/lib/tools/listTree"

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as unknown
  const parsed = ListTreeInputSchema.safeParse(body)
  if (!parsed.success) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid input", issues: parsed.error.issues }
  }

  try {
    const result = await listUploadsTree(parsed.data)
    return { ok: true, ...result }
  } catch (e: any) {
    const msg = String(e?.message || e)
    if (msg === "invalid path") {
      event.node.res.statusCode = 400
      return { ok: false, error: msg }
    }
    event.node.res.statusCode = 500
    return { ok: false, error: msg }
  }
})

