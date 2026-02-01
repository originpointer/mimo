import { defineNitroPlugin } from 'nitropack/runtime';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

import {
  BionSocketEvent,
  decodePluginMessage,
  encodeFrontendEnvelope,
  encodePluginMessage,
  type BionBrowserActionMessage,
  type BionBrowserActionResult,
  type BionFrontendEvent,
  type BionFrontendMessageEnvelope,
  type BionFrontendToServerMessage,
  type BionPluginMessage,
} from '@bion/protocol';
import { LLMProvider } from '@mimo/llm';
import { logger } from '../utils/logger';
import { persistLlmRun } from '../utils/persist-llm-run';

type ClientType = 'page' | 'extension' | 'unknown';

function getClientType(socket: Socket): ClientType {
  const t = (socket.handshake as any)?.auth?.clientType;
  if (t === 'page' || t === 'extension') return t;
  return 'unknown';
}

function sessionRoom(sessionId: string) {
  return `bion:session:${sessionId}`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
}

function extractUserText(msg: Partial<BionFrontendToServerMessage>): string {
  const anyMsg = msg as any;
  if (typeof anyMsg?.content === 'string' && anyMsg.content.length > 0) return anyMsg.content;

  const contents = anyMsg?.contents;
  if (Array.isArray(contents)) {
    return contents
      .filter((c: any) => c && c.type === 'text' && typeof c.value === 'string')
      .map((c: any) => c.value)
      .join('');
  }

  return '';
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * A minimal server-side Bion runtime stored on `globalThis`.
 * Other server routes can emit UI events or call plugins by reading `globalThis.__bion`.
 */
export type BionRuntime = {
  io: SocketIOServer;
  namespace: ReturnType<SocketIOServer['of']>;
  emitUiEvent(sessionId: string, event: BionFrontendEvent, envelopeId?: string): void;
  callPluginBrowserAction(clientId: string, msg: BionBrowserActionMessage, timeoutMs?: number): Promise<BionBrowserActionResult>;
  getPlugins(): { clientId: string; socketId: string }[];
};

declare global {
  // eslint-disable-next-line no-var
  var __bion: BionRuntime | undefined;
}

export default defineNitroPlugin((nitroApp) => {
  if (globalThis.__bion) {
    return;
  }

  const llmProvider = new LLMProvider();
  const defaultModel =
    process.env.MIMO_MODEL ||
    process.env.MIMO_LLM_MODEL ||
    process.env.LLM_MODEL ||
    'anthropic/claude-3-5-haiku';

  // sessionId -> chat history (best-effort, in-memory)
  const historyBySessionId = new Map<
    string,
    Array<{ role: 'system' | 'user' | 'assistant'; content: string; timestamp: number }>
  >();

  const port = 6007;
  const namespaceName = '/mimo';

  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io/',
  });

  const nsp = io.of(namespaceName);

  // plugin clientId -> socket
  const pluginByClientId = new Map<string, Socket>();

  nsp.on('connection', (socket) => {
    const clientType = getClientType(socket);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Bion] connected', { socketId: socket.id, clientType });
    }

    if (clientType === 'page') {
      socket.on(BionSocketEvent.Message, async (payload: unknown) => {
        const msg = payload as Partial<BionFrontendToServerMessage>;
        const sessionId = (msg as any)?.sessionId;
        if (typeof sessionId === 'string' && sessionId.length > 0) {
          socket.join(sessionRoom(sessionId));
        }

        if ((msg as any)?.type !== 'user_message') return;
        if (typeof sessionId !== 'string' || sessionId.length === 0) return;

        const userMessageId = typeof (msg as any)?.id === 'string' ? String((msg as any).id) : randomId();
        const userText = extractUserText(msg);
        if (!userText.trim()) return;

        // Append user message to session history.
        const history = historyBySessionId.get(sessionId) ?? [];
        history.push({ role: 'user', content: userText, timestamp: Date.now() });
        historyBySessionId.set(sessionId, history);

        const model = defaultModel;
        const llm = llmProvider.getClient(model);
        const temperature = 0.2;
        const maxTokens = 800;
        const startedAt = Date.now();

        // Stream text tokens as chatDelta
        let assistantAccum = '';
        let lastUsage: unknown | null = null;
        const llmActionId = `llm:${sessionId}:${userMessageId}`;
        try {
          logger.info(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              temperature,
              maxTokens,
              historyCount: history.length,
            },
            '[Bion] LLM stream start'
          );

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'start',
            brief: 'LLM streaming started',
            description: `model=${model}`,
            argumentsDetail: {
              model,
              maxTokens,
              temperature,
            },
          } satisfies BionFrontendEvent);

          for await (const chunk of llm.stream({
            model,
            // Cast: the runtime only needs role/content fields.
            messages: history as any,
            temperature,
            maxTokens,
          } as any)) {
            const delta = chunk.content ?? '';
            if (chunk.usage && (chunk.usage as any).totalTokens !== undefined) {
              lastUsage = chunk.usage;
            }
            if (!delta) continue;
            assistantAccum += delta;

            emitUiEvent(sessionId, {
              type: 'chatDelta',
              id: randomId(),
              timestamp: Date.now(),
              delta: { content: delta },
              finished: false,
              sender: 'assistant',
              targetEventId: userMessageId,
            } satisfies BionFrontendEvent);
          }

          // Persist assistant message in history.
          history.push({ role: 'assistant', content: assistantAccum, timestamp: Date.now() });
          historyBySessionId.set(sessionId, history);

          // Mark stream finished
          emitUiEvent(sessionId, {
            type: 'chatDelta',
            id: randomId(),
            timestamp: Date.now(),
            delta: { content: '' },
            finished: true,
            sender: 'assistant',
            targetEventId: userMessageId,
          } satisfies BionFrontendEvent);

          // Best-effort structured output: if final assistant text is JSON.
          const parsed = safeJsonParse(assistantAccum.trim());
          if (parsed !== null) {
            emitUiEvent(sessionId, {
              type: 'structuredOutput',
              id: randomId(),
              timestamp: Date.now(),
              status: 'success',
              data: parsed,
              isComplete: true,
              targetEventId: userMessageId,
            } as any);
          }

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'success',
            brief: 'LLM streaming finished',
            detail: {
              model,
              usage: lastUsage ?? undefined,
            },
          } satisfies BionFrontendEvent);

          const durationMs = Date.now() - startedAt;
          logger.info(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              durationMs,
              usage: lastUsage ?? undefined,
              assistantChars: assistantAccum.length,
            },
            '[Bion] LLM stream success'
          );

          void persistLlmRun({
            sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            historyCount: history.length,
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted LLM run');
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              logger.error({ sessionId, userMessageId, llmActionId, message, stack }, '[Bion] persist LLM run failed');
            });
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          const durationMs = Date.now() - startedAt;

          logger.error(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              durationMs,
              error: err,
            },
            '[Bion] LLM stream error'
          );

          emitUiEvent(sessionId, {
            type: 'structuredOutput',
            id: randomId(),
            timestamp: Date.now(),
            status: 'error',
            error: err,
            isComplete: true,
            targetEventId: userMessageId,
          } as any);

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'error',
            brief: 'LLM streaming error',
            detail: { error: err, model },
          } satisfies BionFrontendEvent);

          void persistLlmRun({
            sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            historyCount: history.length,
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
            error: {
              message: err,
              stack: e instanceof Error ? e.stack : undefined,
            },
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted LLM run (error)');
            })
            .catch((persistErr: unknown) => {
              const message = persistErr instanceof Error ? persistErr.message : String(persistErr);
              const stack = persistErr instanceof Error ? persistErr.stack : undefined;
              logger.error(
                { sessionId, userMessageId, llmActionId, message, stack },
                '[Bion] persist LLM run failed (error)'
              );
            });
        }
      });
    }

    if (clientType === 'extension') {
      socket.on(BionSocketEvent.BrowserExtensionMessage, (payload: unknown, ack?: (response: unknown) => void) => {
        const decoded = decodePluginMessage(payload) ?? (payload as any);

        if ((decoded as any)?.type === 'activate_extension') {
          const clientId = (decoded as any)?.clientId;
          if (typeof clientId === 'string' && clientId.length > 0) {
            pluginByClientId.set(clientId, socket);
          }
        }

        // If server receives an ack-able non-command message, ack ok.
        if (typeof ack === 'function' && (decoded as any)?.type !== 'browser_action') {
          ack({ ok: true });
        }
      });
    }

    socket.on('disconnect', (reason) => {
      for (const [clientId, s] of pluginByClientId.entries()) {
        if (s.id === socket.id) pluginByClientId.delete(clientId);
      }

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[Bion] disconnected', { socketId: socket.id, reason });
      }
    });
  });

  const emitUiEnvelope = (sessionId: string, envelope: BionFrontendMessageEnvelope) => {
    nsp.to(sessionRoom(sessionId)).emit(BionSocketEvent.Message, encodeFrontendEnvelope(envelope));
  };

  const emitUiEvent = (sessionId: string, event: BionFrontendEvent, envelopeId?: string) => {
    const id = envelopeId ?? randomId();
    const envelope: BionFrontendMessageEnvelope = {
      type: 'event',
      id,
      sessionId,
      timestamp: Date.now(),
      event,
    };
    emitUiEnvelope(sessionId, envelope);
  };

  const callPluginBrowserAction = async (clientId: string, msg: BionBrowserActionMessage, timeoutMs = 30_000) => {
    const socket = pluginByClientId.get(clientId);
    if (!socket) throw new Error(`No plugin connected for clientId=${clientId}`);

    const wire = encodePluginMessage(msg as BionPluginMessage);
    const result = await new Promise<BionBrowserActionResult>((resolve, reject) => {
      socket.timeout(timeoutMs).emit(BionSocketEvent.BrowserExtensionMessage, wire, (err: unknown, response: unknown) => {
        if (err) return reject(err instanceof Error ? err : new Error(String(err)));
        const decoded = decodePluginMessage(response) ?? (response as any);
        resolve(decoded as BionBrowserActionResult);
      });
    });
    return result;
  };

  const runtime: BionRuntime = {
    io,
    namespace: nsp,
    emitUiEvent,
    callPluginBrowserAction,
    getPlugins: () => Array.from(pluginByClientId.entries()).map(([clientId, s]) => ({ clientId, socketId: s.id })),
  };

  globalThis.__bion = runtime;

  nitroApp.hooks.hook('close', async () => {
    // Close Socket.IO server first
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    // Close all HTTP connections
    httpServer.closeAllConnections();

    // Close HTTP server with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        httpServer.close();
        resolve();
      }, 5000);

      httpServer.close((err?: Error) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });

    globalThis.__bion = undefined;
  });

  // Also handle process termination signals
  const shutdown = async () => {
    console.log('[Bion] Shutting down Socket.IO server...');
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    globalThis.__bion = undefined;
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start immediately (works in dev + production builds)
  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[Bion] Socket.IO server listening on :${port}${namespaceName}`);
  });
});

