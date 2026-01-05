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
    <button id="btnTestRun">Test run (2 steps)</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">Recent log</div>
  <pre id="log"></pre>
</div>

<div class="box">
  <div class="meta">OOPIF 测试区（跨域 iframe）</div>
  <iframe id="oopifFrame" src="" style="width:100%;height:120px;border:1px solid #ccc;background:#fafafa;"></iframe>
  <div class="row" style="margin-top:8px">
    <input id="oopifSrc" placeholder="cross-origin URL, e.g. https://example.com" style="flex:1" />
    <button id="btnLoadOopif">Load iframe</button>
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnTestAutoAttach">Test Target.setAutoAttach (flatten)</button>
    <button id="btnTestOopifSession">Test OOPIF Session (完整流程)</button>
  </div>
  <div class="meta" id="oopifStatus" style="margin-top:8px"></div>
</div>

<div class="box">
  <div class="meta">Phase 1: Tier1 CDP Methods 批量验证</div>
  <div class="row" style="margin-top:8px;gap:4px;flex-wrap:wrap">
    <button id="btnRound1">Round 1 (enable + getDocument)</button>
    <button id="btnRound2">Round 2 (DOM ops)</button>
    <button id="btnRound3">Round 3 (Input)</button>
    <button id="btnRound4">Round 4 (A11y/Overlay/Emulation)</button>
    <button id="btnRound5">Round 5 (Page ops)</button>
    <button id="btnRound6">Round 6 (Runtime ops)</button>
    <button id="btnRound7">Round 7 (Target ops)</button>
  </div>
  <div class="meta" id="batchStatus" style="margin-top:8px"></div>
</div>

