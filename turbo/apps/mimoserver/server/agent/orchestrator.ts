import { createId } from "@repo/mimo-utils";
import type { FrontendUserMessage, FrontendEventEnvelope, StructuredOutputEvent } from "mimo-protocol";
import { saveMessage } from "@/stores/messageStore";
import { createTask, getTask, upsertTask } from "@/stores/taskStore";
import type { ExtensionRegistry } from "@/modules/extension-registry";
import type { ToolRunner } from "@/agent/tool-runner";
import type { LlmGateway } from "@/agent/llm-gateway";
import type { BusServer } from "mimo-bus/server";
import { logger, debugLogger } from "@/utils/logger";

/**
 * Chrome Tab Groups 颜色类型
 */
type TabGroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";

/**
 * 根据任务状态获取对应的 tab group 颜色
 */
function getStatusColor(status: string): TabGroupColor {
  const colorMap: Record<string, TabGroupColor> = {
    created: "grey",
    running: "blue",
    ongoing: "green",
    takeover: "yellow",
    completed: "grey",
    error: "red",
  };
  return colorMap[status] || "blue";
}


/**
 * 智能代理编排器，负责协调 Bus、注册表、LLM 和工具运行器
 */
export class AgentOrchestrator {
  constructor(
    private readonly bus: BusServer,
    private readonly registry: ExtensionRegistry,
    private readonly llm: LlmGateway,
    private readonly toolRunner: ToolRunner
  ) { }

