import type { BrowserTransport } from './types.js';

export type BrowserTaskRunInput = {
  transport: BrowserTransport;
  sessionId: string;
  clientId: string;
  requestId: string;
  summary: string;
  title: string;
  initialUrl?: string | null;
  targetEventId?: string;
  /**
   * Action map compatible with Bion extension protocol.
   * Example: { browser_navigate: { url: "https://..." } }
   */
  action?: Record<string, Record<string, unknown>> | null;
};

function asParams(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' ? (v as Record<string, unknown>) : {}) as Record<string, unknown>;
}

export async function runBrowserTask(input: BrowserTaskRunInput): Promise<void> {
  const start = await input.transport.execute({
    sessionId: input.sessionId,
    clientId: input.clientId,
    actionId: `${input.requestId}:session_start`,
    actionName: 'session/start',
    params: {
      requestId: input.requestId,
      summary: input.summary,
      title: input.title,
      initialUrl: input.initialUrl ?? undefined,
      targetEventId: input.targetEventId ?? undefined,
    },
  });
  if (start.status === 'error') throw new Error(start.error);

  const action = input.action ?? null;
  if (action) {
    const entries = Object.entries(action);
    for (let i = 0; i < entries.length; i++) {
      const [name, params] = entries[i] ?? [];
      if (!name) continue;
      const res = await input.transport.execute({
        sessionId: input.sessionId,
        clientId: input.clientId,
        actionId: `${input.requestId}:action:${i}:${name}`,
        actionName: name,
        params: asParams(params),
      });
      if (res.status === 'error') throw new Error(res.error);
    }
  }

  const stop = await input.transport.execute({
    sessionId: input.sessionId,
    clientId: input.clientId,
    actionId: `${input.requestId}:session_stop`,
    actionName: 'session/stop',
    params: { requestId: input.requestId },
  });
  if (stop.status === 'error') throw new Error(stop.error);
}

