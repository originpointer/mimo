"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useExtensionTabsStore } from "@/app/tools/_stores/extensionTabsStore";
import { Button } from "@/components/ui/button";

export function ConnectorChip() {
  const extensionName = useExtensionTabsStore((s) => s.extensionName);
  const extensionId = useExtensionTabsStore((s) => s.extensionId);
  const extensionError = useExtensionTabsStore((s) => s.extensionError);
  const tabs = useExtensionTabsStore((s) => s.tabs);
  const targetTabId = useExtensionTabsStore((s) => s.targetTabId);

  const tabLabel = useMemo(() => {
    if (!tabs.length) return "";
    const picked =
      targetTabId === "active"
        ? tabs.find((t) => t.active) ?? tabs[0]
        : tabs.find((t) => t.id === targetTabId);
    const title = (picked?.title || "").trim();
    const url = (picked?.url || "").trim();
    return title || url;
  }, [tabs, targetTabId]);

  const connected = Boolean(extensionId) && !extensionError;

  return (
    <Button
      variant="outline"
      className="h-9 max-w-[320px] rounded-full px-3 text-sm"
      asChild
    >
      <Link href="/tools" title="连接/选择浏览器插件与目标 Tab">
        <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs">
          🧩
        </span>
        <span className="min-w-0 flex-1 truncate">
          {connected ? (
            <>
              {extensionName || "浏览器插件"}
              {tabLabel ? (
                <span className="text-muted-foreground"> · {tabLabel}</span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">
              未连接浏览器插件（点此配置）
            </span>
          )}
        </span>
      </Link>
    </Button>
  );
}