  /**
   * 处理来自前端的用户消息
   * @param msg 用户消息对象
   */
  async handleUserMessage(msg: FrontendUserMessage): Promise<void> {
    const now = Date.now();
    // 获取或创建任务
    let task = await getTask(msg.taskId);
    if (!task) {
      task = await createTask(msg.taskId, { status: "created" });
    }

    // 获取 task 的当前状态
    const { status: taskStatus } = task;

    // 默认认为需要浏览器，除非通过意图识别判定为不需要
    let isBrowserRequired = true;
    let explicitUrl: string | null | undefined = null;

    // 若任务处于 created 状态或 ongoing 状态，都进行意图拆解判定（支持上下文）
    if (taskStatus === "created" || taskStatus === "ongoing") {
      try {
        const result = await this.llm.analyzeIntent(msg.content, {
          status: taskStatus,
          currentUrl: task.currentUrl,
        });
        isBrowserRequired = result.isBrowserRequired;
        explicitUrl = result.url;
        logger.info({ taskId: msg.taskId, isBrowserRequired, explicitUrl }, `[Orchestrator] Intent analysis for task ${msg.taskId}: browser=${isBrowserRequired}, url=${explicitUrl}`);
      } catch (err) {
        logger.error({ error: String(err), taskId: msg.taskId }, `[Orchestrator] Failed to analyze intent for task ${msg.taskId}`);
      }
    }

    logger.info(`Task ${msg.taskId} required browser: ${isBrowserRequired}`);

    // 保存用户的原始消息
    await saveMessage(msg.taskId, {
      id: msg.id,
      role: "user",
      content: msg.content,
      createdAt: now,
    });

    const { tabId: existingTabId } = task;
    const targetUrl = explicitUrl || (isBrowserRequired ? (task.currentUrl || "about:blank") : null);
    let pageContext: { tabId?: number; screenshotUrl?: string; readability?: string } | null = null;

    // 如果判定需要浏览器，或者明确有目标 URL，则尝试准备页面上下文
    if (isBrowserRequired || explicitUrl) {
      // 分流：有 tabId 且状态为 ongoing 时复用 tab，否则创建新 tab
      if (existingTabId && taskStatus === "ongoing") {
        // ===== 已有 tab 的场景：复用 tab =====
        const url = targetUrl || "about:blank";
        const selectedClient = task.selectedClientId || this.registry.getAutoSelectedClient();

        if (!selectedClient) {
          this.emitStructuredError(msg.taskId, msg.id, "PLUGIN_OFFLINE", "No plugin connected.");
          await upsertTask(msg.taskId, { status: "error" });
          return;
        }

        try {
          pageContext = await this.toolRunner.navigateToUrl({
            taskId: msg.taskId,
            clientId: selectedClient,
            tabId: existingTabId,
            url,
            baseUrl: process.env.MIMO_BASE_URL || "http://localhost:6006",
          });

          debugLogger.info({
            type: "tab_reused",
            taskId: msg.taskId,
            tabId: existingTabId,
            url,
          }, `Reused existing tab ${existingTabId} for task ${msg.taskId}`);
        } catch (err) {
          // tab 可能已关闭，降级到创建新 tab
          logger.warn({ error: String(err), taskId: msg.taskId, tabId: existingTabId }, `[Orchestrator] Failed to reuse tab ${existingTabId}, falling back to create new tab`);
          // 清除无效的 tabId，让后续逻辑创建新 tab
          await upsertTask(msg.taskId, { tabId: undefined, groupId: undefined, windowId: undefined });
          pageContext = null; // 触发后续的创建新 tab 逻辑
        }
      }

      // ===== 无 tabId 或复用失败的场景：创建新 tab =====
      if (!pageContext) {
        // 更新任务状态为运行中 (仅当确实需要浏览器操作时)，并保存当前 URL
        await upsertTask(msg.taskId, {
          status: "running",
          updatedAt: now,
          ...(explicitUrl ? { currentUrl: explicitUrl } : {})
        });

        const selectedClient = task.selectedClientId || this.registry.getSelectedClient(msg.taskId) || this.registry.getAutoSelectedClient();
        if (!selectedClient) {
          // 如果明确有 URL 但没插件，报错；如果是自动判定需要但没插件，可以降级处理或报错
          if (explicitUrl) {
            this.emitStructuredError(msg.taskId, msg.id, "PLUGIN_OFFLINE", "No plugin connected.");
            await upsertTask(msg.taskId, { status: "error" });
            return;
          }
          logger.warn(`[Orchestrator] Browser required but no plugin connected for task ${msg.taskId}`);
          isBrowserRequired = false; // 降级为非浏览器模式
        } else {
          try {
            pageContext = await this.toolRunner.preparePage({
              taskId: msg.taskId,
              clientId: selectedClient,
              url: targetUrl || "about:blank",
              baseUrl: process.env.MIMO_BASE_URL || "http://localhost:6006",
              taskTitle: task.title,
            });

            // TabGroup 建立完成后，记录 task 与 tabGroup 的关联信息
            const updatedTask = await getTask(msg.taskId);

            // 写入调试日志
            debugLogger.debug({
              type: "orchestrator_preparePage",
              taskId: msg.taskId,
              taskTitle: task.title,
              clientId: selectedClient,
              targetUrl,
              pageContext,
              updatedTask,
            });

            if (updatedTask?.tabId && updatedTask?.groupId) {
              logger.info({
                taskId: updatedTask.taskId,
                taskTitle: updatedTask.title,
                taskStatus: updatedTask.status,
                tabId: updatedTask.tabId,
                groupId: updatedTask.groupId,
                windowId: updatedTask.windowId,
                currentUrl: updatedTask.currentUrl,
                clientId: selectedClient,
                timestamp: Date.now(),
              }, `[Orchestrator] TabGroup established for task ${msg.taskId}`);
            } else {
              // 记录未能获取 tabGroup 信息的情况
              logger.warn({
                taskId: updatedTask?.taskId,
                taskTitle: updatedTask?.title,
                tabId: updatedTask?.tabId,
                groupId: updatedTask?.groupId,
                windowId: updatedTask?.windowId,
                pageContext,
              }, `[Orchestrator] TabGroup info not available for task ${msg.taskId}`);
            }
          } catch (err) {
            if (explicitUrl) {
              this.emitStructuredError(msg.taskId, msg.id, "PAGE_PREP_FAILED", err instanceof Error ? err.message : String(err));
              await upsertTask(msg.taskId, { status: "error" });
              return;
            }
            logger.error({ error: String(err), taskId: msg.taskId }, `[Orchestrator] Failed to prepare page for task ${msg.taskId}`);
          }
        }
      }
    }

    const assistantId = createId("assistant");
    let assistantText = "";

    try {
      // 获取更新后的任务状态，判断是否有 tabId
      const updatedTask = await getTask(msg.taskId);
      const hasExistingTab = !!updatedTask?.tabId;

      // 调用 LLM 接口进行流式对话
      for await (const event of this.llm.streamChat({
        taskId: msg.taskId,
        messages: [
          { role: "system", content: "You are Mimo." },
          { role: "user", content: msg.content },
        ],
        context: pageContext ? { page: pageContext } : undefined,
        // 根据是否有 tabId 暴露不同的工具集
        tools: isBrowserRequired
          ? (hasExistingTab ? this.getTabOperationTools() : this.getTaskCreationTools())
          : undefined,
      })) {
        if (event.type === "delta") {
          // 处理增量文本并推送到前端
          assistantText += event.content;
          const envelope: FrontendEventEnvelope = {
            type: "event",
            id: createId("env"),
            taskId: msg.taskId,
            timestamp: Date.now(),
            event: {
              id: assistantId,
              type: "chatDelta",
              timestamp: Date.now(),
              sender: "assistant",
              targetEventId: msg.id,
              finished: false,
              delta: { content: event.content },
            },
          };
          try {
            this.bus.emitTaskEvent(msg.taskId, envelope);
          } catch (emitErr) {
            // Client may have disconnected - log but continue processing
            if ((emitErr as any)?.code !== "EPIPE" && (emitErr as any)?.code !== "ECONNRESET") {
              logger.warn({ error: String(emitErr), taskId: msg.taskId }, `[Orchestrator] Failed to emit event for task ${msg.taskId}`);
            }
          }
        } else if (event.type === "tool_call") {
          // 处理工具调用 - 目前先记录，后续可以实现完整的工具执行循环
          logger.info({ arguments: event.arguments, taskId: msg.taskId, eventName: event.name }, `[Orchestrator] Tool call received: ${event.name} for task ${msg.taskId}`);
          // TODO: Implement full tool execution loop with result feedback to LLM
        } else if (event.type === "error") {
          // 提交结构化的错误信息
          this.emitStructuredError(msg.taskId, msg.id, event.code, event.message);
        } else if (event.type === "done") {
          // 标记流结束
          const envelope: FrontendEventEnvelope = {
            type: "event",
            id: createId("env"),
            taskId: msg.taskId,
            timestamp: Date.now(),
            event: {
              id: assistantId,
              type: "chatDelta",
              timestamp: Date.now(),
              sender: "assistant",
              targetEventId: msg.id,
              finished: true,
              delta: { content: "" },
            },
          };
          try {
            this.bus.emitTaskEvent(msg.taskId, envelope);
          } catch (emitErr) {
            // Client may have disconnected - log but continue
            if ((emitErr as any)?.code !== "EPIPE" && (emitErr as any)?.code !== "ECONNRESET") {
              logger.warn({ error: String(emitErr), taskId: msg.taskId }, `[Orchestrator] Failed to emit done event for task ${msg.taskId}`);
            }
          }
        }
      }
    } catch (err) {
      // 捕获 LLM 运行时的错误
      this.emitStructuredError(
        msg.taskId,
        msg.id,
        "LLM_STREAM_FAILED",
        err instanceof Error ? err.message : String(err)
      );
      await upsertTask(msg.taskId, { status: "error" });

      // 同步更新 tab group 颜色为红色
      const updatedTask = await getTask(msg.taskId);
      if (updatedTask?.groupId && updatedTask.selectedClientId) {
        try {
          await this.toolRunner.updateTaskGroup({
            taskId: msg.taskId,
            clientId: updatedTask.selectedClientId,
            color: getStatusColor("error"),
          });
        } catch (updateErr) {
          logger.warn({ error: String(updateErr), taskId: msg.taskId }, `[Orchestrator] Failed to update tab group color for task ${msg.taskId}`);
        }
      }
      return;
    }

    // 保存助手回复的消息
    await saveMessage(msg.taskId, {
      id: assistantId,
      role: "assistant",
      content: assistantText,
      createdAt: Date.now(),
    });

    // 根据是否处理过 URL 更新任务状态
    const newStatus = (explicitUrl || isBrowserRequired) ? "ongoing" : "completed";
    await upsertTask(msg.taskId, { status: newStatus });

    // 获取更新后的任务信息
    const updatedTask = await getTask(msg.taskId);

    // 发送状态追踪事件
    debugLogger.info({
      type: "task_status_changed",
      taskId: msg.taskId,
      status: newStatus,
      hasTabGroup: !!updatedTask?.groupId,
      debuggerAttached: newStatus !== "completed",
    }, `Task ${msg.taskId} status changed to ${newStatus}`);

    // 如果任务完成，detach debugger
    if (newStatus === "completed") {
      if (updatedTask?.tabId && updatedTask.selectedClientId) {
        try {
          await this.toolRunner.runBrowserAction({
            taskId: msg.taskId,
            clientId: updatedTask.selectedClientId,
            action: {
              browser_debugger_detach: {
                tabId: updatedTask.tabId,
              }
            },
            execTimeoutMs: 5_000,
          });
          // 更新 taskStore 的 debuggerAttached 状态
          await upsertTask(msg.taskId, { debuggerAttached: false });
          logger.info(`[Orchestrator] Debugger detached for completed task ${msg.taskId}`);
        } catch (err) {
          logger.warn(`[Orchestrator] Failed to detach debugger for task ${msg.taskId}: ${String(err)}`);
        }
      }
    }

    // 同步更新 tab group 颜色
    if (updatedTask?.groupId && updatedTask.selectedClientId) {
      try {
        await this.toolRunner.updateTaskGroup({
          taskId: msg.taskId,
          clientId: updatedTask.selectedClientId,
          color: getStatusColor(newStatus),
        });
      } catch (err) {
        logger.warn(`[Orchestrator] Failed to update tab group color for task ${msg.taskId}: ${String(err)}`);
      }
    }
  }

