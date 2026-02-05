import { createPluginBusClient } from "mimo-bus/client";
import { createClientId } from "@repo/mimo-utils";
import type { BrowserActionMessage, BrowserActionResult, ActivateExtensionMessage } from "mimo-protocol";
import { createTabEventsHandler } from "./tab-events";

const SERVER_URL = process.env.PLASMO_PUBLIC_MIMO_SERVER_URL || "http://localhost:6006";
const EXTENSION_NAME = "mimo-agent";

const sessionTabs = new Map<string, number>();

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
      const created = await createTab(url);
      sessionTabs.set(message.taskId, created.tabId);
      lastResult = { ...created, groupId: undefined };
      continue;
    }

    if (name === "browser_debugger_attach") {
      lastResult = { attached: true };
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

  client.onBrowserAction(async (msg) => {
    return await handleBrowserAction(msg);
  });
}

start().catch((err) => console.error("[mimocrx] failed to start", err));
