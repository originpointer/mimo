"use client";

import type { BionBrowserCandidate } from "@bion/protocol";
import { useEffect, useMemo, useState } from "react";
import type { BionClientInfo, ExtensionRegistration } from "@/lib/extension-discovery";
import {
  fetchExtensionList,
  getApiBaseCandidatesForDebug,
  probeBionClientInfoViaBridge,
} from "@/lib/extension-discovery";

export function BrowserSelection(props: {
  candidates: BionBrowserCandidate[];
  onSelect: (clientId: string) => void;
}) {
  const candidates = props.candidates ?? [];

  const [bridgeInfo, setBridgeInfo] = useState<BionClientInfo | null>(null);
  const [extensionList, setExtensionList] = useState<{
    ok: true;
    base: string;
    extensions: ExtensionRegistration[];
    latest: ExtensionRegistration | null;
  } | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  const apiBases = useMemo(() => getApiBaseCandidatesForDebug(), []);

  useEffect(() => {
    if (candidates.length > 0) return;
    let cancelled = false;

    void (async () => {
      setDebugError(null);
      try {
        const info = await probeBionClientInfoViaBridge({ timeoutMs: 1500 });
        if (!cancelled) setBridgeInfo(info);
      } catch (e) {
        if (!cancelled) setDebugError(e instanceof Error ? e.message : String(e));
      }

      try {
        const list = await fetchExtensionList();
        if (!cancelled) {
          if (list.ok) setExtensionList(list);
        }
      } catch (e) {
        if (!cancelled) setDebugError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [candidates.length]);

  const nextPublicBionUrl = process.env.NEXT_PUBLIC_BION_URL || "http://localhost:6007";
  const nextPublicMimoserverUrl = (process.env.NEXT_PUBLIC_MIMOSERVER_URL || "").trim();
  const nextPublicBionEnabled = process.env.NEXT_PUBLIC_BION_ENABLED === "true";

  return (
    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
      <div className="font-medium">请选择要使用的浏览器插件</div>
      <div className="mt-2 grid gap-2">
        {candidates.length === 0 ? (
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">
              暂无已连接的浏览器插件。请先打开插件并保持在线。
            </div>

            <details className="rounded-lg border bg-background/60 p-2 text-xs">
              <summary className="cursor-pointer select-none font-medium">
                诊断信息（端口/连接状态）
              </summary>
              <div className="mt-2 grid gap-2 text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">mimoim 环境变量</div>
                  <div className="mt-1">
                    <div>
                      <span className="font-medium text-foreground">NEXT_PUBLIC_BION_ENABLED</span>:{" "}
                      {String(nextPublicBionEnabled)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">NEXT_PUBLIC_BION_URL</span>:{" "}
                      {nextPublicBionUrl}
                    </div>
                    {nextPublicMimoserverUrl ? (
                      <div>
                        <span className="font-medium text-foreground">NEXT_PUBLIC_MIMOSERVER_URL</span>:{" "}
                        {nextPublicMimoserverUrl}
                      </div>
                    ) : null}
                    <div>
                      <span className="font-medium text-foreground">API base candidates</span>:{" "}
                      {apiBases.length ? apiBases.join(", ") : "(none)"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-medium text-foreground">浏览器插件（bridge）</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-2">
                    {bridgeInfo ? JSON.stringify(bridgeInfo, null, 2) : "loading..."}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-foreground">mimoserver 注册信息（/api/extension/extension-list）</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-2">
                    {extensionList
                      ? JSON.stringify(
                          { base: extensionList.base, latest: extensionList.latest, count: extensionList.extensions.length },
                          null,
                          2
                        )
                      : "loading..."}
                  </div>
                </div>

                {debugError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-foreground">
                    <div className="font-medium">诊断错误</div>
                    <div className="mt-1 whitespace-pre-wrap">{debugError}</div>
                  </div>
                ) : null}

                <div className="text-xs">
                  常见原因：mimoserver 的 Socket.IO 端口被占用后会自动切换（例如从 6007 切到 6009），导致插件仍连到旧端口。
                  请以 mimoserver 日志里的 <span className="font-medium text-foreground">[Bion] Socket.IO server listening on :XXXX/mimo</span> 为准，
                  然后让插件和 mimoim 都使用同一个端口。
                </div>
              </div>
            </details>
          </div>
        ) : (
          candidates.map((c) => (
            <button
              key={c.clientId}
              type="button"
              className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted"
              onClick={() => props.onSelect(c.clientId)}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{c.clientName || "MimoBrowser"}</div>
                <div className="truncate text-xs text-muted-foreground">{c.clientId}</div>
              </div>
              <div className="text-xs text-muted-foreground">选择</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

