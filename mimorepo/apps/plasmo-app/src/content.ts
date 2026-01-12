/**
 * Content Script - 页面状态监听
 * 
 * 在页面上下文中运行，使用 Observer 监听页面加载状态
 */

import { PageStateDetector } from './utils/page-state-detector';
import { PageStateInfo } from './types/page-state';

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
