"use client";

import { useEffect, useMemo, useState } from "react";
import type { BionClientInfo } from "@/lib/extension-discovery";
import { probeBionClientInfoViaBridge } from "@/lib/extension-discovery";

/**
 * 插件信息 Hook 配置选项
 */
export interface UsePluginInfoOptions {
  /** 是否启用插件信息探测，默认为 true */
  enabled?: boolean;
  /** 探测超时时间（毫秒），默认为 1500ms */
  timeoutMs?: number;
}

/**
 * 插件信息 Hook 返回值
 */
export interface UsePluginInfoReturn {
  /** 插件信息，包含 extensionId、extensionName、version、clientId 等字段 */
  pluginInfo: BionClientInfo | null;
  /** 是否正在探测中 */
  isPending: boolean;
  /** 错误信息，如果探测失败则包含错误描述 */
  error: string | null;
}

/**
 * 插件信息处理 Hook
 *
 * 通过 window.postMessage 桥接方式探测浏览器插件的连接信息。
 * 支持配置启用状态和超时时间，返回插件信息、加载状态和错误信息。
 *
 * @example
 * ```tsx
 * const pluginInfo = usePluginInfo();
 * const pluginInfo = usePluginInfo({ enabled: true, timeoutMs: 2000 });
 * ```
 */
export function usePluginInfo(options: UsePluginInfoOptions = {}): UsePluginInfoReturn {
  const { enabled = true, timeoutMs = 1500 } = options;

  // 插件信息状态
  const [pluginInfo, setPluginInfo] = useState<BionClientInfo | null>(null);
  // 加载状态
  const [isPending, setIsPending] = useState(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 如果未启用，重置状态并返回
    if (!enabled) {
      setPluginInfo(null);
      setError(null);
      setIsPending(false);
      return;
    }

    let cancelled = false;
    setIsPending(true);
    setError(null);

    // 异步探测插件信息
    void (async () => {
      try {
        const info = await probeBionClientInfoViaBridge({ timeoutMs });
        if (!cancelled) {
          setPluginInfo(info);
          // 如果探测失败，记录错误信息
          if (!info.ok) {
            setError(info.error);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setIsPending(false);
        }
      }
    })();

    // 清理函数：取消正在进行的探测
    return () => {
      cancelled = true;
    };
  }, [enabled, timeoutMs]);

  // 使用 useMemo 缓存返回值，避免不必要的重渲染
  return useMemo(
    () => ({
      pluginInfo,
      isPending,
      error,
    }),
    [pluginInfo, isPending, error]
  );
}
