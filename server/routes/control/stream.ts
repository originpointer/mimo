import { eventHandler, getQuery, setHeader } from "h3"
import { controlBus } from "@/utils/control/bus"

export default eventHandler(async (event) => {
  const q = getQuery(event)
  const extensionId = typeof q.extensionId === "string" ? q.extensionId : ""
  if (!extensionId) {
    event.node.res.statusCode = 400
    return { ok: false, error: "Missing query param: extensionId" }
  }

  setHeader(event, "Content-Type", "text/event-stream; charset=utf-8")
  setHeader(event, "Cache-Control", "no-cache, no-transform")
  setHeader(event, "Connection", "keep-alive")

  const res = event.node.res
  res.write(`event: ready\ndata: {}\n\n`)

  const unsubscribe = controlBus.subscribe(extensionId, (cmd) => {
    res.write(`event: command\ndata: ${JSON.stringify(cmd)}\n\n`)
  })

  const keepAlive = setInterval(() => {
    // comment line per SSE spec
    res.write(`:keepalive\n\n`)
  }, 15_000)

  event.node.req.on("close", () => {
    clearInterval(keepAlive)
    unsubscribe()
    try {
      res.end()
    } catch {
      // ignore
    }
  })

  // keep connection open
  return await new Promise<void>(() => {})
})




