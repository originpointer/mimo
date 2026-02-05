import { io, type Socket } from "socket.io-client";
import { MIMO_NAMESPACE, MimoSocketEvent, type FrontendEventEnvelope, type FrontendToServerMessage } from "mimo-protocol";

export interface CreateFrontendBusClientOptions {
  url: string;
  namespace?: string;
  auth?: Record<string, unknown>;
  autoConnect?: boolean;
}

export interface FrontendBusClient {
  socket: Socket;
  connect(): Promise<void>;
  disconnect(): void;
  onEvent(handler: (envelope: FrontendEventEnvelope) => void): () => void;
  onRawEvent(handler: (payload: unknown) => void): () => void;
  send(message: FrontendToServerMessage): void;
}

export function createFrontendBusClient(options: CreateFrontendBusClientOptions): FrontendBusClient {
  const { url, namespace = MIMO_NAMESPACE, auth = {}, autoConnect = false } = options;

  const socket = io(`${url}${namespace}`, {
    autoConnect,
    auth: {
      clientType: "frontend",
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

  const onRawEvent = (handler: (payload: unknown) => void) => {
    socket.on(MimoSocketEvent.FrontendEvent, handler);
    return () => socket.off(MimoSocketEvent.FrontendEvent, handler);
  };

  const onEvent = (handler: (envelope: FrontendEventEnvelope) => void) => {
    const wrapped = (payload: unknown) => {
      if ((payload as any)?.type === "event") {
        handler(payload as FrontendEventEnvelope);
      }
    };
    socket.on(MimoSocketEvent.FrontendEvent, wrapped);
    return () => socket.off(MimoSocketEvent.FrontendEvent, wrapped);
  };

  const send = (message: FrontendToServerMessage) => {
    socket.emit(MimoSocketEvent.FrontendMessage, message);
  };

  return {
    socket,
    connect,
    disconnect,
    onEvent,
    onRawEvent,
    send,
  };
}
