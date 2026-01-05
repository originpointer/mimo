import { verifyJwsEs256 } from "./jwks.js"

const DEFAULT_JWKS_URL = "http://localhost:3000/.well-known/jwks.json"

function isLocalhostOrigin(origin) {
  try {
    const u = new URL(origin)
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    )
  } catch {
    return false
  }
}

function toErrorPayload(e) {
  if (e instanceof Error) return { message: e.message, name: e.name }
  return { message: typeof e === "string" ? e : "Unknown error" }
}

function originFromUrl(url) {
  try {
    const u = new URL(url)
    return u.origin
  } catch {
    return ""
  }
}

async function cdpSend(tabId, method, params) {
  const debuggee = { tabId }
  await chrome.debugger.attach(debuggee, "1.3")
  try {
    const result = await chrome.debugger.sendCommand(debuggee, method, params)
    return result
  } finally {
    try {
      await chrome.debugger.detach(debuggee)
    } catch {
      // ignore
    }
  }
}

async function postCallback(url, token, body) {
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab || typeof tab.id !== "number") throw new Error("No active tab found")
  return tab.id
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const req = message || {}
  if (!req || req.type !== "driver" || req.action !== "invoke") return

  void (async () => {
    try {
      const senderOrigin = originFromUrl(sender?.url || "")
      if (!senderOrigin) throw new Error("Missing sender origin")
      if (!isLocalhostOrigin(senderOrigin)) {
        throw new Error(`Sender origin not allowed: ${senderOrigin}`)
      }

      const jwksUrl = DEFAULT_JWKS_URL
      const { payload } = await verifyJwsEs256({ jws: req.jws, jwksUrl })

      const commandId = payload.commandId || req.commandId
      const traceId = payload.traceId || req.traceId
      let tabId = Number(payload?.target?.tabId ?? req?.target?.tabId)
      if (!Number.isFinite(tabId)) {
        tabId = await getActiveTabId()
      }

      const op = payload.op
      if (!op || op.kind !== "cdp.send" || typeof op.method !== "string") throw new Error("Unsupported op")

      // Respond to WebApp early (accepted) to avoid hanging external channel.
      sendResponse({ ok: true, requestId: req.requestId, commandId, traceId, data: { accepted: true } })

      const startedAt = Date.now()
      let status = "ok"
      let result
      let err
      try {
        const response = await cdpSend(tabId, op.method, op.params || {})
        result = { kind: "cdp.send", tabId, method: op.method, response }
      } catch (e) {
        status = "error"
        err = toErrorPayload(e)
      }

      const replyUrl = payload?.reply?.url
      const callbackToken = payload?.reply?.callbackToken
      if (typeof replyUrl === "string" && typeof callbackToken === "string") {
        const cb = {
          type: "control.callback",
          commandId,
          traceId,
          at: Date.now(),
          status,
          result: status === "ok" ? result : undefined,
          error: status === "error" ? err : undefined,
          telemetry: { durationMs: Date.now() - startedAt, attempt: 1 }
        }
        await postCallback(replyUrl, callbackToken, cb)
      }
    } catch (e) {
      sendResponse({ ok: false, requestId: req.requestId, commandId: req.commandId, traceId: req.traceId, error: toErrorPayload(e) })
    }
  })()

  // keep channel open for async sendResponse
  return true
})


