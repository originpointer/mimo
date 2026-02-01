/**
 * Content Script - 页面状态监听
 * 
 * 在页面上下文中运行，使用 Observer 监听页面加载状态
 */

import { PageStateDetector } from './page-state-detector';
import type { PageStateInfo } from './page-state.type';
// NOTE: @repo/sens 的 dist/utils/index.js 在当前仓库里可能尚未产出；这里使用 workspace 源码深导入，交给 Plasmo/Parcel 进行打包。
import { scanDomForXPaths } from '@repo/sens/src/utils/stagehand-xpath';
import {
  STAGEHAND_XPATH_SCAN,
  type StagehandXPathItem,
  type StagehandXPathScanOptions,
  type StagehandXPathScanPayload,
  type StagehandXPathScanResponse,
} from '../src/types/stagehand-xpath';

let detector: PageStateDetector | null = null;

// ==================== Mimo (Manus-compatible) 4-state UI/state machine ====================

type MimoTaskState = 'Idle' | 'Hidden' | 'Ongoing' | 'Takeover';

let mimoTaskState: MimoTaskState = 'Idle';
let mimoSessionId: string | null = null;
let mimoRequestId: string | null = null;
let mimoSummary: string | null = null;

let styleEl: HTMLStyleElement | null = null;
let overlayEl: HTMLDivElement | null = null;
let barEl: HTMLDivElement | null = null;

const blockerEvents: Array<keyof DocumentEventMap> = [
  'pointerdown',
  'mousedown',
  'click',
  'keydown',
  'wheel',
  'touchstart',
  'touchmove',
  'mousemove',
];

function ensureStyle() {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.setAttribute('data-mimo', 'task-style');
  styleEl.textContent = `
    :root { --mimo-z: 2147483647; }
    .mimo-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: var(--mimo-z);
      box-shadow: 0 0 0 6px rgba(41, 121, 255, 0.65) inset, 0 0 32px rgba(41, 121, 255, 0.35) inset;
    }
    .mimo-bar {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: var(--mimo-z);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(17, 24, 39, 0.88);
      color: rgba(255,255,255,0.92);
      font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .mimo-bar .mimo-pill {
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(41, 121, 255, 0.18);
      border: 1px solid rgba(41, 121, 255, 0.35);
      color: rgba(200, 225, 255, 0.95);
      font-weight: 600;
      white-space: nowrap;
    }
    .mimo-bar .mimo-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      opacity: 0.92;
    }
    .mimo-bar button {
      all: unset;
      cursor: pointer;
      user-select: none;
      padding: 6px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.92);
      font-weight: 600;
    }
    .mimo-bar button:hover { background: rgba(255,255,255,0.12); }
    .mimo-bar button.mimo-danger { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); }
    .mimo-bar button.mimo-danger:hover { background: rgba(239, 68, 68, 0.18); }
  `;
  (document.head || document.documentElement).appendChild(styleEl);
}

function cleanupUi() {
  overlayEl?.remove();
  barEl?.remove();
  overlayEl = null;
  barEl = null;
}

function ensureUi() {
  ensureStyle();
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'mimo-overlay';
    overlayEl.setAttribute('data-mimo', 'overlay');
    document.documentElement.appendChild(overlayEl);
  }

  if (!barEl) {
    barEl = document.createElement('div');
    barEl.className = 'mimo-bar';
    barEl.setAttribute('data-mimo', 'bar');

    const pill = document.createElement('div');
    pill.className = 'mimo-pill';
    pill.textContent = 'Mimo';

    const text = document.createElement('div');
    text.className = 'mimo-text';
    text.textContent = 'AI 接管中';

    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = '恢复任务';
    resumeBtn.addEventListener('click', () => {
      setMimoTaskState('Ongoing');
      try {
        chrome.runtime.sendMessage({ type: 'extension/resume-task', payload: { sessionId: mimoSessionId } });
      } catch {
        // ignore
      }
    });

    const stopBtn = document.createElement('button');
    stopBtn.textContent = '停止';
    stopBtn.className = 'mimo-danger';
    stopBtn.addEventListener('click', () => {
      setMimoTaskState('Idle');
      try {
        chrome.runtime.sendMessage({ type: 'extension/stop-task', payload: { sessionId: mimoSessionId } });
      } catch {
        // ignore
      }
    });

    barEl.appendChild(pill);
    barEl.appendChild(text);
    barEl.appendChild(resumeBtn);
    barEl.appendChild(stopBtn);
    document.documentElement.appendChild(barEl);
  }

  // Update bar text and buttons depending on state
  const textEl = barEl.querySelector('.mimo-text') as HTMLDivElement | null;
  const resumeEl = barEl.querySelector('button') as HTMLButtonElement | null;
  const stopEl = barEl.querySelector('button.mimo-danger') as HTMLButtonElement | null;
  if (textEl) {
    const base = mimoSummary || '浏览器任务';
    if (mimoTaskState === 'Ongoing') textEl.textContent = `AI 接管中：${base}`;
    else if (mimoTaskState === 'Takeover') textEl.textContent = `你已接管：${base}`;
    else if (mimoTaskState === 'Hidden') textEl.textContent = base;
  }
  if (resumeEl) resumeEl.style.display = mimoTaskState === 'Takeover' ? 'inline-flex' : 'none';
  if (stopEl) stopEl.style.display = mimoTaskState === 'Ongoing' || mimoTaskState === 'Takeover' ? 'inline-flex' : 'none';
}

