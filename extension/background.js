import { verifyJwsEs256 } from "./jwks.js"

const DEFAULT_JWKS_URL = "http://localhost:3000/.well-known/jwks.json"
const DEFAULT_EVENT_SINK_URL = "http://localhost:3000/control/events"

// ---- Confirmation store ----
// actionKey = `${taskId}:${actionId}`
const CONFIRM_STORE_KEY = "mimo.confirmations.v1"

// ---- Notifications ----
// We avoid relying on popup being programmatically opened. Notifications are the primary confirmation entry.
// Ref: https://developer.chrome.com/docs/extensions/reference/api/notifications
const NOTIFY_PREFIX = "mimo.confirm:"
// Prefer extension-packaged resource (plan requirement). Keep data URL as fallback.
const NOTIFY_ICON_PATH = "icons/128.png"
const NOTIFY_ICON_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL(NOTIFY_ICON_PATH) : NOTIFY_ICON_PATH
// 1x1 PNG data URL (last-resort fallback, avoids SVG rendering issues in some notification centers)
const NOTIFY_ICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBApQp6XQAAAAASUVORK5CYII="

// ---- Action cache (idempotency) ----
// Keep short TTL to prevent accidental double-exec on retries/reconnects.
const ACTION_CACHE_TTL_MS = 2 * 60 * 1000
const actionCache = new Map() // actionKey -> { expiresAt, status, result, error }
const actionInFlight = new Map() // actionKey -> Promise<{status,result,error}>

async function getConfirmStore() {
  const out = await chrome.storage.local.get(CONFIRM_STORE_KEY)
  const v = out?.[CONFIRM_STORE_KEY]
  return v && typeof v === "object" ? v : {}
}

async function setConfirmStore(next) {
  await chrome.storage.local.set({ [CONFIRM_STORE_KEY]: next })
}

function notificationIdForActionKey(actionKey) {
  // notificationId max length is 500; our ids are short. Use stable mapping.
  return NOTIFY_PREFIX + actionKey
}

function actionKeyFromNotificationId(notificationId) {
  if (typeof notificationId !== "string") return ""
  if (!notificationId.startsWith(NOTIFY_PREFIX)) return ""
  return notificationId.slice(NOTIFY_PREFIX.length)
}

async function getNotificationPermissionLevelSafe() {
  try {
    if (!chrome?.notifications?.getPermissionLevel) return "unsupported"
    // callback-style for broad compatibility
    return await new Promise((resolve) => {
      try {
        chrome.notifications.getPermissionLevel((level) => {
          const err = chrome.runtime?.lastError
          if (err) return resolve("error")
          resolve(level || "granted")
        })
      } catch {
        resolve("error")
      }
    })
  } catch {
    return "error"
  }
}

async function createConfirmNotification({ actionKey, title, message }) {
  if (!chrome?.notifications?.create) return { ok: false, reason: "unsupported" }
  const id = notificationIdForActionKey(actionKey)
  const options = {
    type: "basic",
    iconUrl: NOTIFY_ICON_URL,
    title: title || "Mimo 需要确认",
    message: message || "该动作需要用户确认",
    requireInteraction: true,
    priority: 0,
    silent: true,
    buttons: [{ title: "Approve" }, { title: "Reject" }]
  }
  try {
    const r1 = await new Promise((resolve) => {
      chrome.notifications.create(id, options, () => {
        const err = chrome.runtime?.lastError
        resolve({ ok: !err, err: err?.message })
      })
    })
    if (!r1.ok) {
      // Fallback to data URL icon (some platforms may reject resource urls in notifications)
      const r2 = await new Promise((resolve) => {
        chrome.notifications.create(id, { ...options, iconUrl: NOTIFY_ICON_DATA_URL }, () => {
          const err = chrome.runtime?.lastError
          resolve({ ok: !err, err: err?.message })
        })
      })
      if (!r2.ok) return { ok: false, reason: r2.err || "notifications.create failed" }
    }
    return { ok: true, notificationId: id }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

// Popup/debug helper: trigger a test notification on demand.
if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const req = msg || {}
    if (req?.type !== "mimo.confirm") return
    if (req?.action !== "testNotification") return
    void (async () => {
      const perm = await getNotificationPermissionLevelSafe()
      const actionKey = `test:${Date.now()}`
      const created =
        perm === "granted"
          ? await createConfirmNotification({ actionKey, title: "Mimo 通知测试", message: "如果你能看到这条通知，说明 notifications 可用。" })
          : { ok: false, reason: String(perm) }
      sendResponse({ ok: true, perm, created })
    })()
    return true
  })
}

