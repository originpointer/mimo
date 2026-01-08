import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 8 Verify</title>
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

<h1>Phase 8 后台（不打扰）可信点击/输入 自动验证</h1>
<div class="meta">
  验证口径：不切 tab、不 bringToFront、不抢焦点；输入使用 CDP Input。\n
  运行方式：点击 Run All 后，请在 2 秒内切换到你要“继续正常使用”的页面；随后验证会在后台 tab 执行。\n
  判定：active tabId 不变 + 目标页 document.hasFocus() === false + click/type 生效。
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

  const LS_EXT = 'control.verifyPhase8.extensionId';
  const LS_REPLY = 'control.verifyPhase8.replyUrl';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setDetail(obj) { $detail.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  function resetUi() { $results.innerHTML = ''; $detail.textContent = ''; }

  const LS_STATE = 'control.verifyPhase8.lastState';
  function saveState(partial) {
    try {
      const prev = JSON.parse(window.localStorage.getItem(LS_STATE) || 'null') || {};
      const next = { ...prev, ...partial, savedAt: Date.now() };
      window.localStorage.setItem(LS_STATE, JSON.stringify(next));
    } catch {}
  }
  function loadState() {
    try { return JSON.parse(window.localStorage.getItem(LS_STATE) || 'null'); } catch { return null; }
  }

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
    saveState({ lastResultsHtml: $results.innerHTML });
  }

  function load() {
    $extId.value = (window.localStorage.getItem(LS_EXT) || defaultExt || '').trim();
    $replyUrl.value = (window.localStorage.getItem(LS_REPLY) || defaultReply || '').trim();
    if (!hasChromeRuntime()) setStatus('chrome.runtime missing（请在 Chrome + 扩展中打开）', false);
    else setStatus('ready', true);

    // Restore last run (useful if the tab was in background during run).
    const st = loadState();
    if (st?.lastResultsHtml && !$results.innerHTML) {
      $results.innerHTML = st.lastResultsHtml;
    }
    if (st?.lastDetail && !$detail.textContent) {
      $detail.textContent = st.lastDetail;
    }
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
            requestId: 'phase8-forward-' + Date.now(),
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

  async function getFocusedActiveTab(extensionId) {
    const requestId = 'phase8-active-' + Date.now();
    return await sendToExtension(extensionId, { type: 'driver', action: 'getFocusedActiveTab', requestId });
  }

  async function createBackgroundTab(extensionId, url) {
    const requestId = 'phase8-create-' + Date.now();
    return await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: url || 'about:blank', active: false });
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

  async function assertUserTabUnchanged(extensionId, expectedTabId, label) {
    const cur = await getFocusedActiveTab(extensionId);
    const ok = cur?.ok && typeof cur.tabId === 'number' && cur.tabId === expectedTabId;
    addResult('active tab unchanged: ' + label, ok, 'expected=' + expectedTabId + ', got=' + (cur?.tabId ?? null));
    return { ok, cur };
  }

  async function runAll() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    resetUi();
    saveState({ running: true, startedAt: Date.now(), lastResultsHtml: '', lastDetail: '' });
    try {
      // Preflight: ensure extension supports strict active tab API (requires extension reload after update).
      const preflight = await getFocusedActiveTab(extensionId);
      if (!preflight?.ok) {
        const msg = 'getFocusedActiveTab unsupported. 请在 chrome://extensions 里 Reload 扩展后重试。';
        setStatus(msg, false);
        setDetail({ preflight });
        saveState({ running: false, lastDetail: JSON.stringify({ preflight }, null, 2) });
        return;
      }

      // Ask user to switch away, then sample true active tab.
      setStatus('请在 2 秒内切换到你要继续正常使用的页面（不要停留在本 verify 页）…', true);
      await new Promise(r => setTimeout(r, 2000));

      const userTab0 = await getFocusedActiveTab(extensionId);
      if (!userTab0?.ok || typeof userTab0.tabId !== 'number') {
        setDetail({ userTab0 });
        saveState({ running: false, lastDetail: JSON.stringify({ userTab0 }, null, 2) });
        return setStatus('getFocusedActiveTab failed', false);
      }
      const userTabId0 = userTab0.tabId;
      addResult('baseline user active tab captured', true, 'userTabId0=' + userTabId0);
      const activeSamples = [{ label: 'baseline', expected: userTabId0, got: userTabId0, ok: true }];

      // Create background target tab (must NOT steal focus)
      setStatus('creating background target tab (active:false)…', true);
      const target = await createBackgroundTab(extensionId, 'about:blank');
      if (!target?.ok || typeof target.tabId !== 'number') {
        setDetail({ target });
        saveState({ running: false, lastDetail: JSON.stringify({ target }, null, 2) });
        return setStatus('createTab(active:false) failed', false);
      }
      const targetTabId = target.tabId;
      addResult('create background tab (active:false)', true, 'targetTabId=' + targetTabId);

      // Ensure user tab unchanged after creating background tab
      {
        const s = await assertUserTabUnchanged(extensionId, userTabId0, 'after createTab');
        activeSamples.push({ label: 'after createTab', expected: userTabId0, got: s?.cur?.tabId ?? null, ok: s.ok });
      }

      // Connect SSE (this page may be background; should still work)
      setStatus('connect SSE…', true);
      const sse = await connectSse(extensionId);
      if (!sse.ok) {
        setDetail({ sse });
        saveState({ running: false, lastDetail: JSON.stringify({ sse }, null, 2) });
        return setStatus('SSE connect failed', false);
      }

      // Enable domains on target tab and navigate to test page
      setStatus('enable domains + navigate target tab…', true);
      const enableRun = await runPlan(extensionId, replyUrl, targetTabId, [
        { name: 'enable_page', tabId: targetTabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
        { name: 'enable_network', tabId: targetTabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
        { name: 'enable_runtime', tabId: targetTabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
        { name: 'enable_dom', tabId: targetTabId, op: { kind: 'cdp.send', method: 'DOM.enable', params: {} } },
        { name: 'navigate', tabId: targetTabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: location.origin + '/test-stagehand.html' } } },
        { name: 'wait', op: { kind: 'wait.fixed', durationMs: 1200 } }
      ]);

      await assertUserTabUnchanged(extensionId, userTabId0, 'after navigate');
      {
        const s = await assertUserTabUnchanged(extensionId, userTabId0, 'after navigate');
        activeSamples.push({ label: 'after navigate', expected: userTabId0, got: s?.cur?.tabId ?? null, ok: s.ok });
      }

      // Background click/type using act2 (CDP Input). Use wait=stable to be safe.
      setStatus('background click/type via /control/act2…', true);
      const click = await postJson('/control/act2', { extensionId, tabId: targetTabId, replyUrl, action: 'click.selector', selector: '#btn', wait: 'stable' });
      await new Promise(r => setTimeout(r, 120));
      const clickStatus = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'selector', selector: '#clickStatus', attribute: 'textContent' });
      const passClick = Boolean(click?.ok) && Boolean(clickStatus?.ok) && String(clickStatus?.result || '').includes('clicked');
      addResult('background click.selector changes #clickStatus', passClick, 'status=' + JSON.stringify(clickStatus?.result));

      {
        const s = await assertUserTabUnchanged(extensionId, userTabId0, 'after click');
        activeSamples.push({ label: 'after click', expected: userTabId0, got: s?.cur?.tabId ?? null, ok: s.ok });
      }

      const type = await postJson('/control/act2', { extensionId, tabId: targetTabId, replyUrl, action: 'type.selector', selector: '#input', text: 'Hello Background', wait: 'stable' });
      const value = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'expression', expression: "document.querySelector('#input')?.value" });
      const passType = Boolean(type?.ok) && Boolean(value?.ok) && value?.result === 'Hello Background';
      addResult('background type.selector changes #input.value', passType, 'value=' + JSON.stringify(value?.result));

      {
        const s = await assertUserTabUnchanged(extensionId, userTabId0, 'after type');
        activeSamples.push({ label: 'after type', expected: userTabId0, got: s?.cur?.tabId ?? null, ok: s.ok });
      }

      // Background-ness check: visibilityState/hidden are more meaningful than document.hasFocus(),
      // because scripts may set focus inside a background document without stealing the user's active tab.
      const visibility = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'expression', expression: "document.visibilityState" });
      const hidden = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'expression', expression: "document.hidden" });
      const passBg = Boolean(visibility?.ok) && visibility?.result === 'hidden' && Boolean(hidden?.ok) && hidden?.result === true;
      addResult('background tab visibilityState=hidden && hidden=true', passBg, 'visibility=' + JSON.stringify(visibility?.result) + ', hidden=' + JSON.stringify(hidden?.result));

      // Keep document.hasFocus() as informational.
      const hasFocus = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'expression', expression: "document.hasFocus()" });
      addResult('(info) document.hasFocus()', true, 'hasFocus=' + JSON.stringify(hasFocus?.result));

      // Optional: key event counter (document-level keydown). Likely fails in true background; keep as informational.
      setStatus('optional: keydown in background (may be blocked by Chrome)…', true);
      const keyBefore = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'selector', selector: '#keyStatus', attribute: 'textContent' });
      const pressA = await postJson('/control/act', { extensionId, tabId: targetTabId, replyUrl, action: 'press', key: 'a' });
      await new Promise(r => setTimeout(r, 150));
      const keyAfter = await postJson('/control/extract', { extensionId, tabId: targetTabId, replyUrl, mode: 'selector', selector: '#keyStatus', attribute: 'textContent' });
      const passKey = Boolean(pressA?.ok) && String(keyBefore?.result || '') !== String(keyAfter?.result || '');
      addResult('(optional) background keydown counter changed', passKey, 'before=' + JSON.stringify(keyBefore?.result) + ', after=' + JSON.stringify(keyAfter?.result));

      const activeAllOk = activeSamples.every(s => s.ok);
      const allPass = passClick && passType && passBg && activeAllOk;
      setStatus(allPass ? '✅ PASS (no disturbance + trusted input works in background tab)' : '❌ FAIL (see results)', allPass);
      const detailObj = { userTab0, activeSamples, target, sse, enableRun, click, clickStatus, type, value, visibility, hidden, hasFocus, keyBefore, pressA, keyAfter };
      setDetail(detailObj);
      saveState({ running: false, lastDetail: JSON.stringify(detailObj, null, 2), finishedAt: Date.now(), ok: allPass });
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      const detailObj = { error: e instanceof Error ? e.message : String(e) };
      setDetail(detailObj);
      saveState({ running: false, lastDetail: JSON.stringify(detailObj, null, 2), finishedAt: Date.now(), ok: false });
    }
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  load();
</script>
`
})


