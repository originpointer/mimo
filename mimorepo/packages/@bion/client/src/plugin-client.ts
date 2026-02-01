import { io, type Socket } from 'socket.io-client';
import { BionSocketEvent, decodePluginMessage, encodePluginMessage, type BionPluginMessage, type BionBrowserActionMessage, type BionBrowserActionResult } from '@bion/protocol';

export interface CreateBionPluginClientOptions {
  url: string;
  namespace?: string;
  /**
   * Forwarded to Socket.IO handshake auth.
   */
  auth?: Record<string, unknown>;
  autoConnect?: boolean;
}

export interface BionPluginCommandContext {
  /**
   * Decoded message payload.
   */
  message: BionPluginMessage;
  /**
   * Acknowledge callback if the server expects an ack.
   */
  ack?: (response: unknown) => void;
}

export interface BionPluginClient {
  socket: Socket;
  connect(): Promise<void>;
  disconnect(): void;

  onMessage(handler: (ctx: BionPluginCommandContext) => void): () => void;
  /**
   * Convenience for handling `browser_action` and replying with a result.
   */
  onBrowserAction(handler: (msg: BionBrowserActionMessage) => Promise<BionBrowserActionResult> | BionBrowserActionResult): () => void;

  emit(message: BionPluginMessage): void;
}

export function createBionPluginClient(options: CreateBionPluginClientOptions): BionPluginClient {
  const { url, namespace = '/mimo', auth = {}, autoConnect = false } = options;

  const socket = io(`${url}${namespace}`, {
    autoConnect,
    auth: {
      clientType: 'extension',
      ...auth,
    },
  });

  const connect = async () => {
    if (socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        socket.off('connect_error', onError);
        resolve();
      };
      const onError = (err: unknown) => {
        socket.off('connect', onConnect);
        reject(err);
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.connect();
    });
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const onMessage = (handler: (ctx: BionPluginCommandContext) => void) => {
    const wrapped = (payload: unknown, ack?: (response: unknown) => void) => {
      const decoded = decodePluginMessage(payload) ?? (payload as any);
      handler({ message: decoded, ack });
    };
    socket.on(BionSocketEvent.BrowserExtensionMessage, wrapped);
    return () => socket.off(BionSocketEvent.BrowserExtensionMessage, wrapped);
  };

  const onBrowserAction = (handler: (msg: BionBrowserActionMessage) => Promise<BionBrowserActionResult> | BionBrowserActionResult) => {
    return onMessage(async ({ message, ack }) => {
      if (!ack) return;
      if ((message as any)?.type !== 'browser_action') return;
      const result = await handler(message as BionBrowserActionMessage);
      ack(encodePluginMessage(result));
    });
  };

  const emit = (message: BionPluginMessage) => {
    socket.emit(BionSocketEvent.BrowserExtensionMessage, encodePluginMessage(message));
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