let blockersInstalled = false;
const blockerListener = (e: Event) => {
  if (mimoTaskState !== 'Ongoing') return;

  // Any user input triggers takeover.
  // - For mousemove: do not block (it is harmless and should feel responsive).
  // - For other events: block this first interaction, then hand control back to user.
  if ((e as any)?.type !== 'mousemove') {
    try {
      e.preventDefault();
    } catch {
      // ignore
    }
    try {
      e.stopPropagation();
    } catch {
      // ignore
    }
  }
  setMimoTaskState('Takeover');
};

function installBlockers() {
  if (blockersInstalled) return;
  blockersInstalled = true;
  for (const ev of blockerEvents) {
    document.addEventListener(ev, blockerListener as any, { capture: true, passive: false } as any);
  }
}

function uninstallBlockers() {
  if (!blockersInstalled) return;
  blockersInstalled = false;
  for (const ev of blockerEvents) {
    document.removeEventListener(ev, blockerListener as any, { capture: true } as any);
  }
}

function setMimoTaskState(next: MimoTaskState) {
  if (mimoTaskState === next) return;
  mimoTaskState = next;

  if (next === 'Idle') {
    uninstallBlockers();
    cleanupUi();
    mimoSessionId = null;
    mimoRequestId = null;
    mimoSummary = null;
    return;
  }

  if (next === 'Hidden') {
    uninstallBlockers();
    cleanupUi();
    return;
  }

  if (next === 'Ongoing') {
    ensureUi();
    installBlockers();
    ensureUi(); // refresh text/buttons
    return;
  }

  if (next === 'Takeover') {
    // Release control to user immediately.
    uninstallBlockers();
    ensureUi();
    return;
  }
}

/**
 * 初始化页面状态检测器
 */
function initializeDetector() {
  if (detector) {
    return;
  }

  detector = new PageStateDetector({
    // 可以根据需要自定义配置
    domStableThreshold: 500,
    networkQuietThreshold: 500,
    debounceTime: 300,
    timeout: 30000,
  });

  // 注册状态变化回调，发送消息到 background
  detector.onStateChange((stateInfo: PageStateInfo) => {
    sendStateToBackground(stateInfo);
  });

  // 初始化所有 Observer
  detector.initialize();

  // 立即发送一次当前状态
  const currentState = detector.getCurrentState();
  sendStateToBackground(currentState);
}

/**
 * 发送状态到 background script
 */
function sendStateToBackground(stateInfo: PageStateInfo) {
  try {
    chrome.runtime.sendMessage(
      {
        type: 'PAGE_STATE_CHANGE',
        payload: stateInfo,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to send page state to background:', chrome.runtime.lastError);
        }
      }
    );
  } catch (e) {
    console.error('Error sending page state to background:', e);
  }
}

