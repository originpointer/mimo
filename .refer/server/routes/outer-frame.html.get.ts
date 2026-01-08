import { eventHandler } from "h3"

export default eventHandler(() => {
  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Outer Frame</title>
<h1>Outer Frame</h1>
<p id="marker">outer-frame</p>
<iframe src="/inner-frame.html" style="width: 100%; height: 60vh; border: 1px solid #eee; border-radius: 12px;"></iframe>
`
})




