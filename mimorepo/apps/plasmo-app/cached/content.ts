/**
 * Content Script - 页面状态监听
 * 
 * 在页面上下文中运行，使用 Observer 监听页面加载状态
 */

import { PageStateDetector } from './utils/page-state-detector';
import { PageStateInfo } from './types/page-state';
// NOTE: @repo/sens 的 dist/utils/index.js 在当前仓库里可能尚未产出；这里使用 workspace 源码深导入，交给 Plasmo/Parcel 进行打包。
import { scanDomForXPaths } from '@repo/sens/src/utils/stagehand-xpath';
import {
  STAGEHAND_XPATH_SCAN,
  type StagehandXPathItem,
  type StagehandXPathScanOptions,
  type StagehandXPathScanPayload,
  type StagehandXPathScanResponse,
} from './types/stagehand-xpath';

let detector: PageStateDetector | null = null;

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

      sendResponse({
        ok: true,
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
