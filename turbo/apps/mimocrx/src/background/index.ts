import { createPluginBusClient } from "mimo-bus/client";
import { createClientId } from "@repo/mimo-utils";
import type { BrowserActionMessage, BrowserActionResult, ActivateExtensionMessage } from "mimo-protocol";
import { createTabEventsHandler } from "./tab-events";
import { createDebuggerEventsHandler } from "./debugger-events";

// Chrome Tab Group color type (type definition varies across @types/chrome versions)
type TabGroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";

const SERVER_URL = process.env.PLASMO_PUBLIC_MIMO_SERVER_URL || "http://localhost:6006";
const EXTENSION_NAME = "mimo-agent";

// 任务与 tab/group/window 的映射关系
type TaskMapping = {
  tabId: number;
  groupId: number;
  windowId: number;
};
const taskMappings = new Map<string, TaskMapping>();

// 用于向后兼容的 sessionTabs (通过 taskId 获取 tabId)
const sessionTabs = new Map<string, number>();

// Debugger attach 状态
type DebuggerAttachState = {
  tabId: number;
  attached: boolean;
  retrying: boolean;
};
const debuggerStates = new Map<number, DebuggerAttachState>();

type BrowserActionExecutionResult = Pick<BrowserActionResult, "status" | "result" | "error">;

async function getOrCreateClientId(): Promise<string> {
  const stored = await chrome.storage.local.get("mimoClientId");
  if (stored?.mimoClientId) return stored.mimoClientId as string;
  const clientId = createClientId();
  await chrome.storage.local.set({ mimoClientId: clientId });
  return clientId;
}

async function createTab(url?: string): Promise<{ tabId: number; windowId: number; url: string; title?: string }> {
  return await new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url || "about:blank", active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!tab?.id || !tab?.windowId) {
        reject(new Error("Failed to create tab"));
        return;
      }
      resolve({ tabId: tab.id, windowId: tab.windowId, url: tab.url || "", title: tab.title || undefined });
    });
  });
}

async function waitForLoaded(tabId: number, timeoutMs = 20_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("NAVIGATION_TIMEOUT");
}

async function captureAndUpload(windowId: number, uploadUrl?: string): Promise<{ uploaded: boolean; dataUrl?: string }> {
  return await new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!dataUrl) {
        resolve({ uploaded: false });
        return;
      }
      if (uploadUrl) {
        const res = await fetch(uploadUrl, {
          method: "POST",
          body: await (await fetch(dataUrl)).blob(),
        });
        resolve({ uploaded: res.ok, dataUrl: res.ok ? undefined : dataUrl });
        return;
      }
      resolve({ uploaded: false, dataUrl });
    });
  });
}

// 单 tab 的 debugger attach（不带重试）
async function attachDebugger(tabId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));

      // 发送 Page.enable 验证
      chrome.debugger.sendCommand({ tabId }, "Page.enable", {}, () => {
        resolve(); // Page.enable 失败也认为 attach 成功
      });
    });
  });
}

