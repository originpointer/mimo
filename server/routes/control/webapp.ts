import { eventHandler } from "h3"

function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
}

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? ""

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Control WebApp Bridge</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
  .row { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
  input { padding: 10px 12px; width: min(720px, 92vw); font-size: 14px; }
  button { padding: 10px 12px; font-size: 14px; cursor: pointer; }
  .meta { color:#555; margin-top: 8px; font-size: 12px; }
  .box { border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-top: 12px; }
  pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
  .ok { color: #0a7a33; }
  .bad { color: #b00020; }
</style>
<h1>WebApp 中转页（SSE → onMessageExternal）</h1>
<div class="meta">
  说明：此页订阅 <code>/control/stream?extensionId=...</code> 的 SSE，收到 <code>control.command</code> 后转发到扩展（<code>chrome.runtime.sendMessage</code>）。
  扩展执行后应直接 HTTP 回传到控制端（此页不接收回传）。
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于 /control/enqueue 的测试回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnConnect">Connect SSE</button>
    <button id="btnDisconnect">Disconnect</button>
    <button id="btnTestEnqueue">Test enqueue (Runtime.evaluate 1+1)</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">Recent log</div>
  <pre id="log"></pre>
</div>

<script>
  const $extId = document.getElementById('extId');
  const $replyUrl = document.getElementById('replyUrl');
  const $status = document.getElementById('status');
  const $log = document.getElementById('log');
  const $btnConnect = document.getElementById('btnConnect');
  const $btnDisconnect = document.getElementById('btnDisconnect');
  const $btnTestEnqueue = document.getElementById('btnTestEnqueue');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  function hasChromeRuntime() {
    return Boolean(window?.chrome?.runtime?.sendMessage);
  }

  function log(line, obj) {
    const msg = '[' + new Date().toISOString() + '] ' + line + (obj ? '\\n' + JSON.stringify(obj, null, 2) : '');
    $log.textContent = msg + '\\n\\n' + ($log.textContent || '');
  }

  function setStatus(text, ok=true) {
    $status.textContent = text;
    $status.className = ok ? 'meta ok' : 'meta bad';
  }

  function load() {
    const savedExt = window.localStorage.getItem('control.extensionId') || '';
    const savedReply = window.localStorage.getItem('control.replyUrl') || '';
    $extId.value = savedExt || defaultExt || '';
    const fallbackReply = window.location.origin + '/control/callback';
    // 如果曾经误填到 /control/enqueue（enqueue 只是测试下发，不是回传端点），自动纠正
    const normalizedSaved = savedReply && savedReply.includes('/control/enqueue') ? '' : savedReply;
    $replyUrl.value = normalizedSaved || defaultReply || fallbackReply;
    setStatus('chrome.runtime: ' + (hasChromeRuntime() ? 'available' : 'missing'), hasChromeRuntime());
  }

  $extId.addEventListener('input', () => window.localStorage.setItem('control.extensionId', ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem('control.replyUrl', ($replyUrl.value || '').trim()));

  let es = null;
  function disconnect() {
    if (es) {
      es.close();
      es = null;
      setStatus('disconnected', true);
    }
  }

  function sendToExtension(extensionId, req) {
    return new Promise((resolve) => {
      try {
        window.chrome.runtime.sendMessage(extensionId, req, (res) => {
          const maybeError = window.chrome?.runtime?.lastError?.message;
          if (maybeError) {
            resolve({ ok: false, error: { message: maybeError } });
            return;
          }
          resolve(res ?? { ok: true, data: null });
        });
      } catch (e) {
        resolve({ ok: false, error: { message: e instanceof Error ? e.message : 'Unknown error' } });
      }
    });
  }

  async function onCommand(envelope) {
    const extensionId = ($extId.value || '').trim();
    if (!extensionId) {
      setStatus('Missing extensionId', false);
      return;
    }
    if (!hasChromeRuntime()) {
      setStatus('Chrome runtime API not available (use Chrome + allow externally_connectable)', false);
      return;
    }

    const req = {
      type: 'driver',
      action: 'invoke',
      requestId: 'web-' + Date.now(),
      commandId: envelope.commandId,
      traceId: envelope.traceId,
      target: { tabId: envelope?.target?.tabId },
      jws: envelope.jws
    };

    log('forward -> extension', req);
    const res = await sendToExtension(extensionId, req);
    if (res && res.ok === false) {
      setStatus('forward failed: ' + (res.error?.message || 'unknown'), false);
      log('forward error', res);
    } else {
      setStatus('forward ok (accepted)', true);
      log('forward response', res);
    }
  }

  function connect() {
    disconnect();
    const extensionId = ($extId.value || '').trim();
    if (!extensionId) {
      setStatus('Missing extensionId', false);
      return;
    }
    const url = '/control/stream?extensionId=' + encodeURIComponent(extensionId);
    es = new EventSource(url);
    setStatus('connecting SSE...', true);

    es.addEventListener('ready', () => {
      setStatus('SSE connected', true);
      log('sse ready');
    });
    es.addEventListener('command', (ev) => {
      try {
        const envelope = JSON.parse(ev.data);
        log('sse command', envelope);
        void onCommand(envelope);
      } catch (e) {
        setStatus('bad command payload: ' + (e instanceof Error ? e.message : 'unknown'), false);
      }
    });
    es.onerror = () => {
      setStatus('SSE error (will auto-retry)', false);
    };
  }

  async function testEnqueue() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) {
      setStatus('Missing extensionId', false);
      return;
    }
    if (!replyUrl) {
      setStatus('Missing replyUrl (set CONTROL_REPLY_URL or fill input)', false);
      return;
    }
    const body = {
      extensionId,
      ttlMs: 30000,
      op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } },
      replyUrl
    };
    const res = await fetch('/control/enqueue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    log('enqueue response', data);
    if (!data.ok) setStatus('enqueue failed: ' + (data.error || 'unknown'), false);
    else setStatus('enqueue ok: ' + data.commandId, true);
  }

  $btnConnect.addEventListener('click', connect);
  $btnDisconnect.addEventListener('click', disconnect);
  $btnTestEnqueue.addEventListener('click', () => void testEnqueue());

  load();
</script>
`
})


