import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 6 Verify</title>
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

<h1>Phase 6 Stagehand act/extract/observe 自动验证</h1>
<div class="meta">
  本页会：createTab → 连接 SSE(/control/stream) 并 forward command 到扩展 → enable domains →
  navigate 到 /test-stagehand.html → 跑 act/extract/observe + 错误处理验收项。
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
    <button id="btnSingle">Run Single Step</button>
    <select id="singleStep">
      <option value="evaluate">evaluate</option>
      <option value="navigate">navigate</option>
      <option value="click">click</option>
      <option value="type">type</option>
      <option value="extract">extract</option>
      <option value="observe">observe</option>
      <option value="error">error-handling</option>
    </select>
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
  const $btnSingle = document.getElementById('btnSingle');
  const $singleStep = document.getElementById('singleStep');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyPhase6.extensionId';
  const LS_REPLY = 'control.verifyPhase6.replyUrl';

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
        console.log('[phase6] sendToExtension:', msg);
        window.chrome.runtime.sendMessage(extensionId, msg, (resp) => {
          const err = window.chrome.runtime.lastError;
          console.log('[phase6] response:', resp, 'error:', err);
          if (err) return resolve({ ok: false, error: { message: err.message, name: 'ChromeRuntimeError' } });
          resolve(resp || { ok: false, error: { message: 'No response', name: 'NoResponse' } });
        });
      } catch (e) {
        console.error('[phase6] sendToExtension exception:', e);
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
            requestId: 'phase6-forward-' + Date.now(),
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
    const requestId = 'phase6-create-' + Date.now();
    // 输入/点击等操作更稳定：创建 active tab
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: 'about:blank', active: true });
    if (!tabResp?.ok || typeof tabResp.tabId !== 'number') return { ok: false, tabResp };
    const tabId = tabResp.tabId;
    return { ok: true, tabId, tabUrl: tabResp.tabUrl, tabTitle: tabResp.tabTitle, tabResp };
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

  const CLICK_BTN = { x: 160, y: 142 };
  const CLICK_INPUT = { x: 210, y: 209 };
  const TEST_URL = () => location.origin + '/test-stagehand.html';

  async function ensureReady(extensionId, replyUrl, tabId) {
    // enable common domains once
    const run = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'enable_network', tabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
      { name: 'enable_runtime', tabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
      { name: 'enable_dom', tabId, op: { kind: 'cdp.send', method: 'DOM.enable', params: {} } },
      { name: 'enable_a11y', tabId, op: { kind: 'cdp.send', method: 'Accessibility.enable', params: {} } }
    ]);
    return run;
  }

  async function stepNavigate(extensionId, tabId, replyUrl) {
    const url = TEST_URL();
    const act = await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'navigate', url, waitForLoad: true });
    const href = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'expression', expression: 'location.href' });
    const pass = Boolean(act?.ok) && Boolean(href?.ok) && String(href?.result || '').includes('/test-stagehand.html');
    const details = 'navigate ok=' + act?.ok + ', href=' + JSON.stringify(href?.result);
    addResult('navigate 成功导航到 /test-stagehand.html', pass, details);
    return { pass, act, href };
  }

  async function stepEvaluate(extensionId, tabId, replyUrl) {
    const evalRes = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'expression', expression: '1+1' });
    const pass = Boolean(evalRes?.ok) && evalRes?.result === 2;
    const details = 'result=' + JSON.stringify(evalRes?.result);
    addResult('evaluate 返回正确结果 (1+1===2)', pass, details);
    return { pass, evalRes };
  }

  async function stepExtract(extensionId, tabId, replyUrl) {
    const sel = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'selector', selector: '#title', attribute: 'textContent' });
    const pass = Boolean(sel?.ok) && String(sel?.result || '').includes('Stagehand Fixed Layout Test');
    const details = 'selector #title.textContent=' + JSON.stringify(sel?.result);
    addResult('extract(selector) 返回正确数据', pass, details);
    return { pass, sel };
  }

  async function stepClick(extensionId, tabId, replyUrl) {
    const click = await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'click', x: CLICK_BTN.x, y: CLICK_BTN.y });
    // give DOM a tick
    await new Promise(r => setTimeout(r, 150));
    const status = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'selector', selector: '#clickStatus', attribute: 'textContent' });
    const pass = Boolean(click?.ok) && Boolean(status?.ok) && String(status?.result || '').includes('clicked');
    const details = 'click ok=' + click?.ok + ', clickStatus=' + JSON.stringify(status?.result);
    addResult('click 坐标点击按钮生效', pass, details);
    return { pass, click, status };
  }

  async function stepType(extensionId, tabId, replyUrl) {
    // 强制聚焦输入框（避免后台 tab/焦点问题）
    const focus = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'expression', expression: "document.querySelector('#input')?.focus(); true" });
    const clickInput = await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'click', x: CLICK_INPUT.x, y: CLICK_INPUT.y });
    const text = 'Hello Stagehand';
    const type = await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'type', text });
    await new Promise(r => setTimeout(r, 150));
    const value = await postJson('/control/extract', { extensionId, tabId, replyUrl, mode: 'expression', expression: "document.querySelector('#input')?.value" });
    const pass = Boolean(type?.ok) && Boolean(value?.ok) && value?.result === text;
    const details = 'focus ok=' + focus?.ok + ', clickInput ok=' + clickInput?.ok + ', value=' + JSON.stringify(value?.result);
    addResult('type 成功输入文本', pass, details);
    return { pass, focus, clickInput, type, value };
  }

  async function stepObserve(extensionId, tabId, replyUrl) {
    const obs = await postJson('/control/observe', { extensionId, tabId, replyUrl, include: ['document', 'screenshot'], depth: 1 });
    const docOk = Boolean(obs?.ok) && Boolean(obs?.result?.document);
    const shot = obs?.result?.screenshot;
    const shotOk = typeof shot === 'string' && shot.length > 100;
    const pass = docOk && shotOk;
    const details = 'document=' + (docOk ? 'ok' : 'missing') + ', screenshotLen=' + (typeof shot === 'string' ? shot.length : 0);
    addResult('observe 返回 document + screenshot', pass, details);
    return { pass, obs };
  }

  async function stepError(extensionId, tabId, replyUrl) {
    const bad = await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'click' });
    const pass = Boolean(bad) && bad.ok === false;
    const details = 'response=' + JSON.stringify(bad);
    addResult('错误处理正确（缺参返回 ok:false）', pass, details);
    return { pass, bad };
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
      if (!sse.ok) { setDetail({ tabId, target, sse }); return setStatus('SSE connect failed', false); }

      setStatus('Step 3: enable domains...', true);
      const enableRun = await ensureReady(extensionId, replyUrl, tabId);

      setStatus('Step 4: run checks...', true);
      // Ensure on test page first
      const nav = await stepNavigate(extensionId, tabId, replyUrl);
      const evalRes = await stepEvaluate(extensionId, tabId, replyUrl);
      const ext = await stepExtract(extensionId, tabId, replyUrl);
      const clk = await stepClick(extensionId, tabId, replyUrl);
      const typ = await stepType(extensionId, tabId, replyUrl);
      const obs = await stepObserve(extensionId, tabId, replyUrl);
      const err = await stepError(extensionId, tabId, replyUrl);

      const results = { nav, eval: evalRes, extract: ext, click: clk, type: typ, observe: obs, error: err };
      const allPass = Object.values(results).every(r => r?.pass);
      setStatus(allPass ? '✅ All PASS' : '❌ Some FAIL', allPass);
      setDetail({ tabId, sse, enableRun, results });
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function runSingle() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    const which = String($singleStep.value || '');
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    resetUi();
    try {
      const target = await createTargetTab(extensionId);
      if (!target.ok) { setDetail(target); return setStatus('createTab failed', false); }
      const { tabId } = target;

      const sse = await connectSse(extensionId);
      if (!sse.ok) { setDetail({ tabId, target, sse }); return setStatus('SSE connect failed', false); }

      const enableRun = await ensureReady(extensionId, replyUrl, tabId);
      // navigate once unless running navigate itself
      if (which !== 'navigate') await stepNavigate(extensionId, tabId, replyUrl);

      let out = null;
      if (which === 'evaluate') out = await stepEvaluate(extensionId, tabId, replyUrl);
      else if (which === 'navigate') out = await stepNavigate(extensionId, tabId, replyUrl);
      else if (which === 'click') out = await stepClick(extensionId, tabId, replyUrl);
      else if (which === 'type') out = await stepType(extensionId, tabId, replyUrl);
      else if (which === 'extract') out = await stepExtract(extensionId, tabId, replyUrl);
      else if (which === 'observe') out = await stepObserve(extensionId, tabId, replyUrl);
      else if (which === 'error') out = await stepError(extensionId, tabId, replyUrl);

      setStatus(out?.pass ? '✅ PASS' : '❌ FAIL', Boolean(out?.pass));
      setDetail({ tabId, sse, enableRun, out });
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  $btnSingle.addEventListener('click', () => void runSingle());
  load();
</script>
`
})




