import { io, type Socket } from "socket.io-client";
import { MIMO_NAMESPACE, MimoSocketEvent, type PluginMessage, type BrowserActionMessage, type BrowserActionResult } from "mimo-protocol";

export interface CreatePluginBusClientOptions {
  url: string;
  namespace?: string;
  transports?: Array<"websocket" | "polling">;
  auth?: Record<string, unknown>;
  autoConnect?: boolean;
}

export interface PluginBusCommandContext {
  message: PluginMessage;
  ack?: (response: unknown) => void;
}

export interface PluginBusClient {
  socket: Socket;
  connect(): Promise<void>;
  disconnect(): void;
  onMessage(handler: (ctx: PluginBusCommandContext) => void): () => void;
  onBrowserAction(handler: (msg: BrowserActionMessage) => Promise<BrowserActionResultLike> | BrowserActionResultLike): () => void;
  emit(message: PluginMessage): void;
}

export type BrowserActionResultLike =
  | BrowserActionResult
  | Pick<BrowserActionResult, "status" | "result" | "error" | "v">;

export function createPluginBusClient(options: CreatePluginBusClientOptions): PluginBusClient {
  const { url, namespace = MIMO_NAMESPACE, auth = {}, autoConnect = false, transports } = options;

  const socket = io(`${url}${namespace}`, {
    autoConnect,
    ...(transports ? { transports } : null),
    auth: {
      clientType: "plugin",
      ...auth,
    },
  });

  const connect = async () => {
    if (socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        socket.off("connect_error", onError);
        resolve();
      };
      const onError = (err: unknown) => {
        socket.off("connect", onConnect);
        reject(err);
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      socket.connect();
    });
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const onMessage = (handler: (ctx: PluginBusCommandContext) => void) => {
    const wrapped = (payload: unknown, ack?: (response: unknown) => void) => {
      handler({ message: payload as PluginMessage, ack });
    };
    socket.on(MimoSocketEvent.PluginMessage, wrapped);
    return () => socket.off(MimoSocketEvent.PluginMessage, wrapped);
  };

  const onBrowserAction = (
    handler: (msg: BrowserActionMessage) => Promise<BrowserActionResultLike> | BrowserActionResultLike
  ) => {
    return onMessage(async ({ message, ack }) => {
      if ((message as any)?.type !== "browser_action") return;
      const actionMsg = message as BrowserActionMessage;

      // Fast ack: "received + started". Execution result is sent later as `browser_action_result`.
      if (ack) {
        try {
          ack({ ok: true });
        } catch {
          // ignore ack errors
        }
      }

      try {
        const partial = await handler(actionMsg);
        const result: BrowserActionResult = {
          type: "browser_action_result",
          v: (partial as any)?.v,
          actionId: actionMsg.id,
          taskId: actionMsg.taskId,
          clientId: actionMsg.clientId,
          status: (partial as any)?.status ?? "error",
          result: (partial as any)?.result,
          error: (partial as any)?.error,
        };
        socket.emit(MimoSocketEvent.PluginMessage, result);
      } catch (err) {
        const result: BrowserActionResult = {
          type: "browser_action_result",
          actionId: actionMsg.id,
          taskId: actionMsg.taskId,
          clientId: actionMsg.clientId,
          status: "error",
          error: { code: "PLUGIN_ERROR", message: err instanceof Error ? err.message : String(err) },
        };
        socket.emit(MimoSocketEvent.PluginMessage, result);
      }
    });
  };

  const emit = (message: PluginMessage) => {
    socket.emit(MimoSocketEvent.PluginMessage, message);
  };

  return {
    socket,
    connect,
    disconnect,
    onMessage,
    onBrowserAction,
    emit,
  };
}
