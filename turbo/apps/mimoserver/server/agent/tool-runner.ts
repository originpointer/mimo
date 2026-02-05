import type { BrowserActionResult } from "mimo-protocol";
import type { ActionScheduler } from "@/modules/action-scheduler";
import type { ArtifactService } from "@/modules/artifact-service";
import type { TaskStatus } from "@/stores/taskStore";
import { upsertTask } from "@/stores/taskStore";
import { debugLogger } from "@/utils/logger";

/**
 * Chrome Tab Groups 颜色类型
 */
type TabGroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";

/**
 * 根据任务状态获取对应的 tab group 颜色
 */
function getStatusColor(status: TaskStatus): TabGroupColor {
  const colorMap: Record<TaskStatus, TabGroupColor> = {
    created: "grey",
    running: "blue",
    ongoing: "green",
    takeover: "yellow",
    completed: "grey",
    error: "red",
  };
  return colorMap[status] || "blue";
}

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
    taskTitle?: string;
  }): Promise<PageContext> {
    const startResult = await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: {
        task_start: {
          url: params.url,
          reuseExistingTab: false,
          groupTitle: params.taskTitle || "新任务",
          groupColor: getStatusColor("running"),
        },
      },
      execTimeoutMs: 20_000,
    });

    const tabId = (startResult.result as any)?.tabId;
    const groupId = (startResult.result as any)?.groupId;
    const windowId = (startResult.result as any)?.windowId;

    // 记录原始返回数据到调试日志
    debugLogger.debug({
      type: "task_start_result",
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      url: params.url,
      rawResult: startResult.result,
      extracted: { tabId, groupId, windowId },
    });

    // 更新 taskStore 保存关联关系
    if (tabId && groupId && windowId) {
      await upsertTask(params.taskId, {
        tabId,
        groupId,
        windowId,
      });
      debugLogger.info({
        type: "tabgroup_saved",
        taskId: params.taskId,
        tabId,
        groupId,
        windowId,
      }, `TabGroup data saved for task ${params.taskId}`);
    } else {
      // 记录插件返回数据不完整的情况
      debugLogger.error({
        type: "tabgroup_incomplete_data",
        taskId: params.taskId,
        tabId,
        groupId,
        windowId,
        rawResult: startResult.result,
      }, `task_start returned incomplete data for task ${params.taskId}`);
    }

    // 对当前 tab 进行 debugger attach（带重试机制）
    let debuggerAttached = false;
    if (tabId) {
      try {
        const attachResult = await this.runBrowserAction({
          taskId: params.taskId,
          clientId: params.clientId,
          action: {
            browser_debugger_attach: {
              tabId,
            }
          },
          execTimeoutMs: 30_000,  // 足够时间让重试完成
        });
        debuggerAttached = (attachResult.result as any)?.attached === true;

        // 更新 taskStore 的 debuggerAttached 状态
        await upsertTask(params.taskId, { debuggerAttached });

        debugLogger.info({
          type: "task_browser_status",
          taskId: params.taskId,
          status: "running",
          hasTabGroup: !!groupId,
          debuggerAttached,
          tabId,
          groupId,
          windowId,
        }, `Task browser status: debuggerAttached=${debuggerAttached}`);
      } catch (err) {
        debugLogger.warn({
          type: "debugger_attach_failed",
          taskId: params.taskId,
          tabId,
          error: String(err),
        }, `Debugger attach failed for task ${params.taskId}`);
      }
    }

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

  /**
   * 在现有 tab 上导航到新 URL（复用 tab）
   */
  async navigateToUrl(params: {
    taskId: string;
    clientId: string;
    tabId: number;
    url: string;
    baseUrl: string;
  }): Promise<PageContext> {
    const { taskId, clientId, tabId, url, baseUrl } = params;

    // 1. 更新任务 URL
    await upsertTask(taskId, { currentUrl: url });

    // 2. 在现有 tab 上导航（使用 chrome.tabs.update）
    await this.runBrowserAction({
      taskId,
      clientId,
      action: {
        browser_navigate: {
          tabId,
          url,
        }
      },
      execTimeoutMs: 30_000,
    });

    debugLogger.info({
      type: "tab_navigated",
      taskId,
      tabId,
      url,
    }, `Navigated tab ${tabId} to ${url}`);

    // 3. 等待页面加载完成
    await this.runBrowserAction({
      taskId,
      clientId,
      action: {
        browser_wait_for_loaded: {
          tabId,
          timeoutMs: 20_000,
        }
      },
      execTimeoutMs: 25_000,
    });

    // 4. 截图
    const screenshotArtifact = this.artifacts.createArtifact({
      kind: "screenshot",
      contentType: "image/png",
      baseUrl,
    });

    await this.runBrowserAction({
      taskId,
      clientId,
      action: {
        browser_screenshot: {
          tabId,
          fullPage: true,
        }
      },
      screenshotPresignedUrl: screenshotArtifact.uploadUrl,
      execTimeoutMs: 10_000,
    });

    // 5. 提取可读内容
    const readabilityResult = await this.runBrowserAction({
      taskId,
      clientId,
      action: {
        browser_readability_extract: {
          tabId,
        }
      },
      execTimeoutMs: 10_000,
    });

    const readability = (readabilityResult.result as any)?.markdown
      || (readabilityResult.result as any)?.text;

    return {
      tabId,
      screenshotUrl: screenshotArtifact.downloadUrl,
      readability,
    };
  }

  /**
   * 更新任务的 tab group（颜色、标题）
   */
  async updateTaskGroup(params: {
    taskId: string;
    clientId: string;
    color?: TabGroupColor;
    title?: string;
  }): Promise<void> {
    await this.runBrowserAction({
      taskId: params.taskId,
      clientId: params.clientId,
      action: {
        task_group_update: {
          color: params.color,
          title: params.title,
        },
      },
      execTimeoutMs: 5_000,
    });
  }
}
