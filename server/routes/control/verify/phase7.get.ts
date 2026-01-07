import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 7 Verify</title>
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
  .scenario { border-left: 3px solid #ddd; padding-left: 12px; margin-top: 14px; }
  .scenario.pass { border-left-color: #0a7a33; }
  .scenario.fail { border-left-color: #b00020; }
  .scenario h3 { margin: 0 0 6px 0; font-size: 15px; }
  .scenario-content { font-size: 13px; color: #666; }
</style>

<h1>Phase 7 确定性语义 Act（DOM→坐标→输入）自动验证</h1>
<div class="meta">
  本页会：createTab → 连接 SSE(/control/stream) → enable domains →\n
  1) 在 /test-stagehand.html 用 /control/act2 做 click.selector/type.selector\n
  2) 在 /test-stagehand-same-origin-iframe.html 用 /control/act2 做 click/type.iframeSelector（不依赖 child sessionId）\n
  3) 校验 wait=stable 不回归\n
  4) 校验错误处理（缺参 / 选择器找不到）。
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于 /control/run 与 DriverAdapter 回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnRunAll">Run All</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">Results</div>
  <div id="results"></div>
</div>

<div class="box">
  <div class="meta">Detailed Output</div>
  <pre id="detail"></pre>
</div>

<script>
  const $extId = document.getElementById('extId');
  const $replyUrl = document.getElementById('replyUrl');
  const $status = document.getElementById('status');
  const $results = document.getElementById('results');
  const $detail = document.getElementById('detail');
  const $btnRunAll = document.getElementById('btnRunAll');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyPhase7.extensionId';
  const LS_REPLY = 'control.verifyPhase7.replyUrl';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setDetail(obj) { $detail.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  function resetUi() { $results.innerHTML = ''; $detail.textContent = ''; }

  function addResult(title, pass, details) {
    const div = document.createElement('div');
    div.className = 'scenario ' + (pass ? 'pass' : 'fail');
    const h3 = document.createElement('h3');
    h3.textContent = (pass ? '✅ ' : '❌ ') + title;
    const content = document.createElement('div');
    content.className = 'scenario-content';
    content.textContent = details || '';
    div.appendChild(h3);
    div.appendChild(content);
    $results.appendChild(div);
  }

  function load() {
    $extId.value = (window.localStorage.getItem(LS_EXT) || defaultExt || '').trim();
    $replyUrl.value = (window.localStorage.getItem(LS_REPLY) || defaultReply || '').trim();
    if (!hasChromeRuntime()) setStatus('chrome.runtime missing（请在 Chrome + 扩展中打开）', false);
    else setStatus('ready', true);
  }
  $extId.addEventListener('input', () => window.localStorage.setItem(LS_EXT, ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem(LS_REPLY, ($replyUrl.value || '').trim()));

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
            requestId: 'phase7-forward-' + Date.now(),
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

  async function createTargetTab(extensionId) {
    const requestId = 'phase7-create-' + Date.now();
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: 'about:blank', active: true });
    if (!tabResp?.ok || typeof tabResp.tabId !== 'number') return { ok: false, tabResp };
    const tabId = tabResp.tabId;
    return { ok: true, tabId, tabResp };
  }

  async function runPlan(extensionId, replyUrl, tabId, steps) {
    const runRes = await fetch('/control/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ extensionId, replyUrl, keepAttached: true, defaultTtlMs: 30000, steps })
    });
    return await runRes.json();
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  const URL_STAGEHAND = () => location.origin + '/test-stagehand.html';
  const URL_IFRAME = () => location.origin + '/test-stagehand-same-origin-iframe.html';

  async function ensureReady(extensionId, replyUrl, tabId) {
    return await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'enable_network', tabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
      { name: 'enable_runtime', tabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
      { name: 'enable_dom', tabId, op: { kind: 'cdp.send', method: 'DOM.enable', params: {} } }
    ]);
  }

  async function navTo(url, extensionId, replyUrl, tabId) {
    return await runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 1000 } }
    ]);
  }

  async function runAll() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    resetUi();
    try {
      setStatus('Step 1: createTab...', true);
      const target = await createTargetTab(extensionId);
      if (!target.ok) { setDetail(target); return setStatus('createTab failed', false); }
      const { tabId } = target;

      setStatus('Step 2: connect SSE...', true);
      const sse = await connectSse(extensionId);
      if (!sse.ok) { setDetail({ tabId, sse }); return setStatus('SSE connect failed', false); }

      setStatus('Step 3: enable domains...', true);
      const enableRun = await ensureReady(extensionId, replyUrl, tabId);

      // --- Same-document selector ---
      setStatus('Step 4: same-document selector actions...', true);
      const nav1 = await navTo(URL_STAGEHAND(), extensionId, replyUrl, tabId);

      const click1 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'click.selector', selector: '#btn', wait: 'stable' });
      const clickStatus1 = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'selector', selector: '#clickStatus', attribute: 'textContent' });
      const passClick1 = Boolean(click1?.ok) && Boolean(clickStatus1?.ok) && String(clickStatus1?.result || '').includes('clicked');
      addResult('same-document click.selector (#btn) -> #clickStatus', passClick1, 'status=' + JSON.stringify(clickStatus1?.result));

      const type1 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'type.selector', selector: '#input', text: 'Hello Stagehand', wait: 'stable' });
      const value1 = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'expression', expression: "document.querySelector('#input')?.value" });
      const passType1 = Boolean(type1?.ok) && Boolean(value1?.ok) && value1?.result === 'Hello Stagehand';
      addResult('same-document type.selector (#input) -> value', passType1, 'value=' + JSON.stringify(value1?.result));

      // --- Same-origin iframe selector fallback (no sessionId) ---
      setStatus('Step 5: same-origin iframe selector actions...', true);
      const nav2 = await navTo(URL_IFRAME(), extensionId, replyUrl, tabId);

      const click2 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'click.iframeSelector', frameSelector: 'iframe#inner', selector: '#btn', wait: 'stable' });
      const iframeClickStatus = await postJson('/control/extract', {
        extensionId, tabId, replyUrl, mode: 'expression',
        expression: "document.querySelector('iframe#inner')?.contentDocument?.querySelector('#clickStatus')?.textContent"
      });
      const passClick2 = Boolean(click2?.ok) && Boolean(iframeClickStatus?.ok) && String(iframeClickStatus?.result || '').includes('clicked');
      addResult('same-origin iframe click.iframeSelector (iframe#inner + #btn) -> inner #clickStatus', passClick2, 'status=' + JSON.stringify(iframeClickStatus?.result));

      const type2 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'type.iframeSelector', frameSelector: 'iframe#inner', selector: '#input', text: 'Hello Inner', wait: 'stable' });
      const iframeValue = await postJson('/control/extract', {
        extensionId, tabId, replyUrl, mode: 'expression',
        expression: "document.querySelector('iframe#inner')?.contentDocument?.querySelector('#input')?.value"
      });
      const passType2 = Boolean(type2?.ok) && Boolean(iframeValue?.ok) && iframeValue?.result === 'Hello Inner';
      addResult('same-origin iframe type.iframeSelector (iframe#inner + #input) -> inner value', passType2, 'value=' + JSON.stringify(iframeValue?.result));

      // --- Error handling ---
      setStatus('Step 6: error handling...', true);
      const bad1 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'click.selector' });
      const passBad1 = Boolean(bad1) && bad1.ok === false;
      addResult('error: missing selector returns ok:false', passBad1, JSON.stringify(bad1));

      const bad2 = await postJson('/control/act2', { extensionId, tabId, replyUrl, action: 'click.iframeSelector', frameSelector: 'iframe#not-exist', selector: '#btn' });
      const passBad2 = Boolean(bad2) && bad2.ok === false;
      addResult('error: iframe not found returns ok:false', passBad2, JSON.stringify(bad2));

      const results = { nav1, click1, clickStatus1, type1, value1, nav2, click2, iframeClickStatus, type2, iframeValue, bad1, bad2 };
      const allPass = passClick1 && passType1 && passClick2 && passType2 && passBad1 && passBad2;
      setStatus(allPass ? '✅ All PASS' : '❌ Some FAIL', allPass);
      setDetail({ tabId, sse, enableRun, results });
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  load();
</script>
`
})


