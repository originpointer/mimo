# Next-App Mimo 集成计划

## 目标

在 next-app 中集成 Mimo 功能，第一阶段：接收指令并打印到控制台，验证 nitro-app 的 Mimo 功能正常可用。

## 阶段 1: 基础命令接收与控制台打印

### 1.1 创建 Mimo API 客户端

**文件**: `next-app/lib/mimo-client.ts` (NEW)

```typescript
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
```

### 1.2 创建 Mimo 命令处理器

**文件**: `next-app/lib/mimo-handler.ts` (NEW)

```typescript
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
```

### 1.3 创建 Mimo 测试页面

**文件**: `next-app/app/mimo/page.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { sendMimoCommand, navigate, act, extract, observe } from '@/lib/mimo-client';

export default function MimoPage() {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const quickCommands = [
    { label: '导航到百度', action: () => navigate('https://www.baidu.com') },
    { label: '观察页面', action: () => observe('当前页面') },
    { label: '执行操作', action: () => act('点击搜索按钮') },
  ];

  const handleQuickCommand = async (action: () => Promise<any>) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await action();
      setResult(res);
      console.log('[Mimo Page] Result:', res);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommand = async () => {
    if (!command.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      // 检测命令类型
      const { detectMimoCommand, executeMimoCommand } = await import('@/lib/mimo-handler');
      const detected = detectMimoCommand(command);

      if (detected) {
        const message = await executeMimoCommand(detected);
        setResult({ message });
      } else {
        // 原始命令发送
        const res = await sendMimoCommand('act', { input: command });
        setResult(res);
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Mimo 控制面板</h1>

      {/* 快捷命令 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">快捷命令</h2>
        <div className="flex gap-2 flex-wrap">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommand(cmd.action)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义命令 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">自定义命令</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="输入命令，如: /mimo navigate https://example.com"
            className="flex-1 px-4 py-2 border rounded"
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
          />
          <button
            onClick={handleSendCommand}
            disabled={loading || !command.trim()}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '执行中...' : '发送'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          支持格式: /mimo navigate &lt;url&gt; | @mimo act &lt;instruction&gt; | /navigate &lt;url&gt;
        </p>
      </div>

      {/* 结果显示 */}
      {result && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">执行结果</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* 控制台日志说明 */}
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm text-blue-800">
          💡 所有操作都会在浏览器控制台中打印详细日志。
          <br />
          打开开发者工具 (F12) 查看完整的请求和响应信息。
        </p>
      </div>
    </div>
  );
}
```

### 1.4 集成到聊天界面

**文件**: `next-app/app/chat/[id]/ChatRuntime.tsx` (MODIFY)

在现有的 `useChat` hook 中添加 Mimo 命令拦截：

```typescript
// 在 handleSubmit 函数开头添加 Mimo 命令检测
const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  // 检测 Mimo 命令
  const { detectMimoCommand, executeMimoCommand } = await import('@/lib/mimo-handler');
  const mimoCommand = detectMimoCommand(input);

  if (mimoCommand) {
    // 处理 Mimo 命令
    setInput('');

    // 添加用户消息到聊天
    append({
      role: 'user',
      content: input,
    });

    // 执行并显示结果
    const result = await executeMimoCommand(mimoCommand);
    append({
      role: 'assistant',
      content: result,
    });

    return;
  }

  // 原有的聊天逻辑...
};
```

### 1.5 添加环境变量

**文件**: `next-app/.env.local` (NEW)

```bash
# Mimo API URL (指向 nitro-app)
NEXT_PUBLIC_MIMO_API_URL=http://localhost:6006/api/mimo
```

## 验证步骤

### 第一步：确认 nitro-app 运行

```bash
# 终端 1: 启动 nitro-app
cd /Users/soda/Documents/solocodes/mimo/mimorepo/apps/nitro-app
pnpm dev
```

### 第二步：启动 next-app

```bash
# 终端 2: 启动 next-app
cd /Users/soda/Documents/solocodes/mimo/mimorepo/apps/next-app
pnpm dev
```

### 第三步：测试 Mimo API

访问 http://localhost:3000/mimo

1. 点击快捷命令按钮
2. 在浏览器控制台 (F12) 中查看日志：
   - `[Mimo Client] Sending command: navigate {...}`
   - `[Mimo Client] Command result: {...}`
3. 检查 nitro-app 终端确认请求被接收

### 第四步：测试聊天集成

访问 http://localhost:3000/chat

在输入框中测试以下命令格式：

```
/mimo navigate https://www.baidu.com
@mimo act 点击搜索按钮
/observe
/extract 获取页面标题
```

## 文件清单

| 文件 | 操作 | 描述 |
|------|------|------|
| `lib/mimo-client.ts` | NEW | Mimo API 客户端 |
| `lib/mimo-handler.ts` | NEW | Mimo 命令检测和执行 |
| `app/mimo/page.tsx` | NEW | Mimo 测试页面 |
| `app/chat/[id]/ChatRuntime.tsx` | MODIFY | 添加 Mimo 命令拦截 |
| `.env.local` | NEW | 环境变量配置 |

## 预期控制台输出

### Next-App 浏览器控制台

```
[Mimo Client] Sending command: navigate {url: 'https://www.baidu.com'}
[Mimo Client] Command result: {success: true, data: {...}}
```

### Nitro-App 终端

```
[Mimo] Instance created with verbose level: 1
[MCP] Registered tools: ..., mimo_navigate, ...
```

## 下一步 (阶段 2)

1. 添加扩展连接状态显示
2. 实时显示操作进度
3. 支持流式响应 (Agent 执行)
4. 添加错误处理和重试机制
