'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useBionClient } from './use-bion';
import type { BrowserTwinState, TabState, WindowState } from '@twin/chrome';
import type { Socket } from 'socket.io-client';

export function useTwinState() {
  const { client, isConnected } = useBionClient({ enabled: true });
  const [twinState, setTwinState] = useState<BrowserTwinState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track which client instance we've subscribed to
  const subscribedClientRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 初始加载状态
    setIsLoading(true);
    setError(null);

    // 降级：先尝试从 API 获取初始状态
    const fetchInitialState = async () => {
      try {
        const res = await fetch('/api/twin');
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Twin API not found. Server may need restart.');
          }
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        // toJSON() 返回 Record<number, State> 格式，需要转换为 Map
        const windows = new Map(
          Object.entries(data.windows || {}).map(([id, win]) => [Number(id), win as WindowState])
        );
        const tabs = new Map(
          Object.entries(data.tabs || {}).map(([id, tab]) => [Number(id), tab as TabState])
        );
        const groups = new Map(
          Object.entries(data.groups || {}).map(([id, group]) => [Number(id), group as any])
        );
        setTwinState({
          windows,
          tabs,
          groups,
          activeWindowId: data.activeWindowId,
          activeTabId: data.activeTabId,
          extensionState: data.extensionState || 'idle',
          systemState: data.systemState || 'stopped',
          lastUpdated: data.lastUpdated,
        });
      } catch (err) {
        console.error('[useTwinState] Failed to fetch twin state:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialState();

    // Clean up previous socket subscription
    if (subscribedClientRef.current) {
      subscribedClientRef.current.off('twin_state_sync');
      subscribedClientRef.current = null;
    }

    // 如果没有连接，只使用 API 降级
    if (!client || !isConnected) {
      return;
    }

    // 已连接到 Socket.IO，订阅实时更新
    // Clean up previous subscription if client changed
    if (subscribedClientRef.current && subscribedClientRef.current !== client.socket) {
      subscribedClientRef.current.off('twin_state_sync');
    }

    // 如果已经订阅过这个 client，跳过
    if (subscribedClientRef.current === client.socket) {
      return;
    }

    // 订阅实时更新
    const handleTwinStateSync = (data: unknown) => {
      try {
        const payload = data as {
          type: string;
          state: {
            windows: Array<{
              id: number;
              focused: boolean;
              top: number | null;
              left: number | null;
              width: number | null;
              height: number | null;
              type: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
              tabIds: number[];
              lastUpdated: number;
            }>;
            tabs: Array<{
              id: number;
              windowId: number;
              groupId?: number;
              url: string | null;
              title: string | null;
              favIconUrl: string | null;
              status: 'loading' | 'complete' | null;
              active: boolean;
              pinned: boolean;
              hidden: boolean;
              index: number;
              openerTabId: number | null;
              lastUpdated: number;
            }>;
            groups?: Record<string, any>; // or array depending on how it's sent. BrowserTwinStore.toJSON sends Object (Record).
            activeWindowId: number | null;
            activeTabId: number | null;
            extensionState?: any;
            systemState?: any;
            lastUpdated: number;
          };
        };

        if (payload.type !== 'twin_state_sync') return;

        console.log('[useTwinState] Received sync:', {
          activeWindowId: payload.state.activeWindowId,
          windows: payload.state.windows.map(w => ({ id: w.id, focused: w.focused }))
        });

        // 转换为 Map 结构
        const windows = new Map(
          payload.state.windows.map((w) => [w.id, w])
        );
        const tabs = new Map(
          payload.state.tabs.map((t) => [t.id, t])
        );

        // Handle groups if present (could be array or object depending on source, but assuming array here like tabs)
        // If it comes from BrowserStateSync (plasmo), it is array.
        const rawGroups = payload.state.groups;
        let groups = new Map();
        if (Array.isArray(rawGroups)) {
          groups = new Map(rawGroups.map((g: any) => [g.id, g]));
        } else if (typeof rawGroups === 'object' && rawGroups !== null) {
          groups = new Map(Object.entries(rawGroups).map(([id, g]) => [Number(id), g]));
        }

        setTwinState({
          windows,
          tabs,
          groups,
          activeWindowId: payload.state.activeWindowId,
          activeTabId: payload.state.activeTabId,
          extensionState: payload.state.extensionState ?? 'idle',
          systemState: payload.state.systemState ?? 'stopped',
          lastUpdated: payload.state.lastUpdated,
        });
      } catch (err) {
        console.error('[useTwinState] Failed to parse twin state sync:', err);
      }
    };

    client.socket.on('twin_state_sync', handleTwinStateSync);
    subscribedClientRef.current = client.socket;

    return () => {
      if (subscribedClientRef.current === client.socket) {
        subscribedClientRef.current.off('twin_state_sync', handleTwinStateSync);
        subscribedClientRef.current = null;
      }
    };
  }, [client, isConnected]);

  // 计算派生状态
  const metrics = useMemo(() => {
    if (!twinState) {
      return {
        totalWindows: 0,
        totalTabs: 0,
        activeWindowId: null,
        activeTabId: null,
        loadingTabsCount: 0,
        completeTabsCount: 0,
      };
    }

    const tabs = Array.from(twinState.tabs.values());
    const windows = Array.from(twinState.windows.values());
    const loadingTabs = tabs.filter((t) => t.status === 'loading').length;
    const completeTabs = tabs.filter((t) => t.status === 'complete').length;

    return {
      totalWindows: windows.length,
      totalTabs: tabs.length,
      activeWindowId: twinState.activeWindowId,
      activeTabId: twinState.activeTabId,
      loadingTabsCount: loadingTabs,
      completeTabsCount: completeTabs,
    };
  }, [twinState]);

  return {
    twinState,
    isConnected,
    isLoading,
    error,
    metrics,
  };
}