// 单 tab 的 debugger attach（带重试）
async function attachDebuggerWithRetry(
  tabId: number,
  maxRetries: number = 10,  // 最多重试 10 次
  retryDelayMs: number = 1000  // 每次等待 1 秒
): Promise<{ tabId: number; success: boolean; error?: string }> {
  // 更新状态
  debuggerStates.set(tabId, { tabId, attached: false, retrying: true });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await attachDebugger(tabId);
      debuggerStates.set(tabId, { tabId, attached: true, retrying: false });
      console.log(`[mimocrx] Debugger attached to tab ${tabId} after ${attempt} attempts`);
      return { tabId, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // 检查是否是不可恢复的错误
      if (msg.includes("Cannot attach to this target") ||
          msg.includes("Target closed") ||
          msg.includes("Tab not found") ||
          msg.includes("Tab closed")) {
        debuggerStates.set(tabId, { tabId, attached: false, retrying: false });
        return { tabId, success: false, error: msg };
      }

      // 可恢复错误，等待后重试
      if (attempt < maxRetries) {
        console.log(`[mimocrx] Debugger attach attempt ${attempt + 1} failed for tab ${tabId}: ${msg}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  debuggerStates.set(tabId, { tabId, attached: false, retrying: false });
  return { tabId, success: false, error: "Max retries exceeded" };
}

// 单 tab 的 debugger detach
async function detachDebugger(tabId: number): Promise<{ tabId: number; success: boolean; error?: string }> {
  try {
    await new Promise<void>((resolve, reject) => {
      chrome.debugger.detach({ tabId }, () => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        resolve();
      });
    });

    debuggerStates.delete(tabId);
    console.log(`[mimocrx] Debugger detached from tab ${tabId}`);
    return { tabId, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mimocrx] Failed to detach debugger from tab ${tabId}: ${msg}`);
    return { tabId, success: false, error: msg };
  }
}

function ok(result?: Record<string, unknown>): BrowserActionExecutionResult {
  return { status: "success", result };
}

function err(message: string): BrowserActionExecutionResult {
  return { status: "error", error: { code: "PLUGIN_ERROR", message } };
}

async function handleBrowserAction(message: BrowserActionMessage): Promise<BrowserActionExecutionResult> {
  const entries = Object.entries(message.action ?? {});
  if (entries.length === 0) return err("Empty action");

  let lastResult: Record<string, unknown> | undefined;

  for (const [name, params] of entries) {
    if (name === "task_start") {
      const url = (params as any)?.url as string | undefined;
      const groupTitle = (params as any)?.groupTitle as string || "新任务";
      const groupColor = (params as any)?.groupColor as TabGroupColor || "blue";

      // 1. 创建新 tab（不抢焦点）
      const tab = await chrome.tabs.create({ url: url || "about:blank", active: false });
      if (!tab.id || !tab.windowId) {
        throw new Error("Failed to create tab");
      }

      // 2. 创建 tab group 并加入 tab
      const groupId = await chrome.tabs.group({ tabIds: tab.id });
      await chrome.tabGroups.update(groupId, {
        title: groupTitle,
        color: groupColor,
        collapsed: false,
      });

      // 3. 保存映射关系
      const mapping: TaskMapping = {
        tabId: tab.id,
        groupId,
        windowId: tab.windowId,
      };
      taskMappings.set(message.taskId, mapping);
      sessionTabs.set(message.taskId, tab.id);

      lastResult = {
        tabId: tab.id,
        groupId,
        windowId: tab.windowId,
        url: tab.url || "",
        title: tab.title,
      };

      // 记录 task_start 执行日志
      console.log(`[mimocrx] task_start completed`, {
        taskId: message.taskId,
        url,
        groupTitle,
        groupColor,
        tabId: tab.id,
        groupId,
        windowId: tab.windowId,
        result: lastResult,
      });
      continue;
    }

    if (name === "browser_debugger_attach") {
      const tabId = (params as any)?.tabId as number;
      if (!tabId) throw new Error("INVALID_TAB_ID");

      // 带重试的 attach
      const result = await attachDebuggerWithRetry(tabId);
      lastResult = {
        attached: result.success,
        tabId: result.tabId,
        error: result.error,
      };
      continue;
    }

    if (name === "browser_debugger_detach") {
      const tabId = (params as any)?.tabId as number;
      if (!tabId) throw new Error("INVALID_TAB_ID");

      const result = await detachDebugger(tabId);
      lastResult = {
        detached: result.success,
        tabId: result.tabId,
        error: result.error,
      };
      continue;
    }

    if (name === "browser_wait_for_loaded") {
      const tabId = (params as any)?.tabId ?? sessionTabs.get(message.taskId);
      if (!tabId) throw new Error("INVALID_TASK_TAB");
      const timeoutMs = (params as any)?.timeoutMs ?? 20_000;
      await waitForLoaded(tabId, timeoutMs);
      lastResult = { status: "complete" };
      continue;
    }

    if (name === "browser_screenshot") {
      const tabId = (params as any)?.tabId ?? sessionTabs.get(message.taskId);
      if (!tabId) throw new Error("INVALID_TASK_TAB");
      const tab = await chrome.tabs.get(tabId);
      const upload = await captureAndUpload(tab.windowId, message.screenshotPresignedUrl);
      lastResult = { screenshotUploaded: upload.uploaded, url: "" };
      continue;
    }

    if (name === "browser_readability_extract") {
      lastResult = { markdown: "" };
      continue;
    }

    if (name === "browser_dom_index" || name === "browser_xpath_scan") {
      lastResult = { elements: [] };
      continue;
    }

    if (name === "task_group_update") {
      const mapping = taskMappings.get(message.taskId);
      if (!mapping) {
        throw new Error("TASK_NOT_FOUND");
      }

      const newColor = (params as any)?.color as TabGroupColor;
      const newTitle = (params as any)?.title as string;

      const update: { color?: TabGroupColor; title?: string } = {};
      if (newColor) update.color = newColor;
      if (newTitle) update.title = newTitle;

      await chrome.tabGroups.update(mapping.groupId, update);
      lastResult = { updated: true };
      continue;
    }

    if (name === "browser_navigate") {
      const tabId = (params as any)?.tabId as number;
      const url = (params as any)?.url as string;

      if (!tabId || !url) {
        throw new Error("INVALID_PARAMS: tabId and url are required");
      }

      // 使用 chrome.tabs.update 在现有 tab 上导航
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.update(tabId, { url }, (tab) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message));
          if (!tab) return reject(new Error("Tab not found"));
          resolve();
        });
      });

      lastResult = { navigated: true, tabId, url };
      continue;
    }

    if (name === "browser_click") {
      lastResult = { clicked: true, strategy: "dom_click" };
      continue;
    }

    if (name === "browser_type") {
      lastResult = { typed: true, strategy: "dom_input" };
      continue;
    }

    if (name === "browser_get_html") {
      lastResult = { artifactId: "", url: "" };
      continue;
    }
  }

  return ok(lastResult);
}

