import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"
import { captureHybridSnapshot } from "@/utils/control/snapshot"
import { runNanobrowserHighlight } from "@/utils/control/highlight/nanobrowserHighlight"
import { normalizeXPath } from "@/utils/control/snapshot/xpathUtils"

type HighlightBody = {
  extensionId: string
  tabId: number
  replyUrl?: string
  sessionId?: string
  url: string
  viewportExpansion?: number
  focusHighlightIndex?: number
  showHighlightElements?: boolean
}

function urlBase(u: string): string {
  try {
    const x = new URL(u)
    return `${x.origin}${x.pathname}`
  } catch {
    return u
  }
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<HighlightBody> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }
  if (typeof body.tabId !== "number") {
    throw createError({ statusCode: 400, statusMessage: "Missing body.tabId" })
  }
  if (typeof body.url !== "string" || !body.url) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.url" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`

  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    keepAttached: true
  })
  driver.setTabId(body.tabId)

  try {
    // 1) Navigate to target URL (if needed)
    const targetBase = urlBase(body.url)
    let currentHref = ""
    try {
      currentHref = String(
        await driver.evaluate("location.href", {
          tabId: body.tabId,
          sessionId: body.sessionId,
          returnByValue: true
        })
      )
    } catch {
      // ignore
    }
    const currentBase = urlBase(currentHref)
    const shouldNavigate = !currentBase || currentBase === "about:blank" || currentBase !== targetBase
    if (shouldNavigate) {
      await driver.navigate(body.url, { waitForLoad: true })
    }
    await driver.waitForStable(body.tabId, { timeoutMs: 30000, idleMs: 500 }).catch(() => ({ domReady: false, networkIdle: false }))

    // 2) Capture hybrid snapshot (for xpath->elementId mapping, including same-origin iframe via contentDocument)
    const snap = await captureHybridSnapshot(driver, {
      tabId: body.tabId,
      sessionId: body.sessionId,
      pierceShadow: true,
      experimental: false
    })

    // Build xpath -> elementId reverse index
    const xpathToElementId = new Map<string, string>()
    for (const [enc, xp] of Object.entries(snap.combinedXpathMap || {})) {
      xpathToElementId.set(normalizeXPath(xp), enc)
    }

    // 3) Run nanobrowser highlight on the page and collect highlighted items
    const highlighted = await runNanobrowserHighlight(driver, {
      tabId: body.tabId,
      sessionId: body.sessionId,
      viewportExpansion: body.viewportExpansion ?? 0,
      focusHighlightIndex: body.focusHighlightIndex ?? -1,
      showHighlightElements: body.showHighlightElements ?? true
    })

    const items = highlighted.map((it) => {
      const nx = normalizeXPath(it.xpath)
      const elementId = xpathToElementId.get(nx) ?? null
      return {
        highlightIndex: it.highlightIndex,
        xpath: it.xpath,
        elementId,
        tagName: it.tagName,
        attributes: it.attributes
      }
    })

    return {
      ok: true,
      result: {
        tabId: body.tabId,
        url: body.url,
        count: items.length,
        mappedCount: items.filter((x) => x.elementId).length,
        items
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: { message } }
  }
})

