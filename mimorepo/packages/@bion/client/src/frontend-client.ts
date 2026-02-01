import { io, type Socket } from 'socket.io-client';
import { BionSocketEvent, decodeFrontendEnvelope, type BionFrontendMessageEnvelope, type BionFrontendToServerMessage } from '@bion/protocol';

export interface CreateBionFrontendClientOptions {
  url: string;
  namespace?: string;
  /**
   * Forwarded to Socket.IO handshake auth.
   */
  auth?: Record<string, unknown>;
  autoConnect?: boolean;
}

export interface BionFrontendClient {
  socket: Socket;
  connect(): Promise<void>;
  disconnect(): void;

  onEnvelope(handler: (envelope: BionFrontendMessageEnvelope) => void): () => void;
  /**
   * Raw `message` payload hook (before decode), useful for debugging.
   */
  onRawMessage(handler: (payload: unknown) => void): () => void;

  send(message: BionFrontendToServerMessage): void;
}

export function createBionFrontendClient(options: CreateBionFrontendClientOptions): BionFrontendClient {
  const { url, namespace = '/mimo', auth = {}, autoConnect = false } = options;

  const socket = io(`${url}${namespace}`, {
    autoConnect,
    auth: {
      clientType: 'page',
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

  const onRawMessage = (handler: (payload: unknown) => void) => {
    socket.on(BionSocketEvent.Message, handler);
    return () => socket.off(BionSocketEvent.Message, handler);
  };

  const onEnvelope = (handler: (envelope: BionFrontendMessageEnvelope) => void) => {
    const wrapped = (payload: unknown) => {
      const decoded = decodeFrontendEnvelope(payload);
      if (decoded) handler(decoded);
    };
    socket.on(BionSocketEvent.Message, wrapped);
    return () => socket.off(BionSocketEvent.Message, wrapped);
  };

  const send = (message: BionFrontendToServerMessage) => {
    socket.emit(BionSocketEvent.Message, message);
  };

  return {
    socket,
    connect,
    disconnect,
    onEnvelope,
    onRawMessage,
    send,
  };
}