// Handle notification buttons -> write decision back to confirm store
if (chrome?.notifications?.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    void (async () => {
      const actionKey = actionKeyFromNotificationId(notificationId)
      if (!actionKey) return
      const store = await getConfirmStore()
      const entry = store[actionKey]
      if (!entry) {
        try {
          chrome.notifications.clear(notificationId)
        } catch {}
        return
      }
      const nextStatus = buttonIndex === 0 ? "approved" : "rejected"
      store[actionKey] = { ...entry, status: nextStatus, decidedAt: Date.now() }
      await setConfirmStore(store)
      try {
        chrome.notifications.clear(notificationId)
      } catch {}
    })()
  })
}

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

function toErrorPayloadWithCode(code, e) {
  const base = toErrorPayload(e)
  return { code, ...base }
}

function now() {
  return Date.now()
}

function getCachedAction(actionKey) {
  const e = actionCache.get(actionKey)
  if (!e) return null
  if (e.expiresAt <= now()) {
    actionCache.delete(actionKey)
    return null
  }
  return e
}

function setCachedAction(actionKey, value) {
  actionCache.set(actionKey, { ...value, expiresAt: now() + ACTION_CACHE_TTL_MS })
}

function originFromUrl(url) {
  try {
    const u = new URL(url)
    return u.origin
  } catch {
    return ""
  }
}

