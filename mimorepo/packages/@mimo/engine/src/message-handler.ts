import { CommandExecutor } from '@mimo/hub';
import type { CommandHandler, HubCommandRequest } from '@mimo/types';
import { HubCommandType } from '@mimo/types';

/**
 * Message Handler - 处理来自 hub 的消息
 *
 * 将接收到的 HubCommandRequest 路由到 CommandExecutor 执行
 */
export class MessageHandler {
  /**
   * 命令类型到 CommandExecutor 方法的映射
   */
  private static readonly COMMAND_HANDLERS: Partial<
    Record<HubCommandType, CommandHandler>
  > = {
    // Browser operations - implemented by CommandExecutor
    [HubCommandType.BrowserNavigate]: CommandExecutor.navigate,
    [HubCommandType.BrowserClick]: CommandExecutor.click,
    [HubCommandType.BrowserFill]: CommandExecutor.fill,
    [HubCommandType.BrowserScreenshot]: CommandExecutor.screenshot,
    [HubCommandType.BrowserGetContent]: CommandExecutor.getContent,
    [HubCommandType.BrowserEvaluate]: CommandExecutor.evaluate,

    // Tab operations - implemented by CommandExecutor
    [HubCommandType.TabGetList]: CommandExecutor.getTabList,
    [HubCommandType.TabCreate]: CommandExecutor.createTab,
    [HubCommandType.TabClose]: CommandExecutor.closeTab,
    [HubCommandType.TabSwitch]: CommandExecutor.switchTab,

    // Commands without CommandExecutor handlers (will use default logger)
    // Browser operations without handlers
    [HubCommandType.BrowserHover]: undefined,
    [HubCommandType.BrowserSelect]: undefined,
    [HubCommandType.BrowserClose]: undefined,

    // Tab operations without handlers
    [HubCommandType.TabGetActive]: undefined,
    [HubCommandType.TabGoBack]: undefined,
    [HubCommandType.TabGoForward]: undefined,
    [HubCommandType.TabReload]: undefined,

    // Agent operations
    [HubCommandType.AgentExecute]: undefined,
    [HubCommandType.AgentStream]: undefined,
    [HubCommandType.AgentObserve]: undefined,
    [HubCommandType.AgentStep]: undefined,

    // DOM operations
    [HubCommandType.DomObserve]: undefined,
    [HubCommandType.DomLocator]: undefined,
    [HubCommandType.DomDeepLocator]: undefined,
    [HubCommandType.DomMark]: undefined,
    [HubCommandType.DomUnmark]: undefined,
    [HubCommandType.DomUnmarkAll]: undefined,
    [HubCommandType.DomTextContent]: undefined,
    [HubCommandType.DomInnerHTML]: undefined,
    [HubCommandType.DomGetAttribute]: undefined,
    [HubCommandType.DomIsVisible]: undefined,
    [HubCommandType.DomWaitFor]: undefined,
    [HubCommandType.DomBoundingBox]: undefined,
    [HubCommandType.DomDeepLocatorAll]: undefined,
    [HubCommandType.DomDeepLocatorFirst]: undefined,

    // Page operations
    [HubCommandType.PageAct]: undefined,
    [HubCommandType.PageExtract]: undefined,
    [HubCommandType.PageGetUrl]: undefined,
    [HubCommandType.PageGetTitle]: undefined,
    [HubCommandType.PageWaitFor]: undefined,
  };

  /**
   * 将 CommandExecutor 响应转换为 ExtensionResponse 格式
   *
   * CommandExecutor 返回: { success: boolean, ...data }
   * ExtensionResponse 需要: { ok: boolean, data?, error? }
   */
  private static transformToExtensionResponse(
    result: unknown
  ): { ok: boolean; data?: unknown; error?: string } {
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as { success?: boolean; [key: string]: unknown };

      if (typeof resultObj.success === 'boolean') {
        if (resultObj.success) {
          // 成功：提取所有字段（除了 success）作为 data
          const { success, ...data } = resultObj;
          return {
            ok: true,
            data,
          };
        } else {
          // 失败：尝试提取错误信息
          return {
            ok: false,
            error: String(resultObj.error || resultObj.message || 'Command failed'),
          };
        }
      }
    }

    // 其他响应格式
    return {
      ok: true,
      data: result,
    };
  }

  /**
   * 路由命令到相应的处理器
   */
  static routeCommand: CommandHandler = async (request: HubCommandRequest) => {
    console.log('=== [MimoEngine] Routing Command ===');
    console.log('ID:', request.id);
    console.log('Type:', request.type);
    console.log('Payload:', JSON.stringify(request.payload, null, 2));
    console.log('=====================================');

    // 获取该命令类型的处理器
    const handler = MessageHandler.COMMAND_HANDLERS[request.type];

    if (handler) {
      // 使用 CommandExecutor 执行命令
      console.log(`[Engine] Executing ${request.type} with CommandExecutor`);
      try {
        const result = await handler(request);
        console.log(`[Engine] ${request.type} succeeded:`, result);
        return result;
      } catch (error) {
        console.error(`[Engine] ${request.type} failed:`, error);
        throw error;
      }
    } else {
      // 没有注册的处理器 - 使用默认日志行为
      console.log(`[Engine] No CommandExecutor handler for ${request.type}, logging only`);
      return {
        success: true,
        message: `Command ${request.type} logged (no executor)`,
        receivedAt: Date.now(),
      };
    }
  };

  /**
   * 注册所有命令处理器
   */
  static registerAllHandlers(
    hubClient: {
      registerHandler: (type: string, handler: CommandHandler) => void;
    }
  ): void {
    // 为所有 HubCommandType 注册路由处理器
    const allCommandTypes = Object.values(HubCommandType);

    for (const commandType of allCommandTypes) {
      hubClient.registerHandler(commandType, MessageHandler.routeCommand);
      console.log(`[Engine] Registered handler for: ${commandType}`);
    }
  }

  /**
   * 创建 Chrome Runtime 消息处理器
   *
   * 将 chrome.runtime.onMessage 的消息格式转换为 HubCommandRequest，
   * 路由到 CommandExecutor 执行，然后转换响应格式
   */
  static createChromeRuntimeHandler() {
    return (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ): boolean => {
      // 跳过非 Hub 命令消息（让现有处理器处理）
      if (!message.type || typeof message.type !== 'string') {
        return false;
      }

      // 检查是否是 HubCommandType
      const hubCommandTypes = Object.values(HubCommandType);
      if (!hubCommandTypes.includes(message.type as HubCommandType)) {
        return false;
      }

      console.log('[MimoEngine] Processing chrome.runtime message:', message.type);

      // 构造 HubCommandRequest
      const request: HubCommandRequest = {
        id: message.id || `chrome_${Date.now()}`,
        type: message.type as HubCommandType,
        payload: message.payload || {},
        options: message.options,
        timestamp: message.timestamp || Date.now(),
      };

      // 路由并执行命令
      MessageHandler.routeCommand(request)
        .then((result: unknown) => {
          // 转换 CommandExecutor 响应为 ExtensionResponse 格式
          const response = MessageHandler.transformToExtensionResponse(result);
          sendResponse(response);
          console.log('[MimoEngine] Command response sent:', response);
        })
        .catch((error: unknown) => {
          console.error('[MimoEngine] Error processing message:', error);
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      // 返回 true 表示异步响应
      return true;
    };
  }
}