async function start() {
  const clientId = await getOrCreateClientId();
  const client = createPluginBusClient({
    url: SERVER_URL,
    auth: { clientId, clientType: "plugin" },
    transports: ["websocket"],
  });

  const tabEvents = createTabEventsHandler(client);
  let tabEventsStarted = false;
  client.socket.on("connect", () => {
    if (!tabEventsStarted) return;
    void tabEvents.fullSync();
  });

  await client.connect();

  const activate: ActivateExtensionMessage = {
    type: "activate_extension",
    id: `${clientId}:activate`,
    clientId,
    ua: navigator.userAgent,
    version: "0.1.0",
    browserName: "chrome",
    allowOtherClient: false,
    skipAuthorization: true,
  };

  client.emit(activate as any);

  await tabEvents.start();
  tabEventsStarted = true;

  // 启动 debugger 事件处理器
  const debuggerEvents = createDebuggerEventsHandler(client);
  await debuggerEvents.start();

  client.onBrowserAction(async (msg) => {
    return await handleBrowserAction(msg);
  });

  // 监听 tab 创建，自动将新 tab 加入任务的 group
  chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.openerTabId || !tab.id) return;

    // 查找 opener tab 所属的任务
    for (const [taskId, mapping] of taskMappings.entries()) {
      // 如果 opener tab 是任务的主 tab，或者是任务 group 中的任何 tab
      const openerTab = await chrome.tabs.get(tab.openerTabId).catch(() => null);
      if (!openerTab) continue;

      // 检查 opener tab 是否属于这个任务的 group
      if (openerTab.groupId === mapping.groupId) {
        // 将新 tab 加入同一 group
        try {
          await chrome.tabs.group({
            groupId: mapping.groupId,
            tabIds: tab.id,
          });
          console.log(`[mimocrx] Auto-added tab ${tab.id} to task ${taskId} group ${mapping.groupId}`);
        } catch (err) {
          console.error(`[mimocrx] Failed to add tab to group:`, err);
        }
        break;
      }
    }
  });
}

start().catch((err) => console.error("[mimocrx] failed to start", err));
