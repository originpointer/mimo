import { eventHandler } from "h3"

export default eventHandler(() => {
  const defaultExtensionId = process.env.CONTROL_EXTENSION_ID ?? ""
  const defaultReplyUrl = process.env.CONTROL_REPLY_URL ?? "http://localhost:3000/control/callback"

  return `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Snapshot Verify - Stagehand DOM Serialization</title>
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
  .tree-preview { max-height: 300px; overflow: auto; background: #f9f9f9; padding: 8px; border-radius: 8px; font-family: monospace; }
  .stats { display: flex; gap: 16px; margin-top: 8px; }
  .stat { text-align: center; padding: 8px 16px; background: #f0f0f0; border-radius: 8px; }
  .stat-value { font-size: 24px; font-weight: bold; color: #333; }
  .stat-label { font-size: 12px; color: #666; }
</style>

<h1>Snapshot Verify - Stagehand DOM 序列化</h1>
<div class="meta">
  本页验证 <code>captureHybridSnapshot</code> 的实现：
  <ul>
    <li><strong>combinedTree</strong>: 文本大纲（供 LLM 理解页面结构）</li>
    <li><strong>combinedXpathMap</strong>: elementId → XPath 映射（用于元素定位）</li>
    <li><strong>combinedUrlMap</strong>: elementId → URL 映射</li>
  </ul>
</div>

<div class="box">
  <div class="row">
    <label>extensionId</label>
    <input id="extId" placeholder="固定 extensionId（企业分发）" />
  </div>
  <div class="row" style="margin-top:8px">
    <label>replyUrl</label>
    <input id="replyUrl" placeholder="用于回调地址" />
  </div>
  <div class="row" style="margin-top:8px">
    <button id="btnRunAll">Run All Tests</button>
    <button id="btnSimple">Simple Snapshot</button>
    <button id="btnFull">Full Snapshot (Multi-Frame)</button>
  </div>
  <div class="meta" id="status"></div>
</div>

<div class="box">
  <div class="meta">Statistics</div>
  <div class="stats" id="stats">
    <div class="stat"><div class="stat-value" id="statElements">-</div><div class="stat-label">Elements</div></div>
    <div class="stat"><div class="stat-value" id="statUrls">-</div><div class="stat-label">URLs</div></div>
    <div class="stat"><div class="stat-value" id="statFrames">-</div><div class="stat-label">Frames</div></div>
    <div class="stat"><div class="stat-value" id="statTreeLen">-</div><div class="stat-label">Tree Length</div></div>
  </div>
</div>

<div class="box">
  <div class="meta">Test Results</div>
  <div id="results"></div>
</div>

<div class="box">
  <div class="meta">Combined Tree Preview (LLM Input)</div>
  <div class="tree-preview" id="treePreview">Run a test to see the tree...</div>
</div>

<div class="box">
  <div class="meta">XPath Map Sample (first 10 entries)</div>
  <pre id="xpathSample"></pre>
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
  const $treePreview = document.getElementById('treePreview');
  const $xpathSample = document.getElementById('xpathSample');
  const $btnRunAll = document.getElementById('btnRunAll');
  const $btnSimple = document.getElementById('btnSimple');
  const $btnFull = document.getElementById('btnFull');

  const defaultExt = ${JSON.stringify(defaultExtensionId)};
  const defaultReply = ${JSON.stringify(defaultReplyUrl)};

  const LS_EXT = 'control.verifySnapshot.extensionId';
  const LS_REPLY = 'control.verifySnapshot.replyUrl';

  function hasChromeRuntime() { return Boolean(window?.chrome?.runtime?.sendMessage); }
  function setStatus(text, ok=true) { $status.textContent = text; $status.className = ok ? 'meta ok' : 'meta bad'; }
  function setDetail(obj) { $detail.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); }
  function resetUi() { $results.innerHTML = ''; $detail.textContent = ''; $treePreview.textContent = 'Run a test to see the tree...'; $xpathSample.textContent = ''; }

  function updateStats(stats) {
    document.getElementById('statElements').textContent = stats?.elementCount ?? '-';
    document.getElementById('statUrls').textContent = stats?.urlCount ?? '-';
    document.getElementById('statFrames').textContent = stats?.frameCount ?? '-';
    document.getElementById('statTreeLen').textContent = stats?.treeLength ?? '-';
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
            requestId: 'snapshot-forward-' + Date.now(),
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
    const requestId = 'snapshot-create-' + Date.now();
    const tabResp = await sendToExtension(extensionId, { type: 'driver', action: 'createTab', requestId, url: 'about:blank', active: true });
    if (!tabResp?.ok || typeof tabResp.tabId !== 'number') return { ok: false, tabResp };
    const tabId = tabResp.tabId;
    return { ok: true, tabId, tabUrl: tabResp.tabUrl, tabTitle: tabResp.tabTitle, tabResp };
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  const TEST_URL = () => location.origin + '/test-stagehand.html';

  async function runSnapshot(extensionId, replyUrl, tabId, fullSnapshot = false) {
    setStatus('Taking snapshot...', true);
    const snap = await postJson('/control/snapshot', { 
      extensionId, 
      tabId, 
      replyUrl, 
      fullSnapshot,
      pierceShadow: true,
      experimental: false
    });
    return snap;
  }

  function displaySnapshot(snap) {
    if (snap?.ok && snap?.result) {
      const { combinedTree, combinedXpathMap, stats } = snap.result;
      
      // Update tree preview
      $treePreview.textContent = combinedTree || '(empty tree)';
      
      // Update stats
      updateStats(stats);
      
      // Show XPath sample
      const xpathEntries = Object.entries(combinedXpathMap || {}).slice(0, 10);
      $xpathSample.textContent = xpathEntries.map(([k, v]) => k + ' → ' + v).join('\\n') || '(no entries)';
    }
  }

  async function testBasicSnapshot(extensionId, tabId, replyUrl) {
    const snap = await runSnapshot(extensionId, replyUrl, tabId, false);
    const hasTree = Boolean(snap?.ok && snap?.result?.combinedTree);
    const hasXpath = Boolean(snap?.ok && snap?.result?.combinedXpathMap && Object.keys(snap.result.combinedXpathMap).length > 0);
    const pass = hasTree && hasXpath;
    addResult('Basic Snapshot - combinedTree 和 combinedXpathMap 存在', pass, 
      'tree length=' + (snap?.result?.combinedTree?.length || 0) + ', xpath entries=' + Object.keys(snap?.result?.combinedXpathMap || {}).length);
    return { pass, snap };
  }

  async function testXpathFormat(extensionId, tabId, replyUrl) {
    const snap = await runSnapshot(extensionId, replyUrl, tabId, false);
    const xpathMap = snap?.result?.combinedXpathMap || {};
    const entries = Object.entries(xpathMap);
    const validFormat = entries.every(([k, v]) => {
      // encodedId 格式: "ordinal-backendNodeId"
      const keyValid = /^\\d+-\\d+$/.test(k);
      // XPath 格式: 以 / 开头
      const valueValid = typeof v === 'string' && v.startsWith('/');
      return keyValid && valueValid;
    });
    const pass = entries.length > 0 && validFormat;
    addResult('XPath 格式正确 - encodedId 和 xpath 格式验证', pass,
      'entries=' + entries.length + ', format valid=' + validFormat);
    return { pass, snap };
  }

  async function testTreeContent(extensionId, tabId, replyUrl) {
    const snap = await runSnapshot(extensionId, replyUrl, tabId, false);
    const tree = snap?.result?.combinedTree || '';
    // 检查树是否包含基本结构
    const hasRoles = /\\[\\d+-\\d+\\]/.test(tree); // 检查 [encodedId] 格式
    const hasContent = tree.length > 50; // 至少有一些内容
    const pass = hasRoles && hasContent;
    addResult('Tree Content - 包含有效的 a11y 角色和内容', pass,
      'has roles=' + hasRoles + ', content length=' + tree.length);
    return { pass, snap };
  }

  async function testElementCount(extensionId, tabId, replyUrl) {
    const snap = await runSnapshot(extensionId, replyUrl, tabId, false);
    const elementCount = snap?.result?.stats?.elementCount || 0;
    // test-stagehand.html 应该有合理数量的元素
    const pass = elementCount >= 5 && elementCount < 10000;
    addResult('Element Count - 元素数量合理', pass,
      'count=' + elementCount + ' (expected 5~10000)');
    return { pass, snap };
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

      setStatus('Step 3: navigate to test page...', true);
      await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'navigate', url: TEST_URL(), waitForLoad: true });

      setStatus('Step 4: run snapshot tests...', true);
      
      const basic = await testBasicSnapshot(extensionId, tabId, replyUrl);
      const xpath = await testXpathFormat(extensionId, tabId, replyUrl);
      const content = await testTreeContent(extensionId, tabId, replyUrl);
      const count = await testElementCount(extensionId, tabId, replyUrl);

      // Display the last snapshot
      displaySnapshot(basic.snap || xpath.snap || content.snap || count.snap);

      const results = { basic, xpath, content, count };
      const allPass = Object.values(results).every(r => r?.pass);
      setStatus(allPass ? '✅ All PASS' : '❌ Some FAIL', allPass);
      setDetail({ tabId, sse, results });
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function runSingle(fullSnapshot) {
    const extensionId = ($extId.value || '').trim();
    const replyUrl = ($replyUrl.value || '').trim();
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

      await postJson('/control/act', { extensionId, tabId, replyUrl, action: 'navigate', url: TEST_URL(), waitForLoad: true });

      const snap = await runSnapshot(extensionId, replyUrl, tabId, fullSnapshot);
      displaySnapshot(snap);
      
      const pass = Boolean(snap?.ok);
      setStatus(pass ? '✅ Snapshot captured' : '❌ Snapshot failed', pass);
      setDetail(snap);
    } catch (e) {
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)), false);
      setDetail({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  $btnRunAll.addEventListener('click', () => void runAll());
  $btnSimple.addEventListener('click', () => void runSingle(false));
  $btnFull.addEventListener('click', () => void runSingle(true));
  load();
</script>
`
})
