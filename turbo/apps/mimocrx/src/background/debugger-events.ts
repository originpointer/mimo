import type { PluginBusClient } from "mimo-bus/client";
import type { DebuggerEventMessage } from "mimo-protocol";

type DebuggerEventsHandler = {
  start(): Promise<void>;
  stop(): void;
};

export function createDebuggerEventsHandler(client: PluginBusClient): DebuggerEventsHandler {
  let started = false;
  const cleanup: Array<() => void> = [];

  const emitDebuggerEvent = (payload: Omit<DebuggerEventMessage, "type" | "timestamp">) => {
    const message: DebuggerEventMessage = {
      type: "debugger_event",
      timestamp: Date.now(),
      ...payload,
    };
    client.emit(message as any);
  };

  const start = async () => {
    if (started) return;
    started = true;

    // 监听 debugger CDP 事件
    const onDebuggerEvent = (source: chrome.debugger.Debuggee, method?: string, params?: unknown) => {
      if (!source.tabId) return;

      emitDebuggerEvent({
        eventType: "cdp_event",
        tabId: source.tabId,
        method,
        params,
      });

      console.log(`[mimocrx] Debugger CDP event: ${method} for tab ${source.tabId}`);
    };

    // 监听 debugger detach 事件
    const onDebuggerDetach = (source: chrome.debugger.Debuggee, reason?: string) => {
      if (!source.tabId) return;

      emitDebuggerEvent({
        eventType: "detached",
        tabId: source.tabId,
        reason,
      });

      console.log(`[mimocrx] Debugger detached from tab ${source.tabId}, reason: ${reason}`);
    };

    chrome.debugger.onEvent.addListener(onDebuggerEvent);
    chrome.debugger.onDetach.addListener(onDebuggerDetach);

    cleanup.push(() => chrome.debugger.onEvent.removeListener(onDebuggerEvent));
    cleanup.push(() => chrome.debugger.onDetach.removeListener(onDebuggerDetach));
  };

  const stop = () => {
    if (!started) return;
    started = false;
    for (const dispose of cleanup.splice(0, cleanup.length)) {
      dispose();
    }
  };

  return { start, stop };
}
