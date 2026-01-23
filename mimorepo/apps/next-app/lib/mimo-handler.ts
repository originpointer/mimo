/**
 * Mimo Command Handler
 *
 * 处理 Mimo 命令，支持从聊天输入中识别和执行 Mimo 命令
 */

export interface MimoCommand {
  type: 'navigate' | 'act' | 'extract' | 'observe';
  params: Record<string, unknown>;
}

/**
 * 检测消息是否为 Mimo 命令
 * 支持的格式：
 * - /mimo navigate https://example.com
 * - @mimo act 点击登录按钮
 * - /navigate https://example.com
 * - @act 点击登录按钮
 */
export function detectMimoCommand(message: string): MimoCommand | null {
  // 格式 1: /mimo <command> <params>
  const mimoRegex = /^\/mimo\s+(\w+)\s*(.*)$/i;
  const match = message.match(mimoRegex);

  if (match) {
    const [, type, params] = match;
    return parseMimoCommand(type, params);
  }

  // 格式 2: @mimo <command> <params>
  const atMimoRegex = /^@mimo\s+(\w+)\s*(.*)$/i;
  const atMatch = message.match(atMimoRegex);

  if (atMatch) {
    const [, type, params] = atMatch;
    return parseMimoCommand(type, params);
  }

  // 格式 3: 直接命令 (可选)
  // /navigate https://example.com
  // /act 点击登录按钮
  const directRegex = /^\/(\w+)\s+(.+)$/;
  const directMatch = message.match(directRegex);

  if (directMatch) {
    const [, type, params] = directMatch;
    if (['navigate', 'act', 'extract', 'observe'].includes(type)) {
      return parseMimoCommand(type, params);
    }
  }

  return null;
}

/**
 * 解析 Mimo 命令参数
 */
function parseMimoCommand(type: string, params: string): MimoCommand | null {
  switch (type) {
    case 'navigate':
      // 格式: navigate https://example.com
      return {
        type: 'navigate',
        params: { url: params.trim() },
      };

    case 'act':
      // 格式: act 点击登录按钮
      return {
        type: 'act',
        params: { input: params.trim() },
      };

    case 'extract':
      // 格式: extract 获取商品价格
      return {
        type: 'extract',
        params: { instruction: params.trim() },
      };

    case 'observe':
      // 格式: observe 或 observe 登录页面
      return {
        type: 'observe',
        params: { instruction: params.trim() || undefined },
      };

    default:
      return null;
  }
}

/**
 * 执行 Mimo 命令
 */
export async function executeMimoCommand(command: MimoCommand): Promise<string> {
  const { navigate, act, extract, observe } = await import('./mimo-client');

  console.log('[Mimo Handler] Executing command:', command);

  try {
    switch (command.type) {
      case 'navigate': {
        const result = await navigate(command.params.url as string, command.params.options);
        return `✅ 导航成功: ${result.data.url}`;
      }

      case 'act': {
        const result = await act(command.params.input as string, command.params.options);
        return `✅ 操作成功: ${result.data.message}`;
      }

      case 'extract': {
        const result = await extract(command.params.instruction as string, command.params.options);
        return `✅ 提取成功: ${JSON.stringify(result.data.extraction)}`;
      }

      case 'observe': {
        const result = await observe(command.params.instruction as string, command.params.options);
        return `✅ 观察完成: 发现 ${result.data.count} 个可操作元素`;
      }

      default:
        return `❌ 未知命令类型: ${command.type}`;
    }
  } catch (error: any) {
    console.error('[Mimo Handler] Command execution failed:', error);
    return `❌ 命令执行失败: ${error.message}`;
  }
}
