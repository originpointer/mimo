import { verifyJwsEs256 } from "./jwks.js"

const DEFAULT_JWKS_URL = "http://localhost:3000/.well-known/jwks.json"
const DEFAULT_EVENT_SINK_URL = "http://localhost:3000/control/events"

// ---- Session Registry ----
// Tracks attached tabs and their child sessions (for iframe/OOPIF support)
const sessionRegistry = new Map() // tabId -> { attached: boolean, children: Map<sessionId, targetInfo> }

function getOrCreateTabSession(tabId) {
  if (!sessionRegistry.has(tabId)) {
    sessionRegistry.set(tabId, { attached: false, children: new Map() })
  }
  return sessionRegistry.get(tabId)
}

// ---- Utility functions ----

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

// ---- CDP functions with session support ----

async function ensureAttached(tabId) {
  const session = getOrCreateTabSession(tabId)
  if (session.attached) return
  
  const debuggee = { tabId }
  await chrome.debugger.attach(debuggee, "1.3")
  session.attached = true
}

async function cdpSend(tabId, method, params, sessionId = null) {
  await ensureAttached(tabId)
  
  // Build debuggee with optional sessionId for child frame targeting
  const debuggee = sessionId ? { tabId, sessionId } : { tabId }
  const result = await chrome.debugger.sendCommand(debuggee, method, params)
  return result
}

async function cdpSendWithAutoDetach(tabId, method, params, sessionId = null, keepAttached = false) {
  const debuggee = { tabId }
  const session = getOrCreateTabSession(tabId)
  
  if (!session.attached) {
    await chrome.debugger.attach(debuggee, "1.3")
    session.attached = true
  }
  
  try {
    const targetDebuggee = sessionId ? { tabId, sessionId } : { tabId }
    const result = await chrome.debugger.sendCommand(targetDebuggee, method, params)
    return result
  } finally {
    if (!keepAttached) {
      try {
        await chrome.debugger.detach(debuggee)
        session.attached = false
        session.children.clear()
      } catch {
        // ignore
      }
    }
  }
}

// Serialize execution per tab to avoid concurrent chrome.debugger.attach conflicts.
const tabQueue = new Map()

function runExclusive(tabId, fn) {
  const key = String(tabId)
  const prev = tabQueue.get(key) || Promise.resolve()
  const next = prev
    .catch(() => {})
    .then(fn)
  tabQueue.set(
    key,
    next.finally(() => {
      if (tabQueue.get(key) === next) tabQueue.delete(key)
    })
  )
  return next
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
      
      // Extract session targeting options
      const sessionId = op.sessionId || payload?.target?.sessionId || null
      const keepAttached = Boolean(op.keepAttached || payload?.target?.keepAttached || payload?.options?.keepAttached)

      // Respond to WebApp early (accepted) to avoid hanging external channel.
      sendResponse({ ok: true, requestId: req.requestId, commandId, traceId, data: { accepted: true } })

      const startedAt = Date.now()
      let status = "ok"
      let result
      let err
      await runExclusive(tabId, async () => {
        try {
          const response = await cdpSendWithAutoDetach(tabId, op.method, op.params || {}, sessionId, keepAttached)
          result = { kind: "cdp.send", tabId, method: op.method, sessionId, response }
        } catch (e) {
          status = "error"
          err = toErrorPayload(e)
        }
      })

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

// ---- Event stream sink: forward chrome.debugger.onEvent to server ----
// Also maintain session registry for child targets

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId
  const sessionId = source.sessionId || null
  
  // Update session registry for Target events
  if (method === "Target.attachedToTarget" && params?.sessionId && params?.targetInfo) {
    const session = getOrCreateTabSession(tabId)
    session.children.set(params.sessionId, {
      targetId: params.targetInfo.targetId,
      type: params.targetInfo.type,
      url: params.targetInfo.url
    })
    console.log(`[session] Child attached: tabId=${tabId} sessionId=${params.sessionId} type=${params.targetInfo.type}`)
  }
  
  if (method === "Target.detachedFromTarget" && params?.sessionId) {
    const session = getOrCreateTabSession(tabId)
    session.children.delete(params.sessionId)
    console.log(`[session] Child detached: tabId=${tabId} sessionId=${params.sessionId}`)
  }
  
  // Forward all events to server
  const payload = {
    tabId,
    sessionId,
    method,
    params,
    ts: Date.now()
  }
  
  fetch(DEFAULT_EVENT_SINK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {
    // ignore network errors
  })
})

// Handle debugger detach (user clicked "Cancel" or navigated away)
chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId
  const session = sessionRegistry.get(tabId)
  if (session) {
    session.attached = false
    session.children.clear()
    console.log(`[session] Detached: tabId=${tabId} reason=${reason}`)
  }
})


