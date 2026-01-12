import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Highlight Verify - nanobrowser 元素圈定</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
  .row { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
  input { padding: 10px 12px; width: min(820px, 92vw); font-size: 14px; }
  button { padding: 10px 12px; font-size: 14px; cursor: pointer; }
  .meta { color:#555; margin-top: 8px; font-size: 12px; }
  .box { border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-top: 12px; }
  pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 13px; }
  .ok { color: #0a7a33; }
  .bad { color: #b00020; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; vertical-align: top; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>

<h1>Highlight Verify - nanobrowser 元素圈定</h1>
<div class="meta">
  本页验证 <code>/control/highlight</code>：打开指定 URL 后，按 nanobrowser 规则在页面上画框圈定元素，并返回 <code>highlightIndex → elementId</code> 映射。
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>url</label>
    <input id="url" placeholder="要打开并圈定的页面 URL" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnRun">Open + Highlight</button>
    <button id="btnClear">Clear Overlays</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">圈定结果（前 200 条）</div>
  <div id="tableWrap"></div>
</div>

<div class="box">
  <div class="meta">详细输出</div>
  <pre id="detail"></pre>
</div>

<script>
  const $extId = document.getElementById('extId');
  const $replyUrl = document.getElementById('replyUrl');
  const $url = document.getElementById('url');
  const $status = document.getElementById('status');
  const $detail = document.getElementById('detail');
  const $tableWrap = document.getElementById('tableWrap');
  const $btnRun = document.getElementById('btnRun');
  const $btnClear = document.getElementById('btnClear');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyHighlight.extensionId';
  const LS_REPLY = 'control.verifyHighlight.replyUrl';
  const LS_URL = 'control.verifyHighlight.url';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setDetail(obj) { $detail.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }

  function load() {
    const qp = new URLSearchParams(location.search);
    $extId.value = (window.localStorage.getItem(LS_EXT) || defaultExt || '').trim();
    $replyUrl.value = (window.localStorage.getItem(LS_REPLY) || defaultReply || '').trim();
    $url.value = (qp.get('url') || window.localStorage.getItem(LS_URL) || location.origin + '/test-stagehand.html').trim();
    if (!hasChromeRuntime()) setStatus('chrome.runtime missing（请在 Chrome + 扩展中打开）', false);
    else setStatus('ready', true);
  }
  $extId.addEventListener('input', () => window.localStorage.setItem(LS_EXT, ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem(LS_REPLY, ($replyUrl.value || '').trim()));
  $url.addEventListener('input', () => window.localStorage.setItem(LS_URL, ($url.value || '').trim()));

  async function sendToExtension(extensionId, msg) {
    return await new Promise((resolve) => {
      try {
        window.chrome.runtime.sendMessage(extensionId, msg, (resp) => {
          const err = window.chrome.runtime.lastError;
          if (err) return resolve({ ok: false, error: { message: err.message, name: 'ChromeRuntimeError' } });
          resolve(resp || { ok: false, error: { message: 'No response', name: 'NoResponse' } });
        });
      } catch (e) {
        resolve({ ok: false, error: { message: e instanceof Error ? e.message : String(e), name: 'SendError' } });
      }
    });
  }

  let es = null;
  function disconnectSse() { if (es) { try { es.close(); } catch {} es = null; } }
  function connectSse(extensionId) {
    disconnectSse();
    return new Promise((resolve) => {
      const url = '/control/stream?extensionId=' + encodeURIComponent(extensionId);
      es = new EventSource(url);
      let done = false;
      const finish = (ok, info) => { if (done) return; done = true; resolve({ ok, info }); };
      const t = setTimeout(() => finish(false, { message: 'SSE connect timeout' }), 5000);
      es.addEventListener('ready', () => { clearTimeout(t); finish(true, { message: 'SSE connected' }); });
      es.addEventListener('command', (ev) => {
        try {
          const envelope = JSON.parse(ev.data);
          const req = {
            type: 'driver',
            action: 'invoke',
            requestId: 'highlight-forward-' + Date.now(),
            commandId: envelope.commandId,
            traceId: envelope.traceId,
            target: { tabId: envelope?.target?.tabId },
            jws: envelope.jws
          };
          void sendToExtension(extensionId, req);
        } catch {}
      });
      es.onerror = () => { if (!done) { clearTimeout(t); finish(false, { message: 'SSE error before ready' }); } };
    });
  }

  async function createTargetTab(extensionId, url) {
    const requestId = 'highlight-create-' + Date.now();
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: url || 'about:blank', active: true });
    if (!tabResp?.ok || typeof tabResp.tabId !== 'number') return { ok: false, tabResp };
    return { ok: true, tabId: tabResp.tabId, tabResp };
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  function renderTable(items) {
    const rows = items.slice(0, 200).map((it) => {
      const el = it.elementId ? '<code>' + it.elementId + '</code>' : '<span style="color:#b00020">null</span>';
      return '<tr>' +
        '<td><code>' + it.highlightIndex + '</code></td>' +
        '<td>' + el + '</td>' +
        '<td><code>' + (it.tagName || '') + '</code></td>' +
        '<td><code>' + (it.xpath || '') + '</code></td>' +
      '</tr>';
    }).join('');

    $tableWrap.innerHTML = '<table>' +
      '<thead><tr><th>highlightIndex</th><th>elementId</th><th>tag</th><th>xpath</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
  }

  async function run() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    const url = ($url.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!url) return setStatus('Missing url', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    setStatus('Step 1: createTab(open url)...', true);
    const target = await createTargetTab(extensionId, url);
    if (!target.ok) { setDetail(target); return setStatus('createTab failed', false); }
    const tabId = target.tabId;

    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) { setDetail({ tabId, target, sse }); return setStatus('SSE connect failed', false); }

    setStatus('Step 3: open + highlight...', true);
    const resp = await postJson('/control/highlight', { extensionId, tabId, replyUrl, url, viewportExpansion: 0, focusHighlightIndex: -1, showHighlightElements: true });
    const pass = Boolean(resp?.ok);
    setStatus(pass ? '✅ highlighted' : '❌ highlight failed', pass);
    setDetail({ tabId, sse, resp });
    if (pass) renderTable(resp.result.items || []);
  }

  async function clear() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);
    // Reuse last tabId if present in detail json
    try {
      const parsed = JSON.parse($detail.textContent || '{}');
      const tabId = parsed?.tabId || parsed?.resp?.result?.tabId || parsed?.resp?.result?.tabId;
      if (!tabId) return setStatus('No tabId found in output; run highlight first', false);
      const resp = await postJson('/control/highlight/clear', { extensionId, tabId, replyUrl });
      const pass = Boolean(resp?.ok);
      setStatus(pass ? '✅ cleared' : '❌ clear failed', pass);
      setDetail({ ...parsed, clear: resp });
    } catch (e) {
      setStatus('Cannot parse detail; run highlight first', false);
    }
  }

  $btnRun.addEventListener('click', () => void run());
  $btnClear.addEventListener('click', () => void clear());
  load();
</script>
`
})

