import { eventHandler, getQuery } from "h3"

function safeUrl(input: unknown): string {
  try {
    const u = new URL(typeof input === "string" ? input : "")
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
<title>Test OOPIF (Cross-origin iframe)</title>
<h1>Test OOPIF (Cross-origin iframe)</h1>
<p id="marker">test-oopif</p>
<p>iframe src: <code>${src}</code></p>
<iframe src="${src}" referrerpolicy="no-referrer" style="width: 100%; height: 70vh; border: 1px solid #eee; border-radius: 12px;"></iframe>
`
})


