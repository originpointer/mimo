import { eventHandler } from "h3"

export default eventHandler(() => {
  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Inner Frame</title>
<h1>Inner Frame</h1>
<p id="marker">inner-frame</p>
`
})