/**
 * 处理来自 background 的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Manus-style session control (sent from extension background).
  if (message?.type === 'session/start') {
    const payload = (message.payload || {}) as any;
    mimoSessionId = typeof payload.sessionId === 'string' ? payload.sessionId : null;
    mimoRequestId = typeof payload.requestId === 'string' ? payload.requestId : null;
    const title = typeof payload.title === 'string' ? payload.title : null;
    const summary = typeof payload.summary === 'string' ? payload.summary : null;
    mimoSummary = title || summary;
    setMimoTaskState('Ongoing');
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'session/stop') {
    setMimoTaskState('Idle');
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'session/hide') {
    setMimoTaskState('Hidden');
    sendResponse({ ok: true });
    return true;
  }

  // Minimal browser tool RPC (sent from extension background).
  if (message?.type === 'browser/get_content') {
    const payload = (message.payload || {}) as any;
    const maxChars = typeof payload.maxChars === 'number' && Number.isFinite(payload.maxChars) ? Math.floor(payload.maxChars) : undefined;
    try {
      const url = window.location.href;
      const title = document.title || '';
      const textRaw = document.body ? document.body.innerText || '' : '';
      const text = maxChars && maxChars > 0 ? textRaw.slice(0, maxChars) : textRaw;
      sendResponse({
        ok: true,
        url,
        title,
        text,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    return true;
  }

  if (message?.type === 'browser/click') {
    const payload = (message.payload || {}) as any;
    const selector = typeof payload.selector === 'string' ? payload.selector : null;
    const xpath = typeof payload.xpath === 'string' ? payload.xpath : null;
    try {
      let el: Element | null = null;
      if (selector) el = document.querySelector(selector);
      if (!el && xpath) {
        const r = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = (r.singleNodeValue as Element | null) ?? null;
      }
      if (!el) {
        sendResponse({ ok: false, error: 'element not found' });
        return true;
      }
      (el as HTMLElement).click?.();
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    return true;
  }

  if (message?.type === 'browser/fill') {
    const payload = (message.payload || {}) as any;
    const selector = typeof payload.selector === 'string' ? payload.selector : null;
    const xpath = typeof payload.xpath === 'string' ? payload.xpath : null;
    const text = typeof payload.text === 'string' ? payload.text : '';
    try {
      let el: Element | null = null;
      if (selector) el = document.querySelector(selector);
      if (!el && xpath) {
        const r = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = (r.singleNodeValue as Element | null) ?? null;
      }
      if (!el) {
        sendResponse({ ok: false, error: 'element not found' });
        return true;
      }
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      (input as any).focus?.();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    return true;
  }

  if (message?.type === 'browser/xpath_scan') {
    const started = Date.now();
    const payload = (message.payload || {}) as any;
    const maxItems =
      typeof payload.maxItems === 'number' && Number.isFinite(payload.maxItems) && payload.maxItems > 0
        ? Math.floor(payload.maxItems)
        : 200;
    const selector =
      typeof payload.selector === 'string' && payload.selector.trim()
        ? payload.selector.trim()
        : "a,button,input,textarea,select,[role='button'],[onclick]";
    const includeShadow = Boolean(payload.includeShadow);

    /** 元素可见性检查 */
    const isVisible = (el: Element): boolean => {
      try {
        const style = window.getComputedStyle(el);
        if (!style) return false;
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        const rects = el.getClientRects();
        if (!rects || rects.length === 0) return false;
        return true;
      } catch {
        return false;
      }
    };

    /** 提取元素文本片段 */
    const textSnippetOf = (el: Element): string | undefined => {
      const raw =
        (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.textContent || '';
      const s = String(raw).replace(/\s+/g, ' ').trim();
      if (!s) return undefined;
      return s.length > 120 ? s.slice(0, 120) : s;
    };

    try {
      if (!document.documentElement) {
        sendResponse({ ok: false, error: 'document.documentElement missing' });
        return true;
      }

      const scanResults = scanDomForXPaths(selector, {
        includeShadow,
        maxItems,
        isVisible,
      });

      const items = scanResults.map((result) => ({
        xpath: result.xpath,
        tagName: result.tagName,
        id: result.id,
        className: result.className,
        textSnippet: textSnippetOf(result.element),
      }));

      const totalCandidates = Array.from(document.querySelectorAll(selector)).filter(isVisible).length;

      const xpaths = items.map((x) => x.xpath);
      sendResponse({
        ok: true,
        xpaths,
        items,
        meta: { totalCandidates, durationMs: Date.now() - started },
      });
      return true;
    } catch (e) {
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      return true;
    }
  }

  if (message?.type === 'browser/xpath_mark') {
    const payload = (message.payload || {}) as any;
    const xpaths = Array.isArray(payload.xpaths) ? payload.xpaths.map((x: any) => String(x)) : [];
    const mode = payload.mode === 'clear' ? 'clear' : 'mark';

    const STYLE_ID = 'mimo-xpath-mark-style';
    const MARK_ATTR = 'data-mimo-xpath-mark';
    const palette = [
      '#FF3B30',
      '#34C759',
      '#007AFF',
      '#FF9500',
      '#AF52DE',
      '#5AC8FA',
      '#FF2D55',
      '#5856D6',
      '#FFCC00',
      '#32D74B',
      '#0A84FF',
      '#BF5AF2',
    ];

    const ensureStyle = () => {
      let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
          `[${MARK_ATTR}=\"1\"]{`,
          `  outline: 2px solid var(--mimoMarkColor, #FF3B30) !important;`,
          `  outline-offset: 2px !important;`,
          `  box-shadow: 0 0 0 2px rgba(0,0,0,0.06) !important;`,
          `}`,
        ].join('\n');
        (document.head || document.documentElement).appendChild(style);
      }
    };

    const clearAll = () => {
      try {
        document.getElementById(STYLE_ID)?.remove();
      } catch {}
      try {
        const els = document.querySelectorAll(`[${MARK_ATTR}=\"1\"]`);
        for (const el of Array.from(els)) {
          try {
            (el as HTMLElement).removeAttribute(MARK_ATTR);
            (el as HTMLElement).style?.removeProperty?.('--mimoMarkColor');
          } catch {}
        }
      } catch {}
    };

    try {
      if (mode === 'clear') {
        clearAll();
        sendResponse({ ok: true, matchedCount: 0, markedCount: 0, byXpath: [], meta: { cleared: true } });
        return true;
      }

      if (!xpaths.length) {
        sendResponse({ ok: false, error: 'xpaths is empty' });
        return true;
      }

      ensureStyle();

      const byXpath: any[] = [];
      let matchedCount = 0;
      let markedCount = 0;

      for (let i = 0; i < xpaths.length; i++) {
        const xp = String(xpaths[i] || '').trim();
        if (!xp) continue;
        const color = palette[i % palette.length]!;
        let localMatched = 0;
        let localMarked = 0;

        try {
          const snap = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          const cnt = snap ? snap.snapshotLength : 0;
          localMatched = cnt;
          matchedCount += cnt;
          for (let j = 0; j < cnt; j++) {
            const n = snap.snapshotItem(j);
            if (!n || n.nodeType !== 1) continue;
            const el = n as HTMLElement;
            try {
              el.setAttribute(MARK_ATTR, '1');
              el.style?.setProperty?.('--mimoMarkColor', color);
              localMarked += 1;
              markedCount += 1;
            } catch {}
          }
          byXpath.push({ xpath: xp, matchedCount: localMatched, markedCount: localMarked });
        } catch (e) {
          byXpath.push({ xpath: xp, matchedCount: 0, markedCount: 0, error: e instanceof Error ? e.message : String(e) });
        }
      }

      sendResponse({ ok: true, matchedCount, markedCount, byXpath, meta: { cleared: false } });
      return true;
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      return true;
    }
  }

  if (message?.type === 'browser/xpath_get_html') {
    const payload = (message.payload || {}) as any;
    const xpath = typeof payload.xpath === 'string' ? payload.xpath.trim() : '';
    const maxChars =
      typeof payload.maxChars === 'number' && Number.isFinite(payload.maxChars) && payload.maxChars > 0
        ? Math.floor(payload.maxChars)
        : 200000;

    if (!xpath) {
      sendResponse({ ok: false, error: 'xpath is empty' });
      return true;
    }

    try {
      const snap = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const cnt = snap ? snap.snapshotLength : 0;
      if (cnt <= 0) {
        sendResponse({ ok: false, error: 'no elements matched' });
        return true;
      }

      const htmls: string[] = [];
      for (let i = 0; i < cnt; i++) {
        const n = snap.snapshotItem(i);
        if (!n || n.nodeType !== 1) continue;
        const el = n as HTMLElement;
        htmls.push(el.outerHTML || '');
      }

      const joined = htmls.join('\n');
      const html = joined.length > maxChars ? joined.slice(0, maxChars) : joined;

      sendResponse({ ok: true, matchedCount: cnt, html });
      return true;
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      return true;
    }
  }

  if (message.type === 'GET_PAGE_STATE') {
    if (detector) {
      const state = detector.getCurrentState();
      sendResponse(state);
    } else {
      sendResponse({ state: 'UNKNOWN', url: window.location.href, timestamp: Date.now() });
    }
    return true; // 保持消息通道开放以支持异步响应
  }

  if (message.type === 'INITIALIZE_DETECTOR') {
    initializeDetector();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === STAGEHAND_XPATH_SCAN) {
    const started = Date.now();
    const payload = (message.payload || {}) as Partial<StagehandXPathScanPayload>;
    const maxItems =
      typeof payload.maxItems === 'number' && Number.isFinite(payload.maxItems) && payload.maxItems > 0
        ? Math.floor(payload.maxItems)
        : 200;
    const selector =
      typeof payload.selector === 'string' && payload.selector.trim()
        ? payload.selector.trim()
        : "a,button,input,textarea,select,[role='button'],[onclick]";
    const includeShadow = Boolean(payload.includeShadow);

    /** 元素可见性检查 */
    const isVisible = (el: Element): boolean => {
      try {
        const style = window.getComputedStyle(el);
        if (!style) return false;
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        const rects = el.getClientRects();
        if (!rects || rects.length === 0) return false;
        return true;
      } catch {
        return false;
      }
    };

    /** 提取元素文本片段 */
    const textSnippetOf = (el: Element): string | undefined => {
      const raw =
        (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.textContent || '';
      const s = String(raw).replace(/\s+/g, ' ').trim();
      if (!s) return undefined;
      return s.length > 120 ? s.slice(0, 120) : s;
    };

    try {
      if (!document.documentElement) {
        sendResponse({ ok: false, error: 'document.documentElement missing' } satisfies StagehandXPathScanResponse);
        return true;
      }

      // 使用封装的 scanDomForXPaths 工具函数
      const scanResults = scanDomForXPaths(selector, {
        includeShadow,
        maxItems,
        isVisible,
      });

      // 转换为 StagehandXPathItem 格式，添加 textSnippet
      const items: StagehandXPathItem[] = scanResults.map((result) => ({
        xpath: result.xpath,
        tagName: result.tagName,
        id: result.id,
        className: result.className,
        textSnippet: textSnippetOf(result.element),
      }));

      // 统计总候选数（用于响应元数据）
      const totalCandidates = Array.from(document.querySelectorAll(selector)).filter(isVisible).length;

      const xpaths = items.map((x) => x.xpath);
      sendResponse({
        ok: true,
        xpaths,
        items,
        meta: { totalCandidates, durationMs: Date.now() - started },
      } satisfies StagehandXPathScanResponse);
      return true;
    } catch (e) {
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      } satisfies StagehandXPathScanResponse);
      return true;
    }
  }

  return false;
});

