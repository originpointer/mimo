import { eventHandler } from "h3"

/**
 * GET /test-stagehand-same-origin-iframe.html
 * Phase 7: 同源 iframe 外页（用于验证无需 child sessionId 的降级链路）
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stagehand Same-Origin Iframe Test</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; }
      .frame { padding: 24px; }
      h1 { margin: 0 0 10px 0; }
      .hint { color: #666; font-size: 12px; margin-bottom: 12px; }
      iframe#inner {
        position: absolute;
        left: 60px;
        top: 110px;
        width: 520px;
        height: 260px;
        border: 1px solid #ddd;
        border-radius: 12px;
        background: #fff;
      }
      code { background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="frame">
      <h1 id="title">Same-Origin Iframe Test</h1>
      <div class="hint">
        iframe 选择器：<code>iframe#inner</code>，内元素选择器：<code>#btn</code>/<code>#input</code>
      </div>
    </div>

    <iframe id="inner" src="/test-stagehand-inner.html"></iframe>
  </body>
</html>`
})


