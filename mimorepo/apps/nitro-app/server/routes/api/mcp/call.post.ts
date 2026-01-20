import { eventHandler, readBody } from "h3"
import z from "zod"

const BodySchema = z.object({
  name: z.string().min(1),
  args: z.unknown().optional(),
})

export default eventHandler(async (event) => {
  const mcp = event.context.mcp
  if (!mcp) {
    event.node.res.statusCode = 500
    return { ok: false, error: "mcp context not initialized" }
  }

  const body = (await readBody(event).catch(() => null)) as unknown
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    event.node.res.statusCode = 400
    return { ok: false, error: "invalid input", issues: parsed.error.issues }
  }

  try {
    const result = await mcp.callTool(parsed.data.name, parsed.data.args ?? {})
    return { ok: true, result }
  } catch (e: any) {
    const msg = String(e?.message || e)
    event.node.res.statusCode = 400
    return { ok: false, error: msg }
  }
})

