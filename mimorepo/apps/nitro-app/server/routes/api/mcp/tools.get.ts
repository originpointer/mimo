import { eventHandler } from "h3"

export default eventHandler((event) => {
  const mcp = event.context.mcp
  if (!mcp) {
    event.node.res.statusCode = 500
    return { ok: false, error: "mcp context not initialized" }
  }
  return { ok: true, tools: mcp.listTools() }
})

