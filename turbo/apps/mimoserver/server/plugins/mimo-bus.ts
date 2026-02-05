import { defineNitroPlugin } from "nitropack/runtime";
import type { NitroApp } from "nitropack";
import { defineEventHandler } from "h3";
import { parse } from "node:url";
import { Server as Engine } from "engine.io";
import { Server as SocketIOServer } from "socket.io";
import { MimoSocketEvent, parseFrontendMessage, parsePluginMessage, type FrontendUserMessage, type FrontendEventEnvelope, type PluginMessage, type ActivateExtensionMessage, type FullStateSyncMessage, type TabEventMessage, type BrowserActionResult } from "mimo-protocol";
import { wrapSocketIO, type BusServer } from "mimo-bus/server";
import { ExtensionRegistry } from "@/modules/extension-registry";
import { SnapshotStore } from "@/modules/snapshot-store";
import { ActionScheduler } from "@/modules/action-scheduler";
import { ArtifactService } from "@/modules/artifact-service";
import { ToolRunner } from "@/agent/tool-runner";
import { AiGateway } from "@/agent/llm-gateway";
import { AgentOrchestrator } from "@/agent/orchestrator";
import { createId } from "@repo/mimo-utils";

export type MimoRuntime = {
  bus: BusServer;
  registry: ExtensionRegistry;
  snapshotStore: SnapshotStore;
  scheduler: ActionScheduler;
  artifacts: ArtifactService;
  orchestrator: AgentOrchestrator;
};

declare global {
  // eslint-disable-next-line no-var
  var __mimo: MimoRuntime | undefined;
}

function createSnapshotEnvelope(taskId: string, snapshot: ReturnType<SnapshotStore["getSnapshot"]>, seq: number): FrontendEventEnvelope {
  return {
    type: "event",
    id: createId("env"),
    taskId,
    timestamp: Date.now(),
    event: {
      id: createId("evt"),
      type: "snapshotSync",
      timestamp: Date.now(),
      mode: "full",
      seq,
      state: {
        windows: snapshot.windows,
        tabs: snapshot.tabs,
        tabGroups: snapshot.tabGroups,
        activeWindowId: snapshot.activeWindowId,
        activeTabId: snapshot.activeTabId,
        lastUpdated: snapshot.lastUpdated,
      },
    },
  };
}

function setupBus(bus: BusServer) {
  const registry = new ExtensionRegistry();
  const snapshotStore = new SnapshotStore();
  void snapshotStore.load();
  const artifacts = new ArtifactService();
  void artifacts.init().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[mimoserver] failed to init ArtifactService", err);
  });

  const scheduler = new ActionScheduler(bus);
  const llm = new AiGateway();
  const toolRunner = new ToolRunner(scheduler, artifacts);
  const orchestrator = new AgentOrchestrator(bus, registry, llm, toolRunner);

  let seq = 0;

  bus.nsp.on("connection", (socket) => {
    // Handle socket errors to prevent unhandled rejections
    socket.on("error", (err) => {
      // Silently ignore connection errors - they're expected during normal operation
      const code = (err as any)?.code;
      if (code !== "ECONNRESET" && code !== "EPIPE") {
        // eslint-disable-next-line no-console
        console.error("[mimo-bus] socket error", err);
      }
    });

    const auth = (socket.handshake as any)?.auth ?? {};
    const clientType = auth?.clientType;

    if (clientType === "plugin") {
      const clientId = typeof auth?.clientId === "string" ? auth.clientId : "";
      if (clientId) {
        socket.join(`client:${clientId}`);
      }
    } else {
      socket.join("frontend");
    }

    // Frontend messages
    socket.on(MimoSocketEvent.FrontendMessage, async (payload: unknown, ack?: (response: unknown) => void) => {
      const parsed = parseFrontendMessage(payload);
      if (!parsed) {
        ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid frontend_message payload" } });
        return;
      }

      if (parsed.type === "user_message") {
        const userMsg = parsed as FrontendUserMessage;
        socket.join(`task:${userMsg.taskId}`);
        await orchestrator.handleUserMessage(userMsg);
        ack?.({ ok: true });
      }
    });

    // Plugin messages
    socket.on(MimoSocketEvent.PluginMessage, async (payload: unknown, ack?: (response: unknown) => void) => {
      const parsed = parsePluginMessage(payload);
      if (!parsed) {
        ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid plugin_message payload" } });
        return;
      }

      const msg = parsed as PluginMessage;

      if (msg.type === "activate_extension") {
        const activateMsg = msg as ActivateExtensionMessage;
        await registry.register(
          {
            extensionId: "unknown",
            extensionName: activateMsg.browserName || "mimo",
            clientId: activateMsg.clientId,
            ua: activateMsg.ua,
            version: activateMsg.version,
            browserName: activateMsg.browserName,
            allowOtherClient: activateMsg.allowOtherClient,
          },
          socket as any
        );
        ack?.({ ok: true });
        return;
      }

      if (msg.type === "full_state_sync") {
        snapshotStore.applyFullSync(msg as FullStateSyncMessage);
        seq += 1;
        const snapshot = snapshotStore.getSnapshot();
        bus.broadcastFrontendEvent(createSnapshotEnvelope("global", snapshot, seq));
        ack?.({ ok: true });
        return;
      }

      if (msg.type === "tab_event") {
        snapshotStore.applyTabEvent(msg as TabEventMessage);
        seq += 1;
        const snapshot = snapshotStore.getSnapshot();
        bus.broadcastFrontendEvent(createSnapshotEnvelope("global", snapshot, seq));
        ack?.({ ok: true });
        return;
      }

      if (msg.type === "browser_action_result") {
        scheduler.handleResult(msg as BrowserActionResult);
        ack?.({ ok: true });
        return;
      }

      // `browser_action` is server -> plugin. If it appears inbound, ignore.
    });

    socket.on("disconnect", () => {
      void registry.markOfflineBySocket(socket.id).catch(() => null);
    });
  });

  return { registry, snapshotStore, scheduler, artifacts, orchestrator };
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  if (globalThis.__mimo) return;

  // eslint-disable-next-line no-console
  console.log("[mimoserver] mimo-bus: Setting up Socket.IO with nitroApp.router.use()");

  const corsOrigins = (process.env.MIMO_CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const cors = {
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  const engine = new Engine({ cors });
  const io = new SocketIOServer({ cors });

  io.bind(engine);

  // Hook the Socket.IO server to the Nitro router
  nitroApp.router.use("/socket.io/", defineEventHandler({
    handler(event) {
      // Add _query property required by Engine
      setEngineQuery(event.node.req as any);
      engine.handleRequest(event.node.req as any, event.node.res);
      event._handled = true;
    },
    websocket: {
      open(peer) {
        setEngineQuery(peer._internal.nodeReq as any);
        // @ts-expect-error - accessing internal properties for WebSocket integration
        engine.prepare(peer._internal.nodeReq);
        // @ts-expect-error - accessing internal properties for WebSocket integration
        engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
      },
    },
  }));

  const bus = wrapSocketIO(io);
  const runtime = setupBus(bus);

  globalThis.__mimo = { bus, ...runtime };
});

function setEngineQuery(req: { url?: string; _query?: Record<string, unknown> }) {
  if (!req || req._query) return;
  const parsed = parse(req.url || "", true);
  req._query = (parsed.query ?? {}) as Record<string, unknown>;
}
