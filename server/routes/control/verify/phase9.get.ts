import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 9 Verify</title>
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

<h1>Phase 9 可控执行闭环（Confirm + Audit + Replay）一键验收</h1>
<div class="meta">
  本页会自动：createTab 打开 <code>/test-stagehand.html</code> → 连接 SSE(/control/stream) → enable domains →\n
  1) 低风险 click（不确认）\n
  2) 高风险 type（会弹出系统通知；你点 Approve/Reject，本页自动轮询重试）\n
  3) 生成 audit JSONL + before/after 截图，并给出 replay/export 链接。
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
  const $status = document.getElementById('status');
  const $results = document.getElementById('results');
  const $detail = document.getElementById('detail');
  const $btnRunAll = document.getElementById('btnRunAll');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyPhase9.extensionId';
  const LS_REPLY = 'control.verifyPhase9.replyUrl';

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
            requestId: 'phase9-forward-' + Date.now(),
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
    const requestId = 'phase9-create-' + Date.now();
    // For Phase9 we prefer reliability, so active:true.
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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  function rid(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2, 10); }

  async function runAll() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    resetUi();
    setStatus('connecting SSE…', true);

    const sse = await connectSse(extensionId);
    if (!sse.ok) {
      setDetail({ sse });
      return setStatus('SSE connect failed', false);
    }

    setStatus('creating target tab /test-stagehand.html…', true);
    const targetUrl = window.location.origin + '/test-stagehand.html';
    const target = await createTab(extensionId, targetUrl);
    if (!target?.ok || typeof target.tabId !== 'number') {
      setDetail({ target });
      return setStatus('createTab failed', false);
    }
    const tabId = target.tabId;
    addResult('createTab + navigate', true, 'tabId=' + tabId + ', url=' + targetUrl);

    setStatus('enable domains + wait load…', true);
    const plan = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'enable_runtime', op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
      { name: 'enable_dom', op: { kind: 'cdp.send', method: 'DOM.enable', params: {} } },
      { name: 'enable_network', op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
      { name: 'navigate', op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: targetUrl } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 800 } }
    ]);
    addResult('preflight /control/run', Boolean(plan?.ok), plan?.ok ? 'ok' : ('failed: ' + JSON.stringify(plan)));

    const taskId = rid('tsk9');
    const replayUrl = window.location.origin + '/control/replay/' + taskId;
    const exportUrl = window.location.origin + '/control/export/' + taskId;
    addResult('task created', true, 'taskId=' + taskId + '\\nreplay=' + replayUrl + '\\nexport=' + exportUrl);

    setStatus('Scenario 1: low risk click (no confirm)…', true);
    const a1 = rid('a1_low');
    const s1 = await postJson('/control/act2', {
      extensionId,
      tabId,
      replyUrl,
      taskId,
      actionId: a1,
      action: 'click.selector',
      selector: '#btn',
      risk: 'low',
      requiresConfirmation: false,
      reason: 'phase9 one-click low risk click'
    });
    addResult('s1 low risk click (no confirm)', s1?.ok === true, s1?.ok ? 'ok' : ('error=' + JSON.stringify(s1?.error)));

    setStatus('Scenario 2: high risk type (requires confirm)…', true);
    const a2 = rid('a2_high');
    const first = await postJson('/control/act2', {
      extensionId,
      tabId,
      replyUrl,
      taskId,
      actionId: a2,
      action: 'type.selector',
      selector: '#input',
      text: 'phase9-confirm',
      risk: 'high',
      requiresConfirmation: true,
      reason: 'phase9 one-click high risk type'
    });

    const needsConfirm = first?.ok === false && first?.error?.code === 'CONFIRMATION_REQUIRED';
    addResult('s2 first attempt should require confirmation', needsConfirm, needsConfirm ? 'CONFIRMATION_REQUIRED ✅（请在系统通知中点击 Approve/Reject）' : ('first=' + JSON.stringify(first)));

    let second = null;
    if (needsConfirm) {
      setStatus('等待你在系统通知中 Approve/Reject…（最长 60s，自动重试）', true);
      const started = Date.now();
      while (Date.now() - started < 60_000) {
        await new Promise(r => setTimeout(r, 1000));
        second = await postJson('/control/act2', {
          extensionId,
          tabId,
          replyUrl,
          taskId,
          actionId: a2,
          action: 'type.selector',
          selector: '#input',
          text: 'phase9-confirm',
          risk: 'high',
          requiresConfirmation: true,
          reason: 'phase9 one-click high risk type (retry)'
        });
        if (second?.ok === true) break;
        if (second?.ok === false && second?.error?.code === 'CONFIRMATION_REJECTED') break;
      }
      const pass = second?.ok === true;
      addResult('s2 approved -> retry success', pass, pass ? 'ok' : ('second=' + JSON.stringify(second)));
    }

    setDetail({ taskId, replayUrl, exportUrl, tabId, s1, first, second, plan });
    setStatus('done. 打开 replay/export 检查证据链。', true);
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  load();
</script>`
})


