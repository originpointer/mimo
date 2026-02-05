import { createActionId } from "@repo/mimo-utils";
import type { BrowserActionMessage, BrowserActionResult } from "mimo-protocol";
import type { BusServer } from "mimo-bus/server";

export type ActionSchedulerOptions = {
  ackTimeoutMs?: number;
  execTimeoutMs?: number;
};

type PendingAction = {
  resolve: (value: BrowserActionResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class ActionScheduler {
  private readonly pending = new Map<string, PendingAction>();
  private readonly queues = new Map<string, Promise<BrowserActionResult>>();

  constructor(private readonly bus: BusServer) {}

  async schedule(params: {
    taskId: string;
    clientId: string;
    action: BrowserActionMessage["action"];
    screenshotPresignedUrl?: string;
    ackTimeoutMs?: number;
    execTimeoutMs?: number;
  }): Promise<BrowserActionResult> {
    return this.enqueue(params.taskId, async () => {
      const actionId = createActionId();
      const msg: BrowserActionMessage = {
        type: "browser_action",
        id: actionId,
        taskId: params.taskId,
        clientId: params.clientId,
        timestamp: Date.now(),
        action: params.action,
        screenshotPresignedUrl: params.screenshotPresignedUrl,
      };

      const execTimeoutMs = params.execTimeoutMs ?? 60_000;
      const ackTimeoutMs = params.ackTimeoutMs ?? 1500;

      const resultPromise = new Promise<BrowserActionResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pending.delete(actionId);
          reject(new Error("PLUGIN_TIMEOUT_EXEC"));
        }, execTimeoutMs);
        this.pending.set(actionId, { resolve, reject, timeout });
      });

      try {
        const ackResponse = await this.bus.emitPluginMessage(params.clientId, msg, { ackTimeoutMs });
        // Compatibility: older plugin implementations might return a full result in the ack callback.
        if ((ackResponse as any)?.type === "browser_action_result") {
          this.handleResult(ackResponse as BrowserActionResult);
        }
      } catch (err) {
        const pending = this.pending.get(actionId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(actionId);
        }
        throw err instanceof Error ? err : new Error(String(err));
      }

      return resultPromise;
    });
  }

  handleResult(result: BrowserActionResult) {
    const pending = this.pending.get(result.actionId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(result.actionId);
    pending.resolve(result);
  }

  private enqueue(taskId: string, fn: () => Promise<BrowserActionResult>): Promise<BrowserActionResult> {
    const prev = this.queues.get(taskId) ?? Promise.resolve(null as any);
    // Chain the execution with proper error handling to avoid unhandled rejections
    const result = prev.then(
      () => fn(),
      () => fn() // Continue execution even if previous task failed
    );
    // Store a promise that always resolves (for queue chaining)
    // but return the actual result promise to caller for error handling
    this.queues.set(taskId, result.catch(() => null as any));
    return result;
  }
}
