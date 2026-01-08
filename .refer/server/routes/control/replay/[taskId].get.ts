import { eventHandler } from "h3"
import { readTaskJsonl, readTaskScreenshotBase64 } from "@/utils/control/auditStore"

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default eventHandler(async (event) => {
  const taskId = String((event.context.params as any)?.taskId ?? "")
  if (!taskId) {
    event.node.res.statusCode = 400
    return "Missing taskId"
  }

  const lines = await readTaskJsonl(taskId)
  const parsed = lines
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean) as any[]

  // Inline minimal HTML renderer (no framework).
  const items = []
  for (const it of parsed) {
    const before = typeof it?.artifacts?.beforeScreenshot === "string" ? it.artifacts.beforeScreenshot : ""
    const after = typeof it?.artifacts?.afterScreenshot === "string" ? it.artifacts.afterScreenshot : ""
    const beforeB64 = before ? await readTaskScreenshotBase64(taskId, before) : null
    const afterB64 = after ? await readTaskScreenshotBase64(taskId, after) : null
    items.push({
      ts: it.ts,
      actionId: it.actionId,
      status: it.status,
      action: it.action,
      error: it.error,
      beforeB64,
      afterB64
    })
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Replay ${escapeHtml(taskId)}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:0;background:#fafafa;}
      header{padding:14px 18px;border-bottom:1px solid #eee;background:#fff;position:sticky;top:0}
      h1{font-size:14px;margin:0}
      .wrap{padding:14px 18px;max-width:1000px;margin:0 auto}
      .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin:10px 0}
      .muted{color:#666;font-size:12px}
      code{background:#f6f6f6;padding:1px 6px;border-radius:8px}
      img{max-width:100%;border:1px solid #eee;border-radius:10px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
      .pill{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #eee;font-size:12px}
      .ok{border-color:#0a7a33;color:#0a7a33}
      .error{border-color:#b00020;color:#b00020}
    </style>
  </head>
  <body>
    <header>
      <h1>Replay: <code>${escapeHtml(taskId)}</code></h1>
      <div class="muted">items: ${items.length}</div>
      <div class="muted" style="margin-top:6px">
        <a href="/control/export/${escapeHtml(taskId)}" style="color:#2563eb;text-decoration:none">Download zip</a>
        <span style="margin-left:10px"></span>
        <a href="/control/export/${escapeHtml(taskId)}?format=json" style="color:#2563eb;text-decoration:none">Export json</a>
      </div>
    </header>
    <div class="wrap" id="root"></div>
    <script>
      const items = ${JSON.stringify(items)};
      const root = document.getElementById('root');
      const fmtTs = (ts)=> new Date(ts).toLocaleString();
      function downloadBase64Jpeg(base64, filename) {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image.jpg';
        a.click();
        setTimeout(()=> URL.revokeObjectURL(url), 1000);
      }
      for (const it of items) {
        const div = document.createElement('div');
        div.className = 'card';
        const pill = it.status === 'ok' ? '<span class="pill ok">ok</span>' : '<span class="pill error">error</span>';
        div.innerHTML = \`
          <div>\${pill} <code>\${it.actionId}</code> <span class="muted">\${fmtTs(it.ts)}</span></div>
          <div class="muted">action: <code>\${(it.action && it.action.type) || 'unknown'}</code></div>
          \${it.action && (it.action.risk || it.action.requiresConfirmation) ? '<div class="muted">risk: <code>' + (it.action.risk||'') + '</code> confirm: <code>' + String(Boolean(it.action.requiresConfirmation)) + '</code></div>' : ''}
          \${it.action && it.action.reason ? '<div class="muted">reason: <code>' + it.action.reason + '</code></div>' : ''}
          \${it.error ? '<div class="muted">error: <code>' + ((it.error.code||'') + ' ' + (it.error.message||'')).trim() + '</code></div>' : ''}
          <div class="grid">
            <div>\${it.beforeB64 ? '<div class="muted">before <button data-dl=\"before\" style=\"margin-left:6px\">download</button></div><img src="data:image/jpeg;base64,'+it.beforeB64+'"/>' : '<div class="muted">before: (none)</div>'}</div>
            <div>\${it.afterB64 ? '<div class="muted">after <button data-dl=\"after\" style=\"margin-left:6px\">download</button></div><img src="data:image/jpeg;base64,'+it.afterB64+'"/>' : '<div class="muted">after: (none)</div>'}</div>
          </div>
        \`;
        root.appendChild(div);
        const b1 = div.querySelector('button[data-dl=\"before\"]');
        if (b1 && it.beforeB64) b1.addEventListener('click', ()=> downloadBase64Jpeg(it.beforeB64, it.actionId + '-before.jpg'));
        const b2 = div.querySelector('button[data-dl=\"after\"]');
        if (b2 && it.afterB64) b2.addEventListener('click', ()=> downloadBase64Jpeg(it.afterB64, it.actionId + '-after.jpg'));
      }
    </script>
  </body>
</html>`

  event.node.res.setHeader("content-type", "text/html; charset=utf-8")
  return html
})


