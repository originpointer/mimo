import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";
import {
  MIMO_NAMESPACE,
  MimoSocketEvent,
  type FrontendEventEnvelope,
  type PluginMessage,
} from "mimo-protocol";

export type BusServer = {
  io: SocketIOServer;
  nsp: ReturnType<SocketIOServer["of"]>;
  emitTaskEvent(taskId: string, envelope: FrontendEventEnvelope): void;
  broadcastFrontendEvent(envelope: FrontendEventEnvelope): void;
  emitPluginMessage(clientId: string, msg: PluginMessage, opts?: { ackTimeoutMs?: number }): Promise<unknown> | void;
  getPluginSocket(clientId: string): Socket | undefined;
};

function taskRoom(taskId: string) {
  return `task:${taskId}`;
}

/**
 * Creates a BusServer adapter that wraps a Socket.IO server.
 * This is used when the Socket.IO server is created externally (e.g., by Nitro plugin).
 */
export function wrapSocketIO(io: SocketIOServer): BusServer {
  const nsp = io.of(MIMO_NAMESPACE);

  // Handle socket-level errors to prevent unhandled rejections
  io.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[mimo-bus] socket.io error", err);
  });

  const pluginSockets = new Map<string, Socket>();

  // Track plugin sockets when they connect
  nsp.use((socket, next) => {
    const auth = (socket.handshake as any)?.auth ?? {};
    const clientType = auth?.clientType;

    if (clientType === "plugin") {
      const clientId = typeof auth?.clientId === "string" ? auth.clientId : "";
      if (clientId) {
        pluginSockets.set(clientId, socket);
        socket.data.clientId = clientId;
      }
    }

    socket.on("disconnect", () => {
      for (const [id, s] of pluginSockets.entries()) {
        if (s.id === socket.id) {
          pluginSockets.delete(id);
        }
      }
    });

    next();
  });

  return {
    io,
    nsp,
    emitTaskEvent(taskId, envelope) {
      nsp.to(taskRoom(taskId)).emit(MimoSocketEvent.FrontendEvent, envelope);
    },
    broadcastFrontendEvent(envelope) {
      nsp.to("frontend").emit(MimoSocketEvent.FrontendEvent, envelope);
    },
    emitPluginMessage(clientId, msg, opts) {
      const socket = pluginSockets.get(clientId);
      if (!socket) throw new Error(`No plugin connected for clientId=${clientId}`);
      if (opts?.ackTimeoutMs) {
        const promise = new Promise((resolve, reject) => {
          socket.timeout(opts.ackTimeoutMs as number).emit(MimoSocketEvent.PluginMessage, msg, (err: unknown, response: unknown) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
        // Attach an empty catch handler to mark the promise as "handled"
        promise.catch(() => {
          // Empty handler - just mark as handled to suppress warnings
        });
        return promise;
      }
      socket.emit(MimoSocketEvent.PluginMessage, msg);
    },
    getPluginSocket(clientId) {
      return pluginSockets.get(clientId);
    },
  };
}

/**
 * Legacy function for creating a Socket.IO server with an HTTP server.
 * This is kept for backward compatibility but may not work with Nitro.
 * @deprecated Use wrapSocketIO() instead with Nitro's router.use() approach.
 */
export function createBusServer(params: { httpServer: any; namespace?: string }): BusServer {
  const io = new SocketIOServer(params.httpServer, {
    transports: ["websocket"],
    // Prevent ECONNRESET errors from crashing the server
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  return wrapSocketIO(io);
}
