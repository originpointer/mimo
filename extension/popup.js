const KEY = "mimo.confirmations.v1"

function $(id) {
  return document.getElementById(id)
}

async function getStore() {
  const out = await chrome.storage.local.get(KEY)
  return out?.[KEY] && typeof out[KEY] === "object" ? out[KEY] : {}
}

async function setStore(next) {
  await chrome.storage.local.set({ [KEY]: next })
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") el.className = v
    else if (k === "text") el.textContent = v
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v)
    else el.setAttribute(k, String(v))
  }
  for (const c of children) el.appendChild(c)
  return el
}

function pillRisk(risk) {
  const r = risk || "low"
  return h("span", { className: "pill " + r, text: r })
}

function renderItem(key, entry, store, refresh) {
  const req = entry?.request || {}
  const status = entry?.status || "pending"

  const title = (req.title || "").slice(0, 100)
  const url = req.url || ""
  const method = req.method || ""
  const reason = req.reason || ""
  const risk = req.risk || "low"
  const screenshot = req.screenshotData || ""

  const header = h("div", {}, [
    h("div", { className: "kv" }, [
      h("div", { className: "kv", text: title || "(no title)" }),
      h("div", { className: "kv" }, [pillRisk(risk), document.createTextNode(" "), h("span", { className: "pill", text: status })])
    ])
  ])

  const meta = h("div", { className: "kv" }, [
    h("div", { className: "kv", text: `method: ${method}` }),
    h("div", { className: "kv" }, [
      h("span", { text: "url: " }),
      h("code", { text: url ? url.slice(0, 80) : "(unknown)" })
    ]),
    h("div", { className: "kv" }, [
      h("span", { text: "actionKey: " }),
      h("code", { text: key })
    ]),
    reason ? h("div", { className: "kv", text: `reason: ${reason}` }) : h("div", { className: "kv", text: "" })
  ])

  const img = screenshot
    ? h("img", { className: "shot", src: `data:image/jpeg;base64,${screenshot}` })
    : h("div", { className: "muted", text: "No screenshot captured." })

  const actions = h("div", { className: "actions" }, [
    h("button", {
      className: "btn approve",
      text: "Approve",
      onclick: async () => {
        store[key] = { ...entry, status: "approved", decidedAt: Date.now() }
        await setStore(store)
        await refresh()
      }
    }),
    h("button", {
      className: "btn reject",
      text: "Reject",
      onclick: async () => {
        store[key] = { ...entry, status: "rejected", decidedAt: Date.now() }
        await setStore(store)
        await refresh()
      }
    }),
    h("button", {
      className: "btn",
      text: "Clear",
      onclick: async () => {
        delete store[key]
        await setStore(store)
        await refresh()
      }
    })
  ])

  return h("div", { className: "card" }, [header, meta, img, actions])
}

async function refresh() {
  const statusEl = $("status")
  const notifyStatusEl = $("notifyStatus")
  const listEl = $("list")
  listEl.innerHTML = ""

  const store = await getStore()
  const keys = Object.keys(store || {})
  const pending = keys.filter((k) => (store[k]?.status || "pending") === "pending")

  statusEl.textContent = pending.length ? `Pending confirmations: ${pending.length}` : "No pending confirmations."

  for (const k of pending) {
    listEl.appendChild(renderItem(k, store[k], store, refresh))
  }

  if (!pending.length && keys.length) {
    // show non-pending items collapsed-ish
    listEl.appendChild(h("div", { className: "muted", text: `History: ${keys.length} item(s).` }))
  }

  // Reset notify status line
  if (notifyStatusEl) notifyStatusEl.textContent = ""
}

$("btnRefresh").addEventListener("click", () => void refresh())

// Diagnostic: test system notification pipeline
$("btnTestNotify")?.addEventListener("click", () => {
  const el = $("notifyStatus")
  if (el) el.textContent = "Sending test notification…"
  try {
    chrome.runtime.sendMessage({ type: "mimo.confirm", action: "testNotification" }, (resp) => {
      const err = chrome.runtime.lastError
      if (err) {
        if (el) el.textContent = "Test failed: " + err.message
        return
      }
      if (el) el.textContent = "perm=" + (resp?.perm ?? "unknown") + ", created=" + JSON.stringify(resp?.created || {})
    })
  } catch (e) {
    if (el) el.textContent = "Test failed: " + (e instanceof Error ? e.message : String(e))
  }
})

void refresh()




