import { eventHandler } from "h3"

export default eventHandler(() => {
  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test Nested Iframes</title>
<h1>Test Nested Iframes</h1>
<p id="marker">test-nested</p>
<iframe src="/outer-frame.html" style="width: 100%; height: 70vh; border: 1px solid #eee; border-radius: 12px;"></iframe>
`
})