function isControlPageUrl(url) {
  try {
    const u = new URL(url)
    if (!(u.hostname === "localhost" || u.hostname === "127.0.0.1")) return false
    return u.pathname.startsWith("/control/")
  } catch {
    return false
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

async function getTabInfo(tabId) {
  try {
    const t = await chrome.tabs.get(tabId)
    return { url: t?.url, title: t?.title }
  } catch {
    return { url: undefined, title: undefined }
  }
}

async function tryCaptureBeforeScreenshot(tabId, sessionId, keepAttached) {
  try {
    // jpeg keeps size smaller for storage + popup rendering
    const response = await cdpSendWithAutoDetach(
      tabId,
      "Page.captureScreenshot",
      { format: "jpeg", quality: 60 },
      sessionId,
      keepAttached
    )
    return typeof response?.data === "string" ? response.data : ""
  } catch {
    return ""
  }
}

// Track last non-control active tab per window to avoid reloading control pages.
const lastNonControlTabByWindow = new Map() // windowId -> tabId

chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      if (tab && typeof tab.id === "number" && typeof tab.url === "string" && tab.url && !isControlPageUrl(tab.url)) {
        lastNonControlTabByWindow.set(activeInfo.windowId, tab.id)
      }
    } catch {
      // ignore
    }
  })()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab || typeof tab.id !== "number") return
  const url = tab.url || changeInfo.url
  if (typeof url === "string" && url && !isControlPageUrl(url) && typeof tab.windowId === "number") {
    lastNonControlTabByWindow.set(tab.windowId, tab.id)
  }
})

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const req = message || {}
  if (!req || req.type !== "driver") return

  // --- Simple external action: return active tabId (no JWS needed) ---
  if (req.action === "getActiveTab") {
    void (async () => {
      try {
        const senderOrigin = originFromUrl(sender?.url || "")
        if (!senderOrigin) throw new Error("Missing sender origin")
        if (!isLocalhostOrigin(senderOrigin)) {
          throw new Error(`Sender origin not allowed: ${senderOrigin}`)
        }

        const sourceTabId = typeof sender?.tab?.id === "number" ? sender.tab.id : undefined
        const sourceWindowId = typeof sender?.tab?.windowId === "number" ? sender.tab.windowId : undefined

        let candidate = null
        if (typeof sourceWindowId === "number") {
          candidate = lastNonControlTabByWindow.get(sourceWindowId) ?? null
        }

        // Validate candidate tab still exists; otherwise fall back.
        let tabId = null
        if (typeof candidate === "number") {
          try {
            const t = await chrome.tabs.get(candidate)
            if (t && typeof t.id === "number") tabId = t.id
          } catch {
            tabId = null
          }
        }
        if (typeof tabId !== "number") {
          tabId = await getActiveTabId()
        }

        let tabUrl = undefined
        let tabTitle = undefined
        try {
          const t = await chrome.tabs.get(tabId)
          tabUrl = t?.url
          tabTitle = t?.title
        } catch {
          // ignore
        }

        sendResponse({ ok: true, requestId: req.requestId, tabId, tabUrl, tabTitle, sourceTabId, sourceWindowId })
      } catch (e) {
        sendResponse({ ok: false, requestId: req.requestId, error: toErrorPayload(e) })
      }
    })()

    // keep channel open for async sendResponse
    return true
  }

  // --- Simple external action: return the REAL focused active tabId (no JWS needed) ---
  // This does NOT apply lastNonControlTab fallback. Used for \"no disturbance\" verification.
  if (req.action === "getFocusedActiveTab") {
    void (async () => {
      try {
        const senderOrigin = originFromUrl(sender?.url || "")
        if (!senderOrigin) throw new Error("Missing sender origin")
        if (!isLocalhostOrigin(senderOrigin)) {
          throw new Error(`Sender origin not allowed: ${senderOrigin}`)
        }

        const tabId = await getActiveTabId()

        let tabUrl = undefined
        let tabTitle = undefined
        let windowId = undefined
        try {
          const t = await chrome.tabs.get(tabId)
          tabUrl = t?.url
          tabTitle = t?.title
          windowId = t?.windowId
        } catch {
          // ignore
        }

        sendResponse({ ok: true, requestId: req.requestId, tabId, tabUrl, tabTitle, windowId })
      } catch (e) {
        sendResponse({ ok: false, requestId: req.requestId, error: toErrorPayload(e) })
      }
    })()
    return true
  }

  // --- Simple external action: create a new tab (no JWS needed) ---
  if (req.action === "createTab") {
    void (async () => {
      try {
        const senderOrigin = originFromUrl(sender?.url || "")
        if (!senderOrigin) throw new Error("Missing sender origin")
        if (!isLocalhostOrigin(senderOrigin)) {
          throw new Error(`Sender origin not allowed: ${senderOrigin}`)
        }

        const url = typeof req.url === "string" ? req.url : "about:blank"
        const active = typeof req.active === "boolean" ? req.active : false
        const tab = await chrome.tabs.create({ url, active })
        
        sendResponse({ ok: true, requestId: req.requestId, tabId: tab.id, tabUrl: tab.url, tabTitle: tab.title })
      } catch (e) {
        sendResponse({ ok: false, requestId: req.requestId, error: toErrorPayload(e) })
      }
    })()
    return true
  }

  if (req.action !== "invoke") return

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

      // Optional action meta (Phase9+): used for confirmation gating & audit correlation.
      const action = payload?.action
      const taskId = typeof action?.taskId === "string" ? action.taskId : ""
      const actionId = typeof action?.actionId === "string" ? action.actionId : ""
      const risk = typeof action?.risk === "string" ? action.risk : undefined
      const requiresConfirmation = Boolean(action?.requiresConfirmation)
      const reason = typeof action?.reason === "string" ? action.reason : ""
      const actionKey = taskId && actionId ? `${taskId}:${actionId}` : ""

      // Respond to WebApp early (accepted) to avoid hanging external channel.
      sendResponse({ ok: true, requestId: req.requestId, commandId, traceId, data: { accepted: true } })

      const startedAt = Date.now()
      let status = "ok"
      let result
      let err
      await runExclusive(tabId, async () => {
        try {
          if (actionKey) {
            const cached = getCachedAction(actionKey)
            if (cached) {
              status = cached.status
              result = cached.result
              err = cached.error
              return
            }
            const inflight = actionInFlight.get(actionKey)
            if (inflight) {
              const r = await inflight
              status = r.status
              result = r.result
              err = r.error
              return
            }
          }

          // Confirmation gate: only enforce for user-input CDP methods.
          // We intentionally do NOT gate DOM/Runtime/Page reads to avoid over-confirming internal sub-steps.
          const isUserInputMethod = typeof op.method === "string" && op.method.startsWith("Input.")
          if (requiresConfirmation && isUserInputMethod && actionKey) {
            const store = await getConfirmStore()
            const entry = store[actionKey]
            const entryStatus = entry?.status || "pending"

            if (entryStatus !== "approved") {
              // Create/refresh pending request snapshot for popup UI
              const { url, title } = await getTabInfo(tabId)
              const screenshotData = await tryCaptureBeforeScreenshot(tabId, sessionId, keepAttached)
              store[actionKey] = {
                status: entryStatus === "rejected" ? "rejected" : "pending",
                updatedAt: Date.now(),
                request: {
                  taskId,
                  actionId,
                  risk,
                  reason,
                  tabId,
                  url,
                  title,
                  method: op.method,
                  screenshotData
                }
              }
              await setConfirmStore(store)

              // Primary confirm UX: system notifications with Approve/Reject.
              const perm = await getNotificationPermissionLevelSafe()
              if (perm === "granted") {
                const msgParts = []
                msgParts.push(String(op.method || "Input.*"))
                if (risk) msgParts.push("risk=" + risk)
                if (url) msgParts.push(url.slice(0, 120))
                const n = await createConfirmNotification({
                  actionKey,
                  title: "Mimo 动作需要确认",
                  message: msgParts.join(" | ")
                })
                // best-effort; ignore failure (will fall back to popup manual)
                if (!n.ok) {
                  // no-op
                }
              }

              status = "error"
              err =
                entryStatus === "rejected"
                  ? toErrorPayloadWithCode("CONFIRMATION_REJECTED", "User rejected confirmation")
                  : toErrorPayloadWithCode(
                      "CONFIRMATION_REQUIRED",
                      perm === "granted"
                        ? "Confirmation required (use system notification Approve/Reject)"
                        : "Confirmation required (notifications disabled; open extension popup to approve)"
                    )
              // Don't cache confirmation errors; allow retry after approval.
              return
            }

            // Approved: consume decision to avoid unintended reuse on future retries.
            delete store[actionKey]
            await setConfirmStore(store)
          }

          const exec = (async () => {
            const response = await cdpSendWithAutoDetach(tabId, op.method, op.params || {}, sessionId, keepAttached)
            return { status: "ok", result: { kind: "cdp.send", tabId, method: op.method, sessionId, response }, error: undefined }
          })()

          if (actionKey) actionInFlight.set(actionKey, exec)
          const r = await exec
          status = r.status
          result = r.result
          err = r.error
          if (actionKey) {
            actionInFlight.delete(actionKey)
            // Cache success + non-confirmation errors for a short TTL.
            setCachedAction(actionKey, { status, result, error: err })
          }
        } catch (e) {
          status = "error"
          err = toErrorPayload(e)
          if (actionKey) {
            actionInFlight.delete(actionKey)
            setCachedAction(actionKey, { status, result: undefined, error: err })
          }
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