// ==================== mimoim ↔ content-script bridge (auto-discovery) ====================
//
// The Next.js app runs in the page world and cannot access extension APIs directly.
// We expose a tiny bridge via window.postMessage so mimoim can ask the content-script
// for current extension/client/socket info, then auto-select a browser plugin.

const MIMOIM_BRIDGE_REQUEST = 'mimoim/get_bion_client_info';
const MIMOIM_BRIDGE_RESPONSE = 'mimoim/get_bion_client_info_result';

function isAllowedMimoimOrigin(origin: string): boolean {
  // Dev defaults (match plasmo manifest externally_connectable too).
  return origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000';
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data as any;
  if (!data || data.type !== MIMOIM_BRIDGE_REQUEST) return;
  if (typeof event.origin === 'string' && event.origin && !isAllowedMimoimOrigin(event.origin)) return;

  const requestId = typeof data.requestId === 'string' ? data.requestId : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    chrome.runtime.sendMessage({ type: 'GET_BION_CLIENT_INFO' }, (resp) => {
      const payload = chrome.runtime.lastError
        ? { ok: false, error: chrome.runtime.lastError.message }
        : resp;
      window.postMessage({ type: MIMOIM_BRIDGE_RESPONSE, requestId, payload }, '*');
    });
  } catch (e) {
    window.postMessage(
      { type: MIMOIM_BRIDGE_RESPONSE, requestId, payload: { ok: false, error: e instanceof Error ? e.message : String(e) } },
      '*'
    );
  }
});

/**
 * 页面加载完成后初始化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDetector);
} else {
  // 如果脚本注入较晚，立即初始化
  initializeDetector();
}

/**
 * 页面卸载时清理资源
 */
window.addEventListener('beforeunload', () => {
  if (detector) {
    detector.destroy();
    detector = null;
  }
  setMimoTaskState('Idle');
});

/**
 * 处理页面可见性变化
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && detector) {
    // 页面变为可见时，重新检查状态
    const state = detector.getCurrentState();
    sendStateToBackground(state);
  }
});
