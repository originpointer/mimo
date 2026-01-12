/**
 * Background Script - 页面状态管理
 * 
 * 在 background service worker 中运行，管理页面状态并与 server 同步
 */

import { type PageStateInfo, PageLoadState } from '../types/page-state';
import { STAGEHAND_XPATH_SCAN, type StagehandXPathScanPayload, type StagehandXPathScanResponse } from '../types/stagehand-xpath';

interface TabState {
  tabId: number;
  url: string;
  state: PageLoadState;
  lastUpdate: number;
  frameStates: Map<number, PageStateInfo>;
}

class PageStateManager {
  private tabStates: Map<number, TabState> = new Map();
  private stateQueue: PageStateInfo[] = [];
  private syncTimer?: number;
  private readonly SYNC_INTERVAL = 1000; // 1秒同步一次
  private readonly SERVER_URL = process.env.PLASMO_PUBLIC_SERVER_URL || 'http://localhost:3000';

  constructor() {
    this.setupWebNavigationListeners();
    this.setupTabsListeners();
    this.setupMessageListeners();
    this.startSyncLoop();
  }

  /**
   * 设置 webNavigation 事件监听
   */
  private setupWebNavigationListeners() {
    // 导航开始前
    chrome.webNavigation.onBeforeNavigate.addListener((details) => {
      if (details.frameId === 0) {
        // 主 frame
        this.updateTabState(details.tabId, {
          state: PageLoadState.NAVIGATING,
          url: details.url,
          timestamp: details.timeStamp,
        });
      }
    });

    // DOM 内容加载完成
    chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
      if (details.frameId === 0) {
        this.updateTabState(details.tabId, {
          state: PageLoadState.DOM_READY,
          url: details.url,
          timestamp: details.timeStamp,
        });
      }
    });

    // 页面加载完成
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.updateTabState(details.tabId, {
          state: PageLoadState.RESOURCE_LOADING,
          url: details.url,
          timestamp: details.timeStamp,
        });
      }
    });

    // 历史状态更新（SPA 路由变化）
    chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
      if (details.frameId === 0) {
        this.updateTabState(details.tabId, {
          state: PageLoadState.NAVIGATING,
          url: details.url,
          timestamp: details.timeStamp,
        });
      }
    });

    // 加载错误
    chrome.webNavigation.onErrorOccurred.addListener((details) => {
      if (details.frameId === 0) {
        this.updateTabState(details.tabId, {
          state: PageLoadState.ERROR,
          url: details.url,
          timestamp: details.timeStamp,
          details: {
            error: `Navigation error: ${details.error}`,
          },
        });
      }
    });
  }

  /**
   * 设置 tabs 事件监听
   */
  private setupTabsListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading') {
        this.updateTabState(tabId, {
          state: PageLoadState.DOM_LOADING,
          url: tab.url || '',
          timestamp: Date.now(),
        });
      } else if (changeInfo.status === 'complete') {
        // 注意：complete 状态可能早于实际内容加载完成
        // 实际状态应该由 content script 报告
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
    });
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PAGE_STATE_CHANGE') {
        const stateInfo = message.payload as PageStateInfo;
        const tabId = sender.tab?.id;

        if (tabId) {
          stateInfo.tabId = tabId;
          stateInfo.frameId = sender.frameId || 0;

          this.updateTabState(tabId, stateInfo);
          this.queueStateForSync(stateInfo);
        }

        sendResponse({ success: true });
        return true;
      }

      if (message.type === 'GET_TAB_STATE') {
        const tabId = message.tabId;
        const tabState = this.tabStates.get(tabId);
        sendResponse(tabState || null);
        return true;
      }

      // Tab Page -> Background -> Content: 扫描当前活动标签页并生成 XPath
      if (message.type === STAGEHAND_XPATH_SCAN) {
        const payload = message.payload as Partial<StagehandXPathScanPayload> | undefined;
        const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

        const isScannableUrl = (url: string | undefined): boolean => {
          const u = String(url || '');
          if (!u) return false;
          const blocked = [
            'chrome://',
            'edge://',
            'about:',
            'devtools://',
            'chrome-extension://',
            'moz-extension://',
            'view-source:',
            'file://',
          ];
          return !blocked.some((p) => u.startsWith(p));
        };

        const tryInjectContentScript = async (tabId: number): Promise<boolean> => {
          try {
            // 从 manifest 动态取 content script 文件名（Plasmo 会生成 hash 文件名）
            const mf = chrome.runtime.getManifest();
            const file = mf?.content_scripts?.[0]?.js?.[0];
            if (!file) return false;

            return await new Promise((resolve) => {
              try {
                chrome.scripting.executeScript(
                  {
                    target: { tabId },
                    files: [file],
                  },
                  () => {
                    if (chrome.runtime.lastError) return resolve(false);
                    resolve(true);
                  },
                );
              } catch {
                resolve(false);
              }
            });
          } catch {
            return false;
          }
        };

        const sendToTab = (tabId: number) => {
          chrome.tabs.get(tabId, (tab) => {
            const tabUrl = tab?.url;
            if (chrome.runtime.lastError) {
              sendResponse({
                ok: false,
                error: `tabs.get failed: ${chrome.runtime.lastError.message}`,
              } satisfies StagehandXPathScanResponse);
              return;
            }
            if (!isScannableUrl(tabUrl)) {
              sendResponse({
                ok: false,
                error: `目标 Tab 不可扫描（url=${tabUrl || 'unknown'}）。请使用 http/https 页面。`,
              } satisfies StagehandXPathScanResponse);
              return;
            }

            const sendOnce = (onDone: (resp: unknown) => void) => {
              chrome.tabs.sendMessage(
                tabId,
                {
                  type: STAGEHAND_XPATH_SCAN,
                  payload,
                },
                (resp) => onDone(resp),
              );
            };

            // 先发一次；若发现没有接收端，则尝试注入 content script 后重试一次
            sendOnce(async (resp) => {
              const errMsg = chrome.runtime.lastError?.message;
              if (errMsg && errMsg.includes('Receiving end does not exist')) {
                const injected = await tryInjectContentScript(tabId);
                if (injected) {
                  sendOnce((resp2) => {
                    if (chrome.runtime.lastError) {
                      sendResponse({
                        ok: false,
                        error: `sendMessage failed: ${chrome.runtime.lastError.message} (tabId=${tabId}, url=${tabUrl || 'unknown'})`,
                      } satisfies StagehandXPathScanResponse);
                      return;
                    }
                    sendResponse(
                      (resp2 || { ok: false, error: 'No response from content script' }) satisfies StagehandXPathScanResponse,
                    );
                  });
                  return;
                }
              }

              if (chrome.runtime.lastError) {
                sendResponse({
                  ok: false,
                  error: `sendMessage failed: ${chrome.runtime.lastError.message} (tabId=${tabId}, url=${tabUrl || 'unknown'})`,
                } satisfies StagehandXPathScanResponse);
                return;
              }
              sendResponse(
                (resp || { ok: false, error: 'No response from content script' }) satisfies StagehandXPathScanResponse,
              );
            });
          });
        };

        if (requestedTabId != null) {
          sendToTab(requestedTabId);
          return true;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs?.[0]?.id;
          if (!tabId) {
            sendResponse({ ok: false, error: 'No active tab found' } satisfies StagehandXPathScanResponse);
            return;
          }
          sendToTab(tabId);
        });

        return true;
      }

      return false;
    });
  }

  /**
   * 更新 Tab 状态
   */
  private updateTabState(tabId: number, stateInfo: Partial<PageStateInfo>) {
    let tabState = this.tabStates.get(tabId);

    if (!tabState) {
      tabState = {
        tabId,
        url: stateInfo.url || '',
        state: PageLoadState.UNKNOWN,
        lastUpdate: Date.now(),
        frameStates: new Map(),
      };
      this.tabStates.set(tabId, tabState);
    }

    if (stateInfo.url) {
      tabState.url = stateInfo.url;
    }
    if (stateInfo.state) {
      tabState.state = stateInfo.state;
    }
    tabState.lastUpdate = Date.now();

    // 更新 frame 状态
    const frameId = stateInfo.frameId || 0;
    const fullStateInfo: PageStateInfo = {
      state: stateInfo.state || tabState.state,
      url: stateInfo.url || tabState.url,
      tabId,
      frameId,
      timestamp: stateInfo.timestamp || Date.now(),
      details: stateInfo.details,
    };
    tabState.frameStates.set(frameId, fullStateInfo);
  }

  /**
   * 将状态加入同步队列
   */
  private queueStateForSync(stateInfo: PageStateInfo) {
    this.stateQueue.push(stateInfo);

    // 如果队列过长，只保留最新的状态
    if (this.stateQueue.length > 100) {
      this.stateQueue = this.stateQueue.slice(-50);
    }
  }

  /**
   * 启动同步循环
   */
  private startSyncLoop() {
    const sync = async () => {
      if (this.stateQueue.length > 0) {
        const statesToSync = this.stateQueue.splice(0);
        await this.syncStatesToServer(statesToSync);
      }

      this.syncTimer = setTimeout(sync, this.SYNC_INTERVAL) as unknown as number;
    };

    sync();
  }

  /**
   * 同步状态到 server
   */
  private async syncStatesToServer(states: PageStateInfo[]) {
    try {
      // 批量发送状态更新
      const response = await fetch(`${this.SERVER_URL}/api/page-states`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          states,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync page states to server:', response.statusText);
      }
    } catch (error) {
      console.error('Error syncing page states to server:', error);
      // 如果同步失败，将状态重新加入队列（限制重试次数）
      if (states.length < 50) {
        this.stateQueue.unshift(...states);
      }
    }
  }

  /**
   * 获取当前所有 Tab 的状态
   */
  public getAllTabStates(): TabState[] {
    return Array.from(this.tabStates.values());
  }

  /**
   * 获取特定 Tab 的状态
   */
  public getTabState(tabId: number): TabState | undefined {
    return this.tabStates.get(tabId);
  }
}

// 初始化状态管理器
const stateManager = new PageStateManager();

// 导出供其他模块使用
export default stateManager;
