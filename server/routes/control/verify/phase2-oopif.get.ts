import { eventHandler, getQuery } from "h3"

function safeUrl(input: unknown): string {
  try {
    const u = new URL(typeof input === "string" ? input : "")
    // allow http/https only (avoid file:, chrome:, etc)
    if (u.protocol !== "http:" && u.protocol !== "https:") return "https://example.com/"
    return u.toString()
  } catch {
    return "https://example.com/"
  }
}

export default eventHandler((event) => {
  const q = getQuery(event)
  const src = safeUrl(q.src)
  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase2 OOPIF Helper</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
  .meta { color:#555; margin-top: 8px; font-size: 12px; }
  iframe { width: min(980px, 95vw); height: 70vh; border: 1px solid #eee; border-radius: 12px; }
</style>
<h1>Phase2 OOPIF Helper</h1>
<div class="meta">本页用于制造跨域 iframe（用于 Target.* / sessionId 验证）。iframe src: <code>${src}</code></div>
<iframe src="${src}" referrerpolicy="no-referrer"></iframe>
`
})


