import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 4 Verify</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
  .row { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
  input { padding: 10px 12px; width: min(820px, 92vw); font-size: 14px; }
  button { padding: 10px 12px; font-size: 14px; cursor: pointer; }
  .meta { color:#555; margin-top: 8px; font-size: 12px; }
  .box { border: 1px solid #eee; border-radius: 12px; padding: 12px; margin-top: 12px; }
  pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
  .ok { color: #0a7a33; }
  .bad { color: #b00020; }
</style>
<h1>Phase 4 Frame/OOPIF 自动验证</h1>
<div class="meta">
  本页会：getActiveTab → 连接 SSE(/control/stream) 并 forward command 到扩展 → 导航到测试页 → autoAttach →
  获取 iframe sessionId → 在子 session 执行 DOM/Runtime 命令验证。
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于 /control/run 的回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>oopifSrc</label>
    <input id="oopifSrc" placeholder="跨域 iframe src（默认 https://example.com/）" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnScenario1">Scenario1: same-origin iframe</button>
    <button id="btnScenario2">Scenario2: cross-origin OOPIF</button>
    <button id="btnScenario3">Scenario3: nested iframes</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">Result</div>
  <pre id="result"></pre>
</div>

<script>
  const $extId = document.getElementById('extId');
  const $replyUrl = document.getElementById('replyUrl');
  const $oopifSrc = document.getElementById('oopifSrc');
  const $status = document.getElementById('status');
  const $result = document.getElementById('result');
  const $btnScenario1 = document.getElementById('btnScenario1');
  const $btnScenario2 = document.getElementById('btnScenario2');
  const $btnScenario3 = document.getElementById('btnScenario3');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};
  const defaultOopif = 'https://example.com/';

  const LS_EXT = 'control.verifyPhase4.extensionId';
  const LS_REPLY = 'control.verifyPhase4.replyUrl';
  const LS_OOPIF = 'control.verifyPhase4.oopifSrc';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setResult(obj) { $result.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }

  function load() {
    $extId.value = (window.localStorage.getItem(LS_EXT) || defaultExt || '').trim();
    $replyUrl.value = (window.localStorage.getItem(LS_REPLY) || defaultReply || '').trim();
    $oopifSrc.value = (window.localStorage.getItem(LS_OOPIF) || defaultOopif || '').trim();
    if (!hasChromeRuntime()) setStatus('chrome.runtime missing（请在 Chrome + 扩展中打开）', false);
    else setStatus('ready', true);
  }
  $extId.addEventListener('input', () => window.localStorage.setItem(LS_EXT, ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem(LS_REPLY, ($replyUrl.value || '').trim()));
  $oopifSrc.addEventListener('input', () => window.localStorage.setItem(LS_OOPIF, ($oopifSrc.value || '').trim()));

  async function sendToExtension(extensionId, msg) {
    return await new Promise((resolve) => {
      try {
        console.log('[phase4] sendToExtension:', msg);
        window.chrome.runtime.sendMessage(extensionId, msg, (resp) => {
          const err = window.chrome.runtime.lastError;
          console.log('[phase4] response:', resp, 'error:', err);
          if (err) return resolve({ ok: false, error: { message: err.message, name: 'ChromeRuntimeError' } });
          resolve(resp || { ok: false, error: { message: 'No response', name: 'NoResponse' } });
        });
      } catch (e) {
        console.error('[phase4] sendToExtension exception:', e);
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
            requestId: 'phase4-forward-' + Date.now(),
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

  async function clearEvents() { await fetch('/control/events?clear=1'); }
  async function queryEvents(qs) { const res = await fetch('/control/events?' + qs); return await res.json(); }
  async function querySessions(tabId, type) {
    const url = '/control/sessions?tabId=' + encodeURIComponent(String(tabId)) + (type ? '&type=' + encodeURIComponent(type) : '');
    const res = await fetch(url);
    return await res.json();
  }

  async function createTargetTab(extensionId) {
    const requestId = 'phase4-create-' + Date.now();
    // 创建新 tab（默认 about:blank），用于运行测试页面
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: 'about:blank', active: false });
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

  async function scenario1() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    setStatus('Step 1: createTab...', true);
    const target = await createTargetTab(extensionId);
    if (!target.ok) { setResult(target); return setStatus('createTab failed', false); }

    const { tabId, tabUrl, tabTitle } = target;
    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) { setResult({ tabId, tabUrl, tabTitle, sse }); return setStatus('SSE connect failed', false); }

    setStatus('Step 3: clear events...', true);
    await clearEvents();

    const url = location.origin + '/test-iframe.html';
    setStatus('Step 4: navigate + autoAttach...', true);
    const run = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'auto_attach', tabId, op: { kind: 'cdp.send', method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } } },
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 2500 } }
    ]);

    setStatus('Step 5: sessions + child ops...', true);
    const sessions = await querySessions(tabId, 'iframe');
    const sessionId = sessions?.sessions?.[0]?.sessionId;
    if (!sessionId) {
      const targetEvents = await queryEvents('method=Target.');
      setResult({ scenario: 1, url, tabId, tabUrl, tabTitle, sse, run, sessions, events: { targetEvents } });
      return setStatus('No iframe sessionId found', false);
    }

    const runChild = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'dom_enable', tabId, op: { kind: 'cdp.send', method: 'DOM.enable', params: {}, target: { sessionId } } },
      { name: 'dom_getDocument', tabId, op: { kind: 'cdp.send', method: 'DOM.getDocument', params: { depth: 0 }, target: { sessionId } } },
      { name: 'eval_href', tabId, op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: 'location.href', returnByValue: true }, target: { sessionId } } }
    ]);

    setResult({ scenario: 1, url, tabId, tabUrl, tabTitle, sse, run, sessions, sessionId, runChild });
    setStatus('done', true);
  }

  async function scenario2() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    const oopifSrc = ($oopifSrc.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!oopifSrc) return setStatus('Missing oopifSrc', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    setStatus('Step 1: createTab...', true);
    const target = await createTargetTab(extensionId);
    if (!target.ok) { setResult(target); return setStatus('createTab failed', false); }

    const { tabId, tabUrl, tabTitle } = target;
    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) { setResult({ tabId, tabUrl, tabTitle, sse }); return setStatus('SSE connect failed', false); }

    setStatus('Step 3: clear events...', true);
    await clearEvents();

    const url = location.origin + '/test-oopif.html?src=' + encodeURIComponent(oopifSrc);
    setStatus('Step 4: navigate + autoAttach...', true);
    const run = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'auto_attach', tabId, op: { kind: 'cdp.send', method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } } },
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 3000 } }
    ]);

    setStatus('Step 5: target events + session + child eval...', true);
    const targetAttached = await queryEvents('method=Target.attachedToTarget');
    const sessions = await querySessions(tabId, 'iframe');
    const sessionId = sessions?.sessions?.[0]?.sessionId;
    let runChild = null;
    if (sessionId) {
      runChild = await runPlan(extensionId, replyUrl, tabId, [
        { name: 'enable_runtime', tabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
        { name: 'eval_title', tabId, op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: 'document.title', returnByValue: true }, target: { sessionId } } }
      ]);
    }

    setResult({ scenario: 2, url, oopifSrc, tabId, tabUrl, tabTitle, sse, run, events: { targetAttached }, sessions, sessionId, runChild });
    setStatus('done', true);
  }

  async function scenario3() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    setStatus('Step 1: createTab...', true);
    const target = await createTargetTab(extensionId);
    if (!target.ok) { setResult(target); return setStatus('createTab failed', false); }

    const { tabId, tabUrl, tabTitle } = target;
    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) { setResult({ tabId, tabUrl, tabTitle, sse }); return setStatus('SSE connect failed', false); }

    setStatus('Step 3: clear events...', true);
    await clearEvents();

    const url = location.origin + '/test-nested.html';
    setStatus('Step 4: navigate + autoAttach...', true);
    const run = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'auto_attach', tabId, op: { kind: 'cdp.send', method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } } },
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 3000 } }
    ]);

    setStatus('Step 5: sessions + eval each session...', true);
    const sessions = await querySessions(tabId, 'iframe');
    const list = Array.isArray(sessions?.sessions) ? sessions.sessions : [];

    const evalResults = [];
    for (const s of list) {
      const sid = s?.sessionId;
      if (!sid) continue;
      const r = await runPlan(extensionId, replyUrl, tabId, [
        { name: 'eval_href', tabId, op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: 'location.href', returnByValue: true }, target: { sessionId: sid } } }
      ]);
      evalResults.push({ sessionId: sid, run: r });
    }

    setResult({ scenario: 3, url, tabId, tabUrl, tabTitle, sse, run, sessions, evalResults });
    setStatus('done', true);
  }

  $btnScenario1.addEventListener('click', () => void scenario1());
  $btnScenario2.addEventListener('click', () => void scenario2());
  $btnScenario3.addEventListener('click', () => void scenario3());
  load();
</script>
`
})


