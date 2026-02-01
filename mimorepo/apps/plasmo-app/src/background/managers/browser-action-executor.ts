import type { BionBrowserActionMessage, BionBrowserActionResult, BionPluginMessage } from '@bion/protocol';

import { TabResolver } from '../utils/tab-resolver';
import { DebuggerSessionManager } from './debugger-session-manager';

type PluginEmitter = (msg: BionPluginMessage) => void;

function ok(actionId: string, result?: BionBrowserActionResult['result']): BionBrowserActionResult {
  return result ? { actionId, status: 'success', result } : { actionId, status: 'success' };
}

function err(actionId: string, e: unknown): BionBrowserActionResult {
  return { actionId, status: 'error', error: e instanceof Error ? e.message : String(e) };
}

async function sendToContent(tabId: number, message: unknown): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, () => {
        // Ignore runtime.lastError (e.g. missing receiver). Session can still proceed.
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

async function sendToContentWithRetry(tabId: number, message: unknown, attempts = 5): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, () => resolve());
      } catch {
        resolve();
      }
    });
    // If receiver didn't exist, Chrome sets lastError; give it time to inject.
    const lastErr = chrome.runtime.lastError?.message;
    if (!lastErr) return;
    await new Promise((r) => setTimeout(r, 150 + i * 150));
  }
}

async function sendToContentRequest<T>(tabId: number, message: unknown, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const resp = await new Promise<{ ok: true; value: T } | { ok: false; err?: string }>((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (value) => {
          const lastErr = chrome.runtime.lastError?.message;
          if (lastErr) resolve({ ok: false, err: lastErr });
          else resolve({ ok: true, value: value as T });
        });
      } catch (e) {
        resolve({ ok: false, err: e instanceof Error ? e.message : String(e) });
      }
    });

    if (resp.ok) return resp.value;
    // If receiver didn't exist, give it time to inject.
    await new Promise((r) => setTimeout(r, 150 + i * 150));
  }
  throw new Error('Failed to send message to content script (no receiver)');
}

async function createTab(params: { url: string; active: boolean }): Promise<{ tabId: number; tabUrl: string }> {
  return await new Promise((resolve, reject) => {
    chrome.tabs.create({ url: params.url, active: params.active, index: 0 }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!tab || typeof tab.id !== 'number') {
        reject(new Error('Failed to create tab'));
        return;
      }
      resolve({ tabId: tab.id, tabUrl: tab.url || '' });
    });
  });
}

async function createBackgroundWindowWithTab(params: {
  url: string;
}): Promise<{ tabId: number; tabUrl: string; windowId: number }> {
  const windowId = await new Promise<number>((resolve, reject) => {
    chrome.windows.create({ url: params.url, focused: false }, (win) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const id = win?.id;
      if (typeof id !== 'number') {
        reject(new Error('Failed to create background window'));
        return;
      }
      resolve(id);
    });
  });

  const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
    chrome.tabs.query({ windowId }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const chosen = (tabs ?? []).find((t) => t.active) ?? (tabs ?? [])[0];
      if (!chosen || typeof chosen.id !== 'number') {
        reject(new Error('Failed to resolve tab from created window'));
        return;
      }
      resolve(chosen);
    });
  });

  return { tabId: tab.id, tabUrl: tab.url || '', windowId };
}

async function groupTab(params: { tabId: number; title: string; color?: string; collapsed?: boolean }): Promise<number> {
  const groupId = await new Promise<number>((resolve, reject) => {
    chrome.tabs.group({ tabIds: [params.tabId] }, (gid) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(gid);
    });
  });

  await new Promise<void>((resolve) => {
    chrome.tabGroups.update(
      groupId,
      { title: params.title, color: (params.color as any) ?? 'blue', collapsed: params.collapsed ?? false },
      () => resolve()
    );
  });

  return groupId;
}

export class BrowserActionExecutor {
  constructor(
    private readonly debuggerSessions: DebuggerSessionManager,
    private readonly emitPluginMessage: PluginEmitter
  ) {}

  async execute(msg: BionBrowserActionMessage): Promise<BionBrowserActionResult> {
    const actionId = msg.id;
    try {
      const entries = Object.entries(msg.action ?? {});
      if (entries.length === 0) return err(actionId, new Error('Empty browser_action.action'));

      // Some callers may pack multiple actions in one message; execute sequentially.
      let lastResult: BionBrowserActionResult['result'] | undefined;
      for (const [name, params] of entries) {
        const res = await this.executeOne({
          name,
          params: (params ?? {}) as Record<string, unknown>,
          sessionId: msg.sessionId,
          actionId,
        });
        if (res) lastResult = res;
      }

      return ok(actionId, lastResult);
    } catch (e) {
      return err(actionId, e);
    }
  }

