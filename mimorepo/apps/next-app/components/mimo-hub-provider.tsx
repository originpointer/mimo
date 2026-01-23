/**
 * MimoHubProvider
 *
 * Provider 组件用于在根 layout 中初始化 Mimo Hub 连接
 * 确保连接在整个应用生命周期中保持活跃
 *
 * 默认禁用连接，通过环境变量 NEXT_PUBLIC_MIMO_HUB_ENABLED=true 启用
 */

'use client';

import { useMimoHub } from '@/hooks/useMimoHub';
import { useEffect } from 'react';

export function MimoHubProvider({ children }: { children: React.ReactNode }) {
  // 默认使用静默模式，减少控制台输出
  const { isConnected, isConnecting, error, client, isEnabled } = useMimoHub({
    silent: false,
  });

  useEffect(() => {
    if (!isEnabled) return;

    if (isConnected) {
      console.log('[MimoHubProvider] Hub is ready');
    }
    if (error) {
      console.error('[MimoHubProvider] Hub error:', error);
    }
  }, [isConnected, isConnecting, error, isEnabled]);

  return <>{children}</>;
}
