/**
 * Mimo API Client
 *
 * 客户端用于调用 nitro-app 的 Mimo API
 */

const MIMO_API_BASE = process.env.NEXT_PUBLIC_MIMO_API_URL || 'http://localhost:6006/api/mimo';

export interface MimoCommandOptions {
  timeout?: number;
  tabId?: string;
}

export interface MimoNavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  tabId?: string;
  referer?: string;
}

/**
 * 发送 Mimo 命令
 */
export async function sendMimoCommand(
  command: string,
  params?: Record<string, unknown>
): Promise<any> {
  console.log('[Mimo Client] Sending command:', command, params);

  const response = await fetch(`${MIMO_API_BASE}/${command}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Mimo Client] Command failed:', error);
    throw new Error(error.message || 'Command failed');
  }

  const result = await response.json();
  console.log('[Mimo Client] Command result:', result);
  return result;
}

/**
 * Navigate - 导航到指定 URL
 */
export async function navigate(
  url: string,
  options?: MimoNavigateOptions
): Promise<any> {
  return sendMimoCommand('navigate', { url, options });
}

/**
 * Act - 执行浏览器操作
 */
export async function act(
  input: string,
  options?: MimoCommandOptions
): Promise<any> {
  return sendMimoCommand('act', { input, options });
}

/**
 * Extract - 提取页面数据
 */
export async function extract(
  instruction: string,
  options?: MimoCommandOptions
): Promise<any> {
  return sendMimoCommand('extract', { instruction, options });
}

/**
 * Observe - 观察页面操作
 */
export async function observe(
  instruction?: string,
  options?: MimoCommandOptions
): Promise<any> {
  return sendMimoCommand('observe', { instruction, options });
}