  private async resolveTargetTabId(params: Record<string, unknown>, sessionId: string): Promise<number> {
    const requested =
      typeof (params as any).tabId === 'number'
        ? (params as any).tabId
        : typeof (params as any).targetTabId === 'number'
          ? (params as any).targetTabId
          : undefined;

    const existing = this.debuggerSessions.findTabIdBySessionId(sessionId);
    const tabId = existing ?? (await TabResolver.resolveTab(requested)).tabId;
    return tabId;
  }

  private async executeOne(input: {
    name: string;
    params: Record<string, unknown>;
    sessionId: string;
    actionId: string;
  }): Promise<BionBrowserActionResult['result'] | null> {
    const { name, params, sessionId } = input;

    if (name === 'session/start') {
      const existingTabId = this.debuggerSessions.findTabIdBySessionId(sessionId);
      if (existingTabId) {
        const requestId = typeof params.requestId === 'string' ? params.requestId : undefined;
        const summary = typeof params.summary === 'string' ? params.summary : undefined;
        const title = typeof params.title === 'string' ? params.title : summary;
        await sendToContentWithRetry(existingTabId, {
          type: 'session/start',
          payload: { sessionId, requestId, summary, title },
        });
        return null;
      }

      const requestId = typeof params.requestId === 'string' ? params.requestId : undefined;
      const summary = typeof params.summary === 'string' ? params.summary : undefined;
      const title = typeof params.title === 'string' ? params.title : summary || '浏览器任务';
      const initialUrl =
        typeof params.initialUrl === 'string' && (params.initialUrl.startsWith('http://') || params.initialUrl.startsWith('https://'))
          ? params.initialUrl
          : null;

      // Requirement: create a dedicated tab + tabGroup for this task, then run everything on that tab.
      // Ensure initial URL is a normal web page so content script can load.
      const tab = await createBackgroundWindowWithTab({ url: initialUrl || 'https://example.com/' });
      const groupId = await groupTab({ tabId: tab.tabId, title, color: 'blue', collapsed: false });

      await sendToContentWithRetry(tab.tabId, {
        type: 'session/start',
        payload: { sessionId, requestId, summary, title, tabId: tab.tabId, groupId },
      });

      await this.debuggerSessions.attach({ tabId: tab.tabId, sessionId, requestId, groupId, title });

      this.emitPluginMessage({
        type: 'session_status',
        sessionId,
        sessionTitle: title,
        status: 'running',
        timestamp: Date.now(),
      });

      return null;
    }

    if (name === 'session/stop') {
      const tabId = await this.resolveTargetTabId(params, sessionId);

      await sendToContent(tabId, { type: 'session/stop', payload: { sessionId } });
      await this.debuggerSessions.detach(tabId);

      this.emitPluginMessage({
        type: 'session_status',
        sessionId,
        sessionTitle: 'Browser task',
        status: 'stopped',
        timestamp: Date.now(),
      });
      return null;
    }

    // A minimal, commonly used action: navigation.
    if (name === 'browser_navigate') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const url = typeof params.url === 'string' ? params.url : '';
      if (!url) throw new Error('browser_navigate.url is required');

      const attached = this.debuggerSessions.getSessionByTabId(tabId);
      if (attached) {
        await chrome.debugger.sendCommand({ tabId }, 'Page.navigate', { url });
      } else {
        await new Promise<void>((resolve, reject) => {
          chrome.tabs.update(tabId, { url }, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      }

      return null;
    }

    if (name === 'browser_click') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const selector = typeof (params as any).selector === 'string' ? String((params as any).selector) : undefined;
      const xpath = typeof (params as any).xpath === 'string' ? String((params as any).xpath) : undefined;
      const resp = await sendToContentRequest<{ ok: boolean; error?: string }>(tabId, {
        type: 'browser/click',
        payload: { selector, xpath },
      });
      if (!resp?.ok) throw new Error(resp?.error || 'browser_click failed');
      return null;
    }

    if (name === 'browser_fill') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const selector = typeof (params as any).selector === 'string' ? String((params as any).selector) : undefined;
      const xpath = typeof (params as any).xpath === 'string' ? String((params as any).xpath) : undefined;
      const text = typeof (params as any).text === 'string' ? String((params as any).text) : '';
      const resp = await sendToContentRequest<{ ok: boolean; error?: string }>(tabId, {
        type: 'browser/fill',
        payload: { selector, xpath, text },
      });
      if (!resp?.ok) throw new Error(resp?.error || 'browser_fill failed');
      return null;
    }

    if (name === 'browser_getContent' || name === 'browser_get_content') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const maxChars = typeof (params as any).maxChars === 'number' ? (params as any).maxChars : undefined;
      const tab = await chrome.tabs.get(tabId);

      const resp = await sendToContentRequest<{
        ok: boolean;
        error?: string;
        url?: string;
        title?: string;
        text?: string;
        viewportWidth?: number;
        viewportHeight?: number;
      }>(tabId, { type: 'browser/get_content', payload: { maxChars } });

      if (!resp?.ok) throw new Error(resp?.error || 'browser_getContent failed');

      const url = resp.url || tab.url || '';
      const title = resp.title || tab.title || '';
      const text = resp.text || '';

      return {
        url,
        title,
        result: '',
        elements: '',
        markdown: text,
        fullMarkdown: text,
        viewportWidth: typeof resp.viewportWidth === 'number' ? resp.viewportWidth : 0,
        viewportHeight: typeof resp.viewportHeight === 'number' ? resp.viewportHeight : 0,
        pixelsAbove: 0,
        pixelsBelow: 0,
        newPages: [],
        screenshotUploaded: false,
        cleanScreenshotUploaded: false,
      };
    }

