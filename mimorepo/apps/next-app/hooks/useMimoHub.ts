/**
 * useMimoHub Hook
 *
 * 管理 Mimo Hub Socket.IO 连接
 * 在 layout 中使用此 hook 可确保连接在整个应用生命周期中保持活跃
 *
 * 默认禁用连接，通过环境变量 NEXT_PUBLIC_MIMO_HUB_ENABLED=true 启用
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { HubClient, type HubClientState } from '@mimo/hub';

// 默认禁用，通过环境变量启用
const HUB_ENABLED = process.env.NEXT_PUBLIC_MIMO_HUB_ENABLED === 'true';

export interface MimoHubState extends HubClientState {
  isEnabled: boolean;
}

export interface MimoHubReturn extends MimoHubState {
  client: HubClient | null;
}

export interface UseMimoHubOptions {
  /** 是否启用连接，默认通过环境变量控制 */
  enabled?: boolean;
  /** 静默模式，减少控制台输出 */
  silent?: boolean;
}

/**
 * Mimo Hub 连接 Hook
 *
 * @example
 * ```tsx
 * // 在 layout.tsx 中使用（默认禁用，通过环境变量启用）
 * export default function RootLayout({ children }) {
 *   useMimoHub();  // 确保 hub 连接在所有页面中保持活跃
 *   return <html><body>{children}</body></html>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 在组件中使用
 * function MyComponent() {
 *   const { isConnected, client, isEnabled } = useMimoHub();
 *
 *   useEffect(() => {
 *     if (client && isConnected) {
 *       // 使用 client 发送命令
 *       client.sendMimoCommand('test', { foo: 'bar' });
 *
 *       // 监听消息
 *       const unsubscribe = client.onMessage((data) => {
 *         console.log('Received:', data);
 *       });
 *       return unsubscribe;
 *     }
 *   }, [client, isConnected]);
 *
 *   if (!isEnabled) return <div>Hub 未启用</div>;
 *   return <div>Hub: {isConnected ? '已连接' : '未连接'}</div>;
 * }
 * ```
 */
export function useMimoHub(options: UseMimoHubOptions = {}): MimoHubReturn {
  const { enabled = HUB_ENABLED, silent = true } = options;
  const [state, setState] = useState<HubClientState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // 创建 HubClient 实例（单例）
  const client = useMemo(() => {
    if (!enabled) return null;
    return new HubClient({ silent });
  }, [enabled, silent]);

  useEffect(() => {
    if (!client) return;

    // 监听状态变化
    const unsubscribe = client.onStateChange((newState: HubClientState) => {
      setState(newState);
    });

    // 连接到服务器
    client.connect().catch((error: unknown) => {
      console.error('[useMimoHub] Failed to connect:', error);
    });

    // 清理函数
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  return {
    client,
    ...state,
    isEnabled: enabled,
  };
}

