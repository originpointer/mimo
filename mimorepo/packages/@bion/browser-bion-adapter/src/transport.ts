import type { BrowserTransport, BrowserTransportExecuteInput, BrowserTransportResult } from '@bion/browser-tools';
import type { BionBrowserActionMessage, BionBrowserActionResult } from '@bion/protocol';

export type CallPluginBrowserAction = (
  clientId: string,
  msg: BionBrowserActionMessage,
  timeoutMs?: number
) => Promise<BionBrowserActionResult>;

export type CreateBionBrowserTransportParams = {
  callPluginBrowserAction: CallPluginBrowserAction;
  /**
   * Timeout passed to Socket.IO emit-with-ack.
   * Default: 90s (browser actions can be slow).
   */
  timeoutMs?: number;
};

function normalizeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createBionBrowserTransport(params: CreateBionBrowserTransportParams): BrowserTransport {
  const timeoutMs = params.timeoutMs ?? 90_000;

  return {
    async execute(input: BrowserTransportExecuteInput): Promise<BrowserTransportResult> {
      const msg: BionBrowserActionMessage = {
        type: 'browser_action',
        id: input.actionId,
        sessionId: input.sessionId,
        clientId: input.clientId,
        timestamp: Date.now(),
        action: {
          [input.actionName]: input.params ?? {},
        },
      };

      try {
        const result = await params.callPluginBrowserAction(input.clientId, msg, timeoutMs);
        if (result.status === 'error') {
          return { status: 'error', error: result.error || 'browser action failed', raw: result };
        }
        // `result.result` is adapter-specific; we pass through and let callers decide how to use it.
        const observation = result.result
          ? ({
              ...result.result,
              raw: result,
            } as any)
          : ({ raw: result } as any);
        return { status: 'success', observation, raw: result };
      } catch (e) {
        return { status: 'error', error: normalizeError(e), raw: e };
      }
    },
  };
}

