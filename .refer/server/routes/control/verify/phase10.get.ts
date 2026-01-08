import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 10 Verify</title>
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
  code { background:#f6f6f6; padding: 1px 6px; border-radius: 8px; }
</style>

<h1>Phase 10-B LLM 端到端（Plan → Act2 → Confirm → Audit）一键验收</h1>
<div class="meta">
  本页会自动：createTab 打开 <code>/test-stagehand.html</code> → 连接 SSE(/control/stream) → enable domains →\n
  1) 调用 <code>POST /control/plan</code>（由本地 Qwen3 生成动作计划）\n
  2) 逐步调用 <code>POST /control/act2</code> 执行 actions（复用 Phase9 的 Policy/Confirm/Audit/Replay/Export）\n
  3) 若触发确认，会弹系统通知 Approve/Reject，本页自动轮询重试。\n
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于 DriverAdapter 回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>goal</label>
    <input id="goal" placeholder="交给 LLM 的目标描述" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnRunAll">Run All (One Click)</button>
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
  const $goal = document.getElementById('goal');
  const $status = document.getElementById('status');
  const $results = document.getElementById('results');
  const $detail = document.getElementById('detail');
  const $btnRunAll = document.getElementById('btnRunAll');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyPhase10.extensionId';
  const LS_REPLY = 'control.verifyPhase10.replyUrl';
  const LS_GOAL = 'control.verifyPhase10.goal';

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
    $goal.value = (window.localStorage.getItem(LS_GOAL) || '点击按钮并在输入框输入 phase10-confirm').trim();
    if (!hasChromeRuntime()) setStatus('chrome.runtime missing（请在 Chrome + 扩展中打开）', false);
    else setStatus('ready', true);
  }
  $extId.addEventListener('input', () => window.localStorage.setItem(LS_EXT, ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem(LS_REPLY, ($replyUrl.value || '').trim()));
  $goal.addEventListener('input', () => window.localStorage.setItem(LS_GOAL, ($goal.value || '').trim()));

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
            requestId: 'phase10-forward-' + Date.now(),
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

  async function createTab(extensionId, url) {
    const requestId = 'phase10-create-' + Date.now();
    return await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url, active: true });
  }

  async function runPlan(extensionId, replyUrl, tabId, steps) {
    const runRes = await fetch('/control/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ extensionId, replyUrl, keepAttached: true, defaultTtlMs: 30000, steps: steps.map(s => ({ ...s, tabId })) })
    });
    return await runRes.json();
  }

  async function postJson(url, body) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json();
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    return await res.json();
  }

  async function fetchArrayBuffer(url) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return { ok: res.ok, status: res.status, contentType: res.headers.get('content-type') || '', size: buf.byteLength };
  }

  async function runAll() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    const goal = ($goal.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!goal) return setStatus('Missing goal', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    resetUi();
    setStatus('connecting SSE…', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) { setDetail({ sse }); return setStatus('SSE connect failed', false); }

    setStatus('creating target tab /test-stagehand.html…', true);
    const targetUrl = window.location.origin + '/test-stagehand.html';
    const target = await createTab(extensionId, targetUrl);
    if (!target?.ok || typeof target.tabId !== 'number') { setDetail({ target }); return setStatus('createTab failed', false); }
    const tabId = target.tabId;
    addResult('createTab + navigate', true, 'tabId=' + tabId + ', url=' + targetUrl);

    setStatus('enable domains + wait load…', true);
    const planRun = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'enable_runtime', op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
      { name: 'enable_dom', op: { kind: 'cdp.send', method: 'DOM.enable', params: {} } },
      { name: 'enable_network', op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
      { name: 'navigate', op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: targetUrl } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 800 } }
    ]);
    addResult('preflight /control/run', Boolean(planRun?.ok), planRun?.ok ? 'ok' : ('failed: ' + JSON.stringify(planRun)));

    setStatus('calling /control/plan (LLM)…', true);
    const plan = await postJson('/control/plan', { goal, page: { url: targetUrl, title: 'test-stagehand' } });
    const okPlan = plan?.ok === true && typeof plan?.taskId === 'string' && Array.isArray(plan?.actions);
    addResult('plan generated', okPlan, okPlan ? ('taskId=' + plan.taskId + ', actions=' + plan.actions.length) : JSON.stringify(plan));
    if (!okPlan) { setDetail({ plan, planRun, tabId }); return setStatus('plan failed', false); }

    const taskId = plan.taskId;
    const replayUrl = window.location.origin + '/control/replay/' + taskId;
    const exportUrl = window.location.origin + '/control/export/' + taskId;

    let executed = [];
    for (const a of plan.actions) {
      const actionId = a.actionId || ('a_' + Date.now());
      const req = { extensionId, tabId, replyUrl, taskId, actionId, action: a.action, selector: a.selector, frameSelector: a.frameSelector, text: a.text, wait: a.wait };
      setStatus('execute act2: ' + a.action + '…', true);
      let res = await postJson('/control/act2', req);
      if (res?.ok === false && res?.error?.code === 'CONFIRMATION_REQUIRED') {
        addResult('confirm required: ' + a.action, true, '请在系统通知中 Approve/Reject，页面将自动重试（60s）');
        const started = Date.now();
        while (Date.now() - started < 60_000) {
          await new Promise(r => setTimeout(r, 1000));
          res = await postJson('/control/act2', req);
          if (res?.ok === true) break;
          if (res?.ok === false && res?.error?.code === 'CONFIRMATION_REJECTED') break;
        }
      }
      const pass = res?.ok === true;
      addResult('act2: ' + a.action, pass, pass ? 'ok' : JSON.stringify(res));
      executed.push({ req, res });
      if (!pass) break;
    }

    // Auto assertions for audit artifacts (Phase9-C)
    try {
      const exp = await fetchJson(exportUrl + '?format=json');
      const okJson = exp?.ok === true && typeof exp?.count === 'number' && exp.count >= 1;
      addResult('assert export?format=json count>=1', okJson, okJson ? ('count=' + exp.count) : JSON.stringify(exp));

      const zipCheck = await fetchArrayBuffer(exportUrl);
      const okZip = zipCheck.ok && zipCheck.size > 200 && (zipCheck.contentType.includes('zip') || zipCheck.contentType.includes('application/zip'));
      addResult('assert export zip downloadable', okZip, JSON.stringify(zipCheck));
    } catch (e) {
      addResult('assert audit artifacts', false, e instanceof Error ? e.message : String(e));
    }

    setDetail({ tabId, goal, plan, executed, replayUrl, exportUrl, planRun });
    setStatus('done. 打开 replay/export 检查证据链。', true);
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  load();
</script>`
})


