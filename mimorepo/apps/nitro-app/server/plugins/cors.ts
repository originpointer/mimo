import { setHeader } from "h3"
import { defineNitroPlugin } from "nitropack/runtime"

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    // dev 简化：允许所有来源（后续可按扩展 id / 具体 origin 收敛）
    setHeader(event, "access-control-allow-origin", "*")
    setHeader(event, "access-control-allow-methods", "GET,POST,OPTIONS")
    setHeader(event, "access-control-allow-headers", "content-type,authorization")
    setHeader(event, "access-control-max-age", "86400")

    const method = String(event?.node?.req?.method || "").toUpperCase()
    if (method === "OPTIONS") {
      event.node.res.statusCode = 204
      event.node.res.end()
    }
  })
})