    if (name === 'browser_screenshot') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const tab = await chrome.tabs.get(tabId);
      const attached = this.debuggerSessions.getSessionByTabId(tabId);

      // Best-effort capture (not uploaded yet).
      // Prefer CDP capture when debugger is attached to avoid focusing any window.
      let capturedViaDebugger = false;
      if (attached) {
        try {
          await chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', { format: 'png' });
          capturedViaDebugger = true;
        } catch {
          capturedViaDebugger = false;
        }
      }

      if (!capturedViaDebugger) {
        const windowId = typeof tab.windowId === 'number' ? tab.windowId : chrome.windows.WINDOW_ID_CURRENT;
        await new Promise<void>((resolve) => {
          try {
            chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, () => resolve());
          } catch {
            resolve();
          }
        });
      }

      return {
        url: tab.url || '',
        title: tab.title || '',
        result: '',
        elements: '',
        markdown: '',
        fullMarkdown: '',
        viewportWidth: 0,
        viewportHeight: 0,
        pixelsAbove: 0,
        pixelsBelow: 0,
        newPages: [],
        screenshotUploaded: false,
        cleanScreenshotUploaded: false,
      };
    }

    if (name === 'browser_xpathScan' || name === 'browser_xpath_scan') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const maxItems = typeof (params as any).maxItems === 'number' ? (params as any).maxItems : undefined;
      const selector = typeof (params as any).selector === 'string' ? String((params as any).selector) : undefined;
      const includeShadow = typeof (params as any).includeShadow === 'boolean' ? (params as any).includeShadow : undefined;

      const resp = await sendToContentRequest<any>(tabId, {
        type: 'browser/xpath_scan',
        payload: { maxItems, selector, includeShadow },
      });
      if (!resp?.ok) throw new Error(resp?.error || 'browser_xpathScan failed');
      return resp;
    }

    if (name === 'browser_xpathMarkElements' || name === 'browser_xpath_mark') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const xpaths = Array.isArray((params as any).xpaths) ? (params as any).xpaths : [];
      const modeRaw = typeof (params as any).mode === 'string' ? String((params as any).mode) : undefined;
      const mode = modeRaw === 'clear' ? 'clear' : 'mark';

      const resp = await sendToContentRequest<any>(tabId, {
        type: 'browser/xpath_mark',
        payload: { xpaths, mode },
      });
      if (!resp?.ok) throw new Error(resp?.error || 'browser_xpathMarkElements failed');
      return resp;
    }

    if (name === 'browser_xpathGetHtml' || name === 'browser_get_html') {
      const tabId = await this.resolveTargetTabId(params, sessionId);
      const xpath = typeof (params as any).xpath === 'string' ? String((params as any).xpath) : '';
      const maxChars = typeof (params as any).maxChars === 'number' ? (params as any).maxChars : undefined;
      if (!xpath) throw new Error('browser_xpathGetHtml.xpath is required');

      const resp = await sendToContentRequest<any>(tabId, {
        type: 'browser/xpath_get_html',
        payload: { xpath, maxChars },
      });
      if (!resp?.ok) throw new Error(resp?.error || 'browser_xpathGetHtml failed');
      return resp;
    }

    // Unknown actions: treat as no-op for now (keeps server/flow stable while we iterate).
    console.warn('[BrowserActionExecutor] Unhandled browser action', { name, sessionId, actionId });
    return null;
  }
}

