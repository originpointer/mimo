/**
 * useMimoHub Hook
 *
 * 管理 Mimo Hub Socket.IO 连接
 * 连接到 Nitro 中的 MimoBus 服务端，接收并处理命令
 *
 * 默认禁用连接，通过环境变量 NEXT_PUBLIC_MIMO_HUB_ENABLED=true 启用
 */

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createBrowserHubClient, MimoRouter } from '@mimo/hub';

// 默认禁用，通过环境变量启用
const HUB_ENABLED = process.env.NEXT_PUBLIC_MIMO_HUB_ENABLED === 'true';

// 服务器 URL
const HUB_URL = process.env.NEXT_PUBLIC_MIMO_HUB_URL || 'http://localhost:6007';

export interface MimoHubState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface MimoHubReturn extends MimoHubState {
  client: ReturnType<typeof createBrowserHubClient> | null;
  isEnabled: boolean;
}

export interface UseMimoHubOptions {
  /** 是否启用连接，默认通过环境变量控制 */
  enabled?: boolean;
  /** 静默模式，减少控制台输出 */
  silent?: boolean;
  /** 服务器 URL */
  url?: string;
  /** Socket.IO namespace */
  namespace?: string;
  /** 客户端类型 */
  clientType?: 'extension' | 'page';
  /** Tab ID */
  tabId?: string;
  /** 自动重连 */
  autoReconnect?: boolean;
}

/**
 * Mimo Hub 连接 Hook
 *
 * 使用新的 BrowserHubClient 连接到 MimoBus 服务端
 *
 * @example
 * ```tsx
 * // 在 layout.tsx 中使用（默认禁用，通过环境变量启用）
 * export default function RootLayout({ children }) {
 *   useMimoHub();  // 确保 hub 连接在所有页面中保持活跃
 *   return <html><body>{children}</body></html>;
 * }
 * ```
 */
export function useMimoHub(options: UseMimoHubOptions = {}): MimoHubReturn {
  const { enabled = HUB_ENABLED, silent = true, url, namespace, clientType, tabId, autoReconnect } = options;
  const [state, setState] = useState<MimoHubState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // 跟踪是否已注册命令处理器（只注册一次）
  const handlersRegisteredRef = useRef(false);

  // 创建 BrowserHubClient 实例（单例）
  const client = useMemo(() => {
    if (!enabled) return null;
    return createBrowserHubClient({
      url: url || HUB_URL,
      namespace: namespace || '/mimo',
      clientType: clientType || 'page',
      autoReconnect: autoReconnect ?? true,
      debug: !silent,
      tabId,
    });
  }, [enabled, silent, url, namespace, clientType, tabId, autoReconnect]);

  useEffect(() => {
    if (!client) return;

    let mounted = true;

    const connect = async () => {
      if (!mounted) return;
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        await client.connect();
        if (!mounted) return;
        setState((prev) => ({ ...prev, isConnected: true, isConnecting: false }));

        if (!silent) {
          console.log('[useMimoHub] Connected to MimoBus server');
        }

        // 注册命令处理器（只注册一次）
        if (!handlersRegisteredRef.current) {
          MimoRouter.registerAll(client);
          handlersRegisteredRef.current = true;
          if (!silent) {
            console.log('[useMimoHub] Command handlers registered');
          }
        }
      } catch (error) {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : String(error);
        setState({ isConnected: false, isConnecting: false, error: errorMessage });
        console.error('[useMimoHub] Failed to connect:', error);
      }
    };

    connect();

    // 清理函数
    return () => {
      mounted = false;
      client.disconnect();
      setState({ isConnected: false, isConnecting: false, error: null });
    };
  }, [client, silent]);

  return {
    client,
    ...state,
    isEnabled: enabled,
  };
}