<script>
  const $extId = document.getElementById('extId');
  const $replyUrl = document.getElementById('replyUrl');
  const $status = document.getElementById('status');
  const $log = document.getElementById('log');
  const $btnConnect = document.getElementById('btnConnect');
  const $btnDisconnect = document.getElementById('btnDisconnect');
  const $btnTestEnqueue = document.getElementById('btnTestEnqueue');
  const $btnTestRun = document.getElementById('btnTestRun');

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

  async function testRun() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) {
      setStatus('Missing extensionId', false);
      return;
    }
    if (!replyUrl) {
      setStatus('Missing replyUrl', false);
      return;
    }
    const body = {
      extensionId,
      replyUrl,
      defaultTtlMs: 30000,
      steps: [
        { name: 'eval_1+1', op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } } },
        { name: 'get_frame_tree', op: { kind: 'cdp.send', method: 'Page.getFrameTree', params: {} } }
      ]
    };
    const res = await fetch('/control/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    log('run response', data);
    if (!data.ok) setStatus('run failed', false);
    else setStatus('run ok', true);
  }

  // OOPIF testing
  const $oopifSrc = document.getElementById('oopifSrc');
  const $oopifFrame = document.getElementById('oopifFrame');
  const $btnLoadOopif = document.getElementById('btnLoadOopif');
  const $btnTestAutoAttach = document.getElementById('btnTestAutoAttach');

  $btnLoadOopif.addEventListener('click', () => {
    const src = ($oopifSrc.value || '').trim();
    if (!src) {
      setStatus('Please enter an iframe URL', false);
      return;
    }
    $oopifFrame.src = src;
    log('iframe loaded', { src });
  });

  async function testAutoAttach() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) {
      setStatus('Missing extensionId', false);
      return;
    }
    if (!replyUrl) {
      setStatus('Missing replyUrl', false);
      return;
    }
    const body = {
      extensionId,
      ttlMs: 30000,
      op: {
        kind: 'cdp.send',
        method: 'Target.setAutoAttach',
        params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }
      },
      replyUrl
    };
    const res = await fetch('/control/enqueue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    log('Target.setAutoAttach response', data);
    if (!data.ok) setStatus('setAutoAttach failed: ' + (data.error || 'unknown'), false);
    else setStatus('setAutoAttach ok: ' + data.commandId, true);
  }

  $btnTestAutoAttach.addEventListener('click', () => void testAutoAttach());

  // Test OOPIF Session - 完整流程
  const $btnTestOopifSession = document.getElementById('btnTestOopifSession');
  const $oopifStatus = document.getElementById('oopifStatus');

  async function testOopifSession() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId || !replyUrl) {
      $oopifStatus.textContent = 'Missing extensionId or replyUrl';
      $oopifStatus.className = 'meta bad';
      return;
    }

    try {
      // Step 1: 发送 Target.setAutoAttach with keepAttached
      $oopifStatus.textContent = 'Step 1: Sending Target.setAutoAttach (keepAttached=true)...';
      $oopifStatus.className = 'meta';

      const step1 = await fetch('/control/enqueue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          extensionId,
          ttlMs: 30000,
          op: {
            kind: 'cdp.send',
            method: 'Target.setAutoAttach',
            params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
            keepAttached: true
          },
          options: { keepAttached: true },
          replyUrl
        })
      });
      const step1Data = await step1.json();
      log('Step 1: Target.setAutoAttach', step1Data);

      if (!step1Data.ok) {
        $oopifStatus.textContent = 'Step 1 failed: ' + (step1Data.error || 'unknown');
        $oopifStatus.className = 'meta bad';
        return;
      }

      // Step 2: 等待子 session 注册
      $oopifStatus.textContent = 'Step 2: Waiting for child session (2s)...';
      await new Promise(r => setTimeout(r, 2000));

      // Step 3: 查询 sessions
      $oopifStatus.textContent = 'Step 3: Querying sessions...';
      const sessionsRes = await fetch('/control/sessions');
      const sessionsData = await sessionsRes.json();
      log('Step 3: Sessions', sessionsData);

      // 找到子 session (type=iframe)
      let childSession = null;
      if (sessionsData.ok && sessionsData.sessions) {
        for (const tab of sessionsData.sessions) {
          if (tab.children && tab.children.length > 0) {
            childSession = tab.children.find(c => c.type === 'iframe');
            if (childSession) break;
          }
        }
      }

      if (!childSession) {
        $oopifStatus.textContent = 'Step 3: No iframe child session found (check if iframe is loaded)';
        $oopifStatus.className = 'meta bad';
        log('No child session found', sessionsData);
        return;
      }

      log('Found child session', childSession);
      $oopifStatus.textContent = 'Step 3: Found child session: ' + childSession.sessionId;

      // Step 4: 在子 session 中执行 Runtime.evaluate
      $oopifStatus.textContent = 'Step 4: Executing Runtime.evaluate in child session...';

      const step4 = await fetch('/control/enqueue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          extensionId,
          ttlMs: 30000,
          sessionId: childSession.sessionId,
          op: {
            kind: 'cdp.send',
            method: 'Runtime.evaluate',
            params: { expression: 'document.title', returnByValue: true },
            sessionId: childSession.sessionId,
            keepAttached: true
          },
          options: { keepAttached: true },
          replyUrl
        })
      });
      const step4Data = await step4.json();
      log('Step 4: Runtime.evaluate in child session', step4Data);

      if (!step4Data.ok) {
        $oopifStatus.textContent = 'Step 4 failed: ' + (step4Data.error || 'unknown');
        $oopifStatus.className = 'meta bad';
        return;
      }

      // 等待 callback 返回
      $oopifStatus.textContent = 'Step 4: Waiting for callback (check server logs for result)...';
      await new Promise(r => setTimeout(r, 2000));

      $oopifStatus.textContent = '✅ OOPIF Session test completed! Check server logs for Runtime.evaluate result.';
      $oopifStatus.className = 'meta ok';

    } catch (e) {
      $oopifStatus.textContent = 'Error: ' + (e instanceof Error ? e.message : String(e));
      $oopifStatus.className = 'meta bad';
      log('OOPIF test error', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  $btnTestOopifSession.addEventListener('click', () => void testOopifSession());

  // Phase 1: Tier1 CDP Methods batch verification
  const $batchStatus = document.getElementById('batchStatus');

  async function runBatch(roundName, items) {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId || !replyUrl) {
      $batchStatus.textContent = 'Missing extensionId or replyUrl';
      $batchStatus.className = 'meta bad';
      return;
    }
    $batchStatus.textContent = 'Running ' + roundName + ' (' + items.length + ' methods)...';
    $batchStatus.className = 'meta';

    const body = { extensionId, replyUrl, items, ttlMs: 60000 };
    const res = await fetch('/control/enqueue-batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    log(roundName + ' batch response', data);
    if (!data.ok) {
      $batchStatus.textContent = roundName + ' failed: ' + (data.error || 'unknown');
      $batchStatus.className = 'meta bad';
    } else {
      $batchStatus.textContent = roundName + ' enqueued ' + data.count + ' commands';
      $batchStatus.className = 'meta ok';
    }
  }

  // Round 1: Enable methods + getDocument
  document.getElementById('btnRound1').addEventListener('click', () => void runBatch('Round 1', [
    { method: 'Page.enable', params: {} },
    { method: 'Runtime.enable', params: {} },
    { method: 'DOM.enable', params: {} },
    { method: 'Network.enable', params: {} },
    { method: 'DOM.getDocument', params: {} }
  ]));

  // Round 2: DOM operations (需要 documentNodeId，但这是异步的，先测试基础调用)
  document.getElementById('btnRound2').addEventListener('click', () => void runBatch('Round 2', [
    { method: 'DOM.getDocument', params: { depth: 0 } },
    { method: 'Page.getFrameTree', params: {} }
  ]));

  // Round 3: Input operations
  document.getElementById('btnRound3').addEventListener('click', () => void runBatch('Round 3', [
    { method: 'Input.dispatchMouseEvent', params: { type: 'mouseMoved', x: 100, y: 100 } },
    { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'Shift' } },
    { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'Shift' } }
  ]));

  // Round 4: Accessibility/Overlay/Emulation
  document.getElementById('btnRound4').addEventListener('click', () => void runBatch('Round 4', [
    { method: 'Accessibility.enable', params: {} },
    { method: 'Accessibility.getFullAXTree', params: {} },
    { method: 'Overlay.enable', params: {} },
    { method: 'Emulation.setDeviceMetricsOverride', params: { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false } },
    { method: 'Emulation.clearDeviceMetricsOverride', params: {} }
  ]));

  // Round 5: Page operations
  document.getElementById('btnRound5').addEventListener('click', () => void runBatch('Round 5', [
    { method: 'Page.setLifecycleEventsEnabled', params: { enabled: true } },
    { method: 'Page.getNavigationHistory', params: {} },
    { method: 'Page.captureScreenshot', params: { format: 'png' } }
  ]));

  // Round 6: Runtime operations
  document.getElementById('btnRound6').addEventListener('click', () => void runBatch('Round 6', [
    { method: 'Runtime.evaluate', params: { expression: 'document.title', returnByValue: true } },
    { method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } }
  ]));

  // Round 7: Target operations
  document.getElementById('btnRound7').addEventListener('click', () => void runBatch('Round 7', [
    { method: 'Target.getTargets', params: {} },
    { method: 'Target.setDiscoverTargets', params: { discover: true } }
  ]));

  $btnConnect.addEventListener('click', connect);
  $btnDisconnect.addEventListener('click', disconnect);
  $btnTestEnqueue.addEventListener('click', () => void testEnqueue());
  $btnTestRun.addEventListener('click', () => void testRun());

  load();
</script>
`
})


