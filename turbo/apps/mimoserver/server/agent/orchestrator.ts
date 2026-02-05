import { createId } from "@repo/mimo-utils";
import type { FrontendUserMessage, FrontendEventEnvelope, StructuredOutputEvent } from "mimo-protocol";
import { saveMessage } from "@/stores/messageStore";
import { createTask, getTask, upsertTask } from "@/stores/taskStore";
import type { ExtensionRegistry } from "@/modules/extension-registry";
import type { ToolRunner } from "@/agent/tool-runner";
import type { LlmGateway } from "@/agent/llm-gateway";
import type { BusServer } from "mimo-bus/server";
import { logger } from "@/utils/logger";


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
        logger.info(`[Orchestrator] Intent analysis for task ${msg.taskId}: browser=${isBrowserRequired}, url=${explicitUrl}`);
      } catch (err) {
        logger.error(`[Orchestrator] Failed to analyze intent for task ${msg.taskId}`, { error: String(err) });
      }
    }

    logger.info(`Task ${msg.taskId} required browser: ${isBrowserRequired}`);

    // 更新任务状态为运行中 - 逻辑移动到下方判定需要浏览器后
    // await upsertTask(msg.taskId, { status: "running", updatedAt: now });

    // 保存用户的原始消息
    await saveMessage(msg.taskId, {
      id: msg.id,
      role: "user",
      content: msg.content,
      createdAt: now,
    });

    const targetUrl = explicitUrl || (isBrowserRequired ? (task.currentUrl || "about:blank") : null);
    let pageContext: { tabId?: number; screenshotUrl?: string; readability?: string } | null = null;

    // 如果判定需要浏览器，或者明确有目标 URL，则尝试准备页面上下文
    if (isBrowserRequired || explicitUrl) {
      // 更新任务状态为运行中 (仅当确实需要浏览器操作时)，并保存当前 URL
      await upsertTask(msg.taskId, {
        status: "running",
        updatedAt: now,
        // 如果是新的明确 URL，则更新 currentUrl；否则保持原样 (如果此时是 about:blank 且之前没有，也可以记录，但保持 task.currentUrl 逻辑更稳)
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
          });
        } catch (err) {
          if (explicitUrl) {
            this.emitStructuredError(msg.taskId, msg.id, "PAGE_PREP_FAILED", err instanceof Error ? err.message : String(err));
            await upsertTask(msg.taskId, { status: "error" });
            return;
          }
          logger.error(`[Orchestrator] Failed to prepare page for task ${msg.taskId}`, { error: String(err) });
        }
      }
    }

    const assistantId = createId("assistant");
    let assistantText = "";

    try {
      // 调用 LLM 接口进行流式对话
      for await (const event of this.llm.streamChat({
        taskId: msg.taskId,
        messages: [
          { role: "system", content: "You are Mimo." },
          { role: "user", content: msg.content },
        ],
        context: pageContext ? { page: pageContext } : undefined,
        // 仅在需要浏览器时才提供工具定义，节省 Token
        tools: isBrowserRequired ? this.getBrowserTools() : undefined,
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
          this.bus.emitTaskEvent(msg.taskId, envelope);
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
          this.bus.emitTaskEvent(msg.taskId, envelope);
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
    await upsertTask(msg.taskId, { status: (explicitUrl || isBrowserRequired) ? "ongoing" : "completed" });
  }

  /**
   * 获取浏览器相关的工具定义
   */
  private getBrowserTools() {
    return [
      {
        name: "browser_navigate",
        description: "导航到指定 URL",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "目标地址" },
          },
          required: ["url"],
        },
      },
      // 这里可以添加更多工具定义...
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
