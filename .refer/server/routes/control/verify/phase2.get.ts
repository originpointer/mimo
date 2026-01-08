import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 2 Verify</title>
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
<h1>Phase 2 自动验证（无需手工 tabId）</h1>
<div class="meta">
  说明：本页会向扩展发送 <code>getActiveTab</code> 获取当前激活 tabId，然后调用 <code>/control/run</code> 执行
  <code>Page.enable</code> / <code>Runtime.enable</code> / <code>Page.setLifecycleEventsEnabled</code> / <code>Page.reload</code>，最后查询
  <code>/control/events</code> 验证 <code>Page.domContentEventFired</code> / <code>Page.loadEventFired</code>（并输出 lifecycleEvent 作为对照）。
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
    <label>iframeSrc</label>
    <input id="iframeSrc" placeholder="Step3/4: 跨域 iframe 地址（用于产生 OOPIF/子 session）" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnVerify">Verify Step2 Page Events (auto tabId)</button>
    <button id="btnVerifyTarget">Verify Step3 Target Events</button>
    <button id="btnVerifySession">Verify Step4 Session Routing</button>
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
  const $iframeSrc = document.getElementById('iframeSrc');
  const $status = document.getElementById('status');
  const $result = document.getElementById('result');
  const $btnVerify = document.getElementById('btnVerify');
  const $btnVerifyTarget = document.getElementById('btnVerifyTarget');
  const $btnVerifySession = document.getElementById('btnVerifySession');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};
  const defaultIframeSrc = 'https://example.com/';
  const LS_EXT = 'control.verifyPhase2.extensionId';
  const LS_REPLY = 'control.verifyPhase2.replyUrl';
  const LS_IFRAME = 'control.verifyPhase2.iframeSrc';

  function hasChromeRuntime() {
    return Boolean(window?.chrome?.runtime?.sendMessage);
  }

  function setStatus(text, ok=true) {
    $status.textContent = text;
    $status.className = ok ? 'meta ok' : 'meta bad';
  }

  function setResult(obj) {
    $result.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  }

  function load() {
    $extId.value = (window.localStorage.getItem(LS_EXT) || defaultExt || '').trim();
    $replyUrl.value = (window.localStorage.getItem(LS_REPLY) || defaultReply || '').trim();
    $iframeSrc.value = (window.localStorage.getItem(LS_IFRAME) || defaultIframeSrc || '').trim();
    if (!hasChromeRuntime()) {
      setStatus('chrome.runtime: missing（请在安装了扩展且允许外部消息的 Chrome 中打开本页）', false);
    } else {
      setStatus('ready', true);
    }
  }

  $extId.addEventListener('input', () => window.localStorage.setItem(LS_EXT, ($extId.value || '').trim()));
  $replyUrl.addEventListener('input', () => window.localStorage.setItem(LS_REPLY, ($replyUrl.value || '').trim()));
  $iframeSrc.addEventListener('input', () => window.localStorage.setItem(LS_IFRAME, ($iframeSrc.value || '').trim()));

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
  function disconnectSse() {
    if (es) {
      try { es.close(); } catch {}
      es = null;
    }
  }

  function connectSse(extensionId) {
    disconnectSse();
    return new Promise((resolve) => {
      const url = '/control/stream?extensionId=' + encodeURIComponent(extensionId);
      es = new EventSource(url);
      let done = false;

      const finish = (ok, info) => {
        if (done) return;
        done = true;
        resolve({ ok, info });
      };

      const t = setTimeout(() => finish(false, { message: 'SSE connect timeout' }), 5000);

      es.addEventListener('ready', () => {
        clearTimeout(t);
        finish(true, { message: 'SSE connected' });
      });

      es.addEventListener('command', (ev) => {
        try {
          const envelope = JSON.parse(ev.data);
          const req = {
            type: 'driver',
            action: 'invoke',
            requestId: 'verify-forward-' + Date.now(),
            commandId: envelope.commandId,
            traceId: envelope.traceId,
            target: { tabId: envelope?.target?.tabId },
            jws: envelope.jws
          };
          void sendToExtension(extensionId, req);
        } catch {
          // ignore bad payload
        }
      });

      es.onerror = () => {
        // keep EventSource auto-retry; only fail if we haven't connected yet
        if (!done) {
          clearTimeout(t);
          finish(false, { message: 'SSE error before ready' });
        }
      };
    });
  }

  async function queryEvents(method) {
    const res = await fetch('/control/events?method=' + encodeURIComponent(method));
    return await res.json();
  }

  async function querySessions(tabId, type) {
    const url = '/control/sessions?tabId=' + encodeURIComponent(String(tabId)) + (type ? '&type=' + encodeURIComponent(type) : '');
    const res = await fetch(url);
    return await res.json();
  }

  async function getTargetTab(extensionId) {
    const requestId = 'verify-' + Date.now();
    setStatus('Step 1: getActiveTab...', true);
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'getActiveTab', requestId });
    if (!tabResp?.ok || typeof tabResp.tabId !== 'number') {
      setResult(tabResp);
      setStatus('getActiveTab failed', false);
      return null;
    }
    const tabId = tabResp.tabId;
    const tabUrl = tabResp.tabUrl || undefined;
    const tabTitle = tabResp.tabTitle || undefined;
    const sourceTabId = typeof tabResp.sourceTabId === 'number' ? tabResp.sourceTabId : null;
    if (sourceTabId && tabId === sourceTabId) {
      setResult({ tabId, sourceTabId, tabUrl, tabTitle, hint: '请先激活一次你要验证的目标页面 tab（非 /control/*），再回到本页点击验证。扩展会记住“上一次非控制页 tabId”。' });
      setStatus('Target tab is the verify page itself', false);
      return null;
    }
    return { tabId, tabUrl, tabTitle, tabResp };
  }

  async function verify() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime: missing', false);

    const target = await getTargetTab(extensionId);
    if (!target) return;
    const { tabId, tabUrl, tabTitle } = target;
    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) {
      setResult({ tabId, tabUrl, tabTitle, sse });
      return setStatus('SSE connect failed', false);
    }

    setStatus('Step 3: clear events...', true);
    await fetch('/control/events?clear=1');

    setStatus('Step 4: run plan (Page.enable + navigate)...', true);
    const runRes = await fetch('/control/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensionId,
        replyUrl,
        keepAttached: true,
        defaultTtlMs: 30000,
        steps: [
          { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
          { name: 'enable_runtime', tabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
          { name: 'enable_lifecycle', tabId, op: { kind: 'cdp.send', method: 'Page.setLifecycleEventsEnabled', params: { enabled: true } } },
          { name: 'get_url', tabId, op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: 'location.href', returnByValue: true } } },
          { name: 'nav_blank', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: 'about:blank' } } },
          { name: 'wait_blank', op: { kind: 'wait.fixed', durationMs: 500 } },
          { name: 'nav_back', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: '{{get_url.result.value}}' } }, dependsOn: 'get_url' },
          { name: 'wait', op: { kind: 'wait.fixed', durationMs: 3000 } }
        ]
      })
    });
    const runData = await runRes.json();

    setStatus('Step 5: query events...', true);
    const domContent = await queryEvents('Page.domContentEventFired');
    const load = await queryEvents('Page.loadEventFired');
    const lifecycle = await queryEvents('Page.lifecycleEvent');

    setResult({ tabId, tabUrl, tabTitle, sse, run: runData, events: { domContent, load, lifecycle } });
    setStatus('done', true);
  }

  async function verifyStep3() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    const iframeSrc = ($iframeSrc.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!iframeSrc) return setStatus('Missing iframeSrc', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime: missing', false);

    const target = await getTargetTab(extensionId);
    if (!target) return;
    const { tabId, tabUrl, tabTitle } = target;

    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) {
      setResult({ tabId, tabUrl, tabTitle, sse });
      return setStatus('SSE connect failed', false);
    }

    setStatus('Step 3: clear events...', true);
    await fetch('/control/events?clear=1');

    const helperUrl = location.origin + '/control/verify/phase2-oopif?src=' + encodeURIComponent(iframeSrc);

    setStatus('Step 4: run plan (Target.setAutoAttach + navigate OOPIF)...', true);
    const runRes = await fetch('/control/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensionId,
        replyUrl,
        keepAttached: true,
        defaultTtlMs: 30000,
        steps: [
          { name: 'enable_page', tabId, op: { kind: 'cdp.send', method: 'Page.enable', params: {} } },
          { name: 'auto_attach', tabId, op: { kind: 'cdp.send', method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } } },
          { name: 'nav_helper', tabId, op: { kind: 'cdp.send', method: 'Page.navigate', params: { url: helperUrl } } },
          { name: 'wait', op: { kind: 'wait.fixed', durationMs: 3000 } }
        ]
      })
    });
    const runData = await runRes.json();

    setStatus('Step 5: query Target events + sessions...', true);
    const targetAttached = await queryEvents('Target.attachedToTarget');
    const targetAll = await queryEvents('Target.');
    const sessionsIframe = await querySessions(tabId, 'iframe');

    setResult({ tabId, tabUrl, tabTitle, iframeSrc, helperUrl, sse, run: runData, events: { targetAttached, targetAll }, sessions: { iframe: sessionsIframe } });
    setStatus('done', true);
  }

  async function verifyStep4() {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
    if (!extensionId) return setStatus('Missing extensionId', false);
    if (!replyUrl) return setStatus('Missing replyUrl', false);
    if (!hasChromeRuntime()) return setStatus('chrome.runtime: missing', false);

    const target = await getTargetTab(extensionId);
    if (!target) return;
    const { tabId, tabUrl, tabTitle } = target;

    setStatus('Step 2: connect SSE...', true);
    const sse = await connectSse(extensionId);
    if (!sse.ok) {
      setResult({ tabId, tabUrl, tabTitle, sse });
      return setStatus('SSE connect failed', false);
    }

    setStatus('Step 3: find iframe sessionId...', true);
    const sessionsIframe = await querySessions(tabId, 'iframe');
    const sessionId = sessionsIframe?.sessions?.[0]?.sessionId;
    if (!sessionId) {
      setResult({ tabId, tabUrl, tabTitle, sessions: { iframe: sessionsIframe }, hint: '未发现 iframe sessionId：请先点一次 Step3（Target.setAutoAttach + 导航到 helper 页）' });
      return setStatus('Missing iframe sessionId', false);
    }

    setStatus('Step 4: clear events...', true);
    await fetch('/control/events?clear=1');

    setStatus('Step 5: run plan (Runtime.evaluate in child session)...', true);
    const runRes = await fetch('/control/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensionId,
        replyUrl,
        keepAttached: true,
        defaultTtlMs: 30000,
        steps: [
          { name: 'enable_runtime', tabId, op: { kind: 'cdp.send', method: 'Runtime.enable', params: {} } },
          { name: 'eval_child', tabId, op: { kind: 'cdp.send', method: 'Runtime.evaluate', params: { expression: 'document.title', returnByValue: true }, target: { sessionId } } },
          { name: 'wait', op: { kind: 'wait.fixed', durationMs: 1000 } }
        ]
      })
    });
    const runData = await runRes.json();

    setStatus('Step 6: query events (by sessionId)...', true);
    const runtimeChild = await (async () => {
      const res = await fetch('/control/events?sessionId=' + encodeURIComponent(sessionId) + '&method=Runtime.');
      return await res.json();
    })();

    setResult({ tabId, tabUrl, tabTitle, sessionId, sse, sessions: { iframe: sessionsIframe }, run: runData, events: { runtimeChild } });
    setStatus('done', true);
  }

  $btnVerify.addEventListener('click', () => void verify());
  $btnVerifyTarget.addEventListener('click', () => void verifyStep3());
  $btnVerifySession.addEventListener('click', () => void verifyStep4());
  load();
</script>
`
})