  /**
   * 获取任务创建时的工具集（新建 tab）
   */
  private getTaskCreationTools() {
    return [
      {
        name: "browser_navigate",
        description: "导航到指定 URL（会创建新的浏览器标签页）",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "目标地址" },
          },
          required: ["url"],
        },
      },
    ];
  }

  /**
   * 获取 Tab 操作工具集（复用已有 tab）
   */
  private getTabOperationTools() {
    return [
      {
        name: "browser_navigate",
        description: "在当前页面导航到新 URL",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "目标地址" },
          },
          required: ["url"],
        },
      },
      {
        name: "browser_click",
        description: "点击页面上的元素",
        parameters: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS 选择器或 XPath" },
          },
          required: ["selector"],
        },
      },
      {
        name: "browser_type",
        description: "在输入框中输入文本",
        parameters: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS 选择器" },
            text: { type: "string", description: "要输入的文本" },
          },
          required: ["selector", "text"],
        },
      },
      {
        name: "browser_screenshot",
        description: "获取当前页面截图",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "browser_readability",
        description: "提取当前页面的主要文本内容",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ];
  }

  /**
   * 推送结构化的错误事件到前端
   * @param taskId 任务 ID
   * @param targetEventId 关联的消息 ID
   * @param code 错误码
   * @param message 错误描述信息
   */
  private emitStructuredError(taskId: string, targetEventId: string, code: string, message: string) {
    const event: StructuredOutputEvent = {
      id: createId("evt"),
      type: "structuredOutput",
      timestamp: Date.now(),
      status: "error",
      error: `${code}: ${message}`,
      isComplete: true,
      targetEventId,
    };
    this.bus.emitTaskEvent(taskId, {
      type: "event",
      id: createId("env"),
      taskId,
      timestamp: Date.now(),
      event,
    });
  }
}
