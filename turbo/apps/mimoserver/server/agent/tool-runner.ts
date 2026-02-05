import type { BrowserActionResult } from "mimo-protocol";
import type { ActionScheduler } from "@/modules/action-scheduler";
import type { ArtifactService } from "@/modules/artifact-service";

export type PageContext = {
  tabId?: number;
  screenshotUrl?: string;
  readability?: string;
};

export class ToolRunner {
  constructor(
    private readonly scheduler: ActionScheduler,
    private readonly artifacts: ArtifactService
  ) {}

  async runBrowserAction(params: {
    taskId: string;
    clientId: string;
    action: Record<string, Record<string, unknown>>;
    screenshotPresignedUrl?: string;
    execTimeoutMs?: number;
  }): Promise<BrowserActionResult> {
    return this.scheduler.schedule({
      taskId: params.taskId,
      clientId: params.clientId,
      action: params.action,
      screenshotPresignedUrl: params.screenshotPresignedUrl,
      execTimeoutMs: params.execTimeoutMs,
    });
  }

  async preparePage(params: {
    taskId: string;
    clientId: string;
    url?: string;
    baseUrl: string;
  }): Promise<PageContext> {
    const startResult = await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: { task_start: { url: params.url, reuseExistingTab: true } },
      execTimeoutMs: 20_000,
    });

    const tabId = (startResult.result as any)?.tabId;

    await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: { browser_debugger_attach: { tabId } },
      execTimeoutMs: 5_000,
    });

    await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: { browser_wait_for_loaded: { tabId, timeoutMs: 20_000 } },
      execTimeoutMs: 20_000,
    });

    const screenshotArtifact = this.artifacts.createArtifact({
      kind: "screenshot",
      contentType: "image/png",
      baseUrl: params.baseUrl,
    });

    const screenshotResult = await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: { browser_screenshot: { tabId, fullPage: true } },
      screenshotPresignedUrl: screenshotArtifact.uploadUrl,
      execTimeoutMs: 10_000,
    });

    const readabilityResult = await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: { browser_readability_extract: { tabId } },
      execTimeoutMs: 10_000,
    });

    const readability = (readabilityResult.result as any)?.markdown || (readabilityResult.result as any)?.text;

    return {
      tabId,
      screenshotUrl: screenshotArtifact.downloadUrl,
      readability,
    };
  }
}
