"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchExtensionList } from "@/lib/extension-discovery";
import type { ExtensionRegistration } from "@/lib/extension-discovery";
import { useExtensionStore } from "../_stores/use-extension-store";

/**
 * useExtensions Hook 配置选项
 */
export interface UseExtensionsOptions {
  /** 是否启用扩展列表获取，默认为 true */
  enabled?: boolean;
  /** 轮询间隔（毫秒），可选，设置后会定期刷新扩展列表 */
  pollIntervalMs?: number;
}

/**
 * useExtensions Hook 返回值
 */
export interface UseExtensionsReturn {
  /** 扩展列表 */
  extensions: ExtensionRegistration[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新获取扩展列表 */
  refetch: () => Promise<void>;
  /** 已选中的扩展 ID 集合 */
  selectedExtensionIds: Set<string>;
  /** 切换扩展的选中状态 */
  toggleExtension: (extensionId: string) => void;
}

/**
 * 扩展插件管理 Hook
 *
 * 获取并管理浏览器扩展插件列表，支持选中/取消选中扩展。
 * 选中状态会通过 zustand store 持久化到 localStorage。
 *
 * @example
 * ```tsx
 * const { extensions, isLoading, selectedExtensionIds, toggleExtension } = useExtensions();
 * const { extensions, selectedExtensionIds, toggleExtension } = useExtensions({ enabled: true, pollIntervalMs: 30000 });
 * ```
 */
export function useExtensions(options: UseExtensionsOptions = {}): UseExtensionsReturn {
  const { enabled = true, pollIntervalMs } = options;

  // 扩展列表状态
  const [extensions, setExtensions] = useState<ExtensionRegistration[]>([]);
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);

  // 从 zustand store 获取持久化的选中状态和操作方法
  const selectedExtensionIds = useExtensionStore((state) => state.selectedExtensionIds);
  const toggleExtension = useExtensionStore((state) => state.toggleExtension);

  // 获取扩展列表
  const fetchExtensions = async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchExtensionList();
      if (result.ok) {
        setExtensions(result.extensions);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化获取和轮询
  useEffect(() => {
    fetchExtensions();
    if (pollIntervalMs && pollIntervalMs > 0) {
      const interval = setInterval(fetchExtensions, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [enabled, pollIntervalMs]);

  // 使用 useMemo 缓存返回值，避免不必要的重渲染
  return useMemo(
    () => ({
      extensions,
      isLoading,
      error,
      refetch: fetchExtensions,
      selectedExtensionIds,
      toggleExtension,
    }),
    [extensions, isLoading, error, selectedExtensionIds]
  );
}
