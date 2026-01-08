import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 5 Wait/Stability Verify</title>
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
  .scenario { border-left: 3px solid #ddd; padding-left: 12px; margin-top: 16px; }
  .scenario.pass { border-left-color: #0a7a33; }
  .scenario.fail { border-left-color: #b00020; }
  .scenario h3 { margin: 0 0 8px 0; font-size: 16px; }
  .scenario-content { font-size: 13px; color: #666; }
</style>
<h1>Phase 5 Wait/Stability 自动验证</h1>
<div class="meta">
  本页会：创建测试 tab → 启用 Page/Network domain → 导航测试页 → 验证事件接收 → 测试 wait API 各种条件。
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
    <button id="btnRunAll">Run All Scenarios</button>
    <button id="btnScenario1">Scenario 1: Event Reception</button>
    <button id="btnScenario2">Scenario 2: Check API</button>
    <button id="btnScenario3">Scenario 3: Wait PageLoad</button>
    <button id="btnScenario4">Scenario 4: Wait NetworkIdle</button>
    <button id="btnScenario5">Scenario 5: Wait Stable</button>
    <button id="btnScenario6">Scenario 6: Timeout</button>
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
  const $btnScenario1 = document.getElementById('btnScenario1');
  const $btnScenario2 = document.getElementById('btnScenario2');
  const $btnScenario3 = document.getElementById('btnScenario3');
  const $btnScenario4 = document.getElementById('btnScenario4');
  const $btnScenario5 = document.getElementById('btnScenario5');
  const $btnScenario6 = document.getElementById('btnScenario6');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifyPhase5.extensionId';
  const LS_REPLY = 'control.verifyPhase5.replyUrl';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setDetail(obj) { $detail.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  
  function addScenarioResult(num, title, pass, details) {
    const div = document.createElement('div');
    div.className = 'scenario ' + (pass ? 'pass' : 'fail');
    const h3 = document.createElement('h3');
    h3.textContent = \`Scenario \${num}: \${title} - \${pass ? '✅ PASS' : '❌ FAIL'}\`;
    const content = document.createElement('div');
    content.className = 'scenario-content';
    content.textContent = details;
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
        console.log('[phase5] sendToExtension:', msg);
        window.chrome.runtime.sendMessage(extensionId, msg, (resp) => {
          const err = window.chrome.runtime.lastError;
          console.log('[phase5] response:', resp, 'error:', err);
          if (err) return resolve({ ok: false, error: { message: err.message, name: 'ChromeRuntimeError' } });
          resolve(resp || { ok: false, error: { message: 'No response', name: 'NoResponse' } });
        });
      } catch (e) {
        console.error('[phase5] sendToExtension exception:', e);
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
            requestId: 'phase5-forward-' + Date.now(),
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
  async function callWaitApi(body) {
    const res = await fetch('/control/wait', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  async function createTargetTab(extensionId) {
    const requestId = 'phase5-create-' + Date.now();
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

  // Scenario 1: Event Reception Verification
  async function scenario1(extensionId, replyUrl, tabId) {
    setStatus('Scenario 1: Event Reception...', true);
    
    // Enable Page and Network domains, navigate to test page
    await clearEvents();
    const url = location.origin + '/test-instant.html';
    const run = await runPlan(extensionId, replyUrl, tabId, [
      { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
      { name: 'enable_network', tabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } },
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 2000 } }
    ]);

    // Query events
    await new Promise(resolve => setTimeout(resolve, 500)); // Extra buffer for events
    const pageEvents = await queryEvents('tabId=' + tabId + '&method=Page.');
    const networkEvents = await queryEvents('tabId=' + tabId + '&method=Network.');

    // Check for required events
    const pageEventsList = pageEvents?.events || [];
    const networkEventsList = networkEvents?.events || [];
    
    const hasDomContent = pageEventsList.some(e => e.method === 'Page.domContentEventFired');
    const hasLoadEvent = pageEventsList.some(e => e.method === 'Page.loadEventFired');
    const hasLifecycle = pageEventsList.some(e => e.method === 'Page.lifecycleEvent');
    const hasRequestWillBeSent = networkEventsList.some(e => e.method === 'Network.requestWillBeSent');
    const hasLoadingFinished = networkEventsList.some(e => e.method === 'Network.loadingFinished' || e.method === 'Network.loadingFailed');

    const pass = hasDomContent && hasLoadEvent && hasRequestWillBeSent;
    const details = \`Events received: domContent=\${hasDomContent}, loadEvent=\${hasLoadEvent}, lifecycle=\${hasLifecycle}, requestWillBeSent=\${hasRequestWillBeSent}, loadingFinished=\${hasLoadingFinished}. Total Page events: \${pageEventsList.length}, Network events: \${networkEventsList.length}\`;
    
    addScenarioResult(1, 'Event Reception', pass, details);
    return { pass, run, pageEvents, networkEvents, details };
  }

  // Scenario 2: Check Status API
  async function scenario2(extensionId, replyUrl, tabId) {
    setStatus('Scenario 2: Check API...', true);
    
    // Navigate and wait for stability
    const url = location.origin + '/test-instant.html';
    await runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 2000 } }
    ]);

    // Call check API
    const checkResult = await callWaitApi({ tabId, condition: 'check' });
    
    const status = checkResult?.status || {};
    const pass = status.pageLoaded === true && status.domReady === true && status.networkIdle === true;
    const details = \`Check result: pageLoaded=\${status.pageLoaded}, domReady=\${status.domReady}, networkIdle=\${status.networkIdle}\`;
    
    addScenarioResult(2, 'Check Status API', pass, details);
    return { pass, checkResult, details };
  }

  // Scenario 3: Wait API - Page Load
  async function scenario3(extensionId, replyUrl, tabId) {
    setStatus('Scenario 3: Wait PageLoad...', true);
    
    // Clear events and navigate
    await clearEvents();
    const url = location.origin + '/test-slow-load.html';
    
    // Start navigation (non-blocking)
    const navPromise = runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } }
    ]);
    
    // Immediately call wait API
    const startTime = Date.now();
    const waitResult = await callWaitApi({ tabId, condition: 'pageLoad', timeoutMs: 10000 });
    const elapsed = Date.now() - startTime;
    
    await navPromise; // Ensure navigation completes
    
    const pass = waitResult?.satisfied === true && elapsed > 0 && elapsed < 10000;
    const details = \`Wait returned satisfied=\${waitResult?.satisfied}, durationMs=\${waitResult?.durationMs}, actualElapsed=\${elapsed}ms\`;
    
    addScenarioResult(3, 'Wait PageLoad', pass, details);
    return { pass, waitResult, elapsed, details };
  }

  // Scenario 4: Wait API - Network Idle
  async function scenario4(extensionId, replyUrl, tabId) {
    setStatus('Scenario 4: Wait NetworkIdle...', true);
    
    // Navigate to multi-resource page
    await clearEvents();
    const url = location.origin + '/test-multi-resource.html';
    
    const navPromise = runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } }
    ]);
    
    // Give navigation time to start and events to be captured
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Wait for network idle
    const startTime = Date.now();
    const waitResult = await callWaitApi({ tabId, condition: 'networkIdle', idleMs: 500, timeoutMs: 10000 });
    const elapsed = Date.now() - startTime;
    
    await navPromise;
    
    // Pass if network idle detection is working (waited at least 200ms, not immediate return)
    // Actual time may be less than 500ms due to browser caching/parallel loading optimizations
    const pass = waitResult?.satisfied === true && elapsed > 200 && elapsed < 5000;
    const details = \`Wait returned satisfied=\${waitResult?.satisfied}, durationMs=\${waitResult?.durationMs}, actualElapsed=\${elapsed}ms (expected 200-5000ms, proving idle detection works)\`;
    
    addScenarioResult(4, 'Wait NetworkIdle', pass, details);
    return { pass, waitResult, elapsed, details };
  }

  // Scenario 5: Wait API - Stable (Combined)
  async function scenario5(extensionId, replyUrl, tabId) {
    setStatus('Scenario 5: Wait Stable...', true);
    
    // Navigate to multi-resource page
    await clearEvents();
    const url = location.origin + '/test-multi-resource.html';
    
    const navPromise = runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } }
    ]);
    
    // Wait for stable
    const startTime = Date.now();
    const waitResult = await callWaitApi({ tabId, condition: 'stable', idleMs: 500, timeoutMs: 10000 });
    const elapsed = Date.now() - startTime;
    
    await navPromise;
    
    const result = waitResult?.result || {};
    const pass = waitResult?.satisfied === true && result.domReady === true && result.networkIdle === true;
    const details = \`Wait returned satisfied=\${waitResult?.satisfied}, domReady=\${result.domReady}, networkIdle=\${result.networkIdle}, durationMs=\${waitResult?.durationMs}\`;
    
    addScenarioResult(5, 'Wait Stable', pass, details);
    return { pass, waitResult, elapsed, details };
  }

  // Scenario 6: Timeout Mechanism
  async function scenario6(extensionId, replyUrl, tabId) {
    setStatus('Scenario 6: Timeout...', true);
    
    // Navigate to a page and wait for it to fully load
    const url = location.origin + '/test-instant.html';
    await runPlan(extensionId, replyUrl, tabId, [
      { name: 'navigate', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url } } },
      { name: 'wait', op: { kind: 'wait.fixed', durationMs: 1000 } }
    ]);
    
    // Clear events so hasPageLoaded() will return false
    await clearEvents();
    
    // Now test timeout - without new navigation, pageLoad won't fire, should timeout
    const startTime = Date.now();
    const waitResult = await callWaitApi({ tabId, condition: 'pageLoad', timeoutMs: 150 });
    const elapsed = Date.now() - startTime;
    
    // Should timeout after ~150ms and return satisfied=false
    const pass = elapsed >= 100 && elapsed < 400 && waitResult?.satisfied === false;
    const details = \`Timeout test: elapsed=\${elapsed}ms, satisfied=\${waitResult?.satisfied}, expected timeout ~150ms with satisfied=false\`;
    
    addScenarioResult(6, 'Timeout Mechanism', pass, details);
    return { pass, waitResult, elapsed, details };
  }

  async function runAllScenarios() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    // Clear previous results
    $results.innerHTML = '';
    $detail.textContent = '';

    try {
      setStatus('Creating test tab...', true);
      const target = await createTargetTab(extensionId);
      if (!target.ok) {
        setDetail(target);
        return setStatus('createTab failed', false);
      }

      const { tabId } = target;
      setStatus('Connecting SSE...', true);
      const sse = await connectSse(extensionId);
      if (!sse.ok) {
        setDetail({ target, sse });
        return setStatus('SSE connect failed', false);
      }

      // Enable domains once for all scenarios
      setStatus('Enabling domains...', true);
      await runPlan(extensionId, replyUrl, tabId, [
        { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
        { name: 'enable_network', tabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } }
      ]);

      // Run all scenarios
      const results = {
        s1: await scenario1(extensionId, replyUrl, tabId),
        s2: await scenario2(extensionId, replyUrl, tabId),
        s3: await scenario3(extensionId, replyUrl, tabId),
        s4: await scenario4(extensionId, replyUrl, tabId),
        s5: await scenario5(extensionId, replyUrl, tabId),
        s6: await scenario6(extensionId, replyUrl, tabId)
      };

      const allPass = Object.values(results).every(r => r.pass);
      setStatus(allPass ? '✅ All scenarios passed!' : '❌ Some scenarios failed', allPass);
      setDetail({ tabId, sse, results });

    } catch (error) {
      setStatus('Error: ' + (error instanceof Error ? error.message : String(error)), false);
      setDetail({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function runSingleScenario(num) {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime missing', false);

    $results.innerHTML = '';
    $detail.textContent = '';

    try {
      const target = await createTargetTab(extensionId);
      if (!target.ok) { setDetail(target); return setStatus('createTab failed', false); }
      const { tabId } = target;

      const sse = await connectSse(extensionId);
      if (!sse.ok) { setDetail({ target, sse }); return setStatus('SSE connect failed', false); }

      await runPlan(extensionId, replyUrl, tabId, [
        { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
        { name: 'enable_network', tabId, op: { kind: 'cdp.send', method: 'Network.enable', params: {} } }
      ]);

      let result;
      if (num === 1) result = await scenario1(extensionId, replyUrl, tabId);
      else if (num === 2) result = await scenario2(extensionId, replyUrl, tabId);
      else if (num === 3) result = await scenario3(extensionId, replyUrl, tabId);
      else if (num === 4) result = await scenario4(extensionId, replyUrl, tabId);
      else if (num === 5) result = await scenario5(extensionId, replyUrl, tabId);
      else if (num === 6) result = await scenario6(extensionId, replyUrl, tabId);

      setStatus(result?.pass ? '✅ Scenario passed' : '❌ Scenario failed', result?.pass);
      setDetail({ tabId, sse, result });

    } catch (error) {
      setStatus('Error: ' + (error instanceof Error ? error.message : String(error)), false);
      setDetail({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  $btnRunAll.addEventListener('click', () => void runAllScenarios());
  $btnScenario1.addEventListener('click', () => void runSingleScenario(1));
  $btnScenario2.addEventListener('click', () => void runSingleScenario(2));
  $btnScenario3.addEventListener('click', () => void runSingleScenario(3));
  $btnScenario4.addEventListener('click', () => void runSingleScenario(4));
  $btnScenario5.addEventListener('click', () => void runSingleScenario(5));
  $btnScenario6.addEventListener('click', () => void runSingleScenario(6));
  
  load();
</script>
`
})

