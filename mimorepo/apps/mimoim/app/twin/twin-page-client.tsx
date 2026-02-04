"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TwinMetrics } from "@/components/twin/twin-metrics";
import { TwinWindowsList } from "@/components/twin/twin-windows-list";
import { TwinTabsList } from "@/components/twin/twin-tabs-list";
import { TwinConnectionStatus } from "@/components/twin/twin-connection-status";
import { useTwinState } from "@/lib/hooks/use-twin-state";
import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Twin page client component
 *
 * Displays browser digital twin state with metrics, windows list, and tabs list.
 * Uses real-time data from the browser extension via Bion Socket.IO.
 */
export function TwinPageClient() {
  const { twinState, isConnected, isLoading, error, metrics } = useTwinState();

  // Convert Map to array for easier rendering
  const windows = useMemo(() => {
    if (!twinState) return [];
    return Array.from(twinState.windows.values());
  }, [twinState]);

  const tabs = useMemo(() => {
    if (!twinState) return [];
    return Array.from(twinState.tabs.values());
  }, [twinState]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-dvh w-full min-w-0 flex-col bg-background overflow-auto">
        <div className="container mx-auto max-w-7xl p-6 space-y-6 flex-1">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading browser state...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-dvh w-full min-w-0 flex-col bg-background overflow-auto">
        <div className="container mx-auto max-w-7xl p-6 space-y-6 flex-1">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-red-500">Error: {error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!twinState) {
    return (
      <div className="flex h-dvh w-full min-w-0 flex-col bg-background overflow-auto">
        <div className="container mx-auto max-w-7xl p-6 space-y-6 flex-1">
          <TwinConnectionStatus isConnected={isConnected} error={error} />
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                No browser state available. Make sure the browser extension is connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full min-w-0 flex-col bg-background overflow-auto">
      <div className="container mx-auto max-w-7xl p-6 space-y-6 flex-1">
        {/* Header with connection status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Browser Digital Twin</h1>
            <p className="text-sm text-muted-foreground">
              Real-time browser state monitoring dashboard
            </p>
          </div>
          <TwinConnectionStatus isConnected={isConnected} error={error} />
        </div>

        {/* Metrics */}
        <TwinMetrics
          {...metrics}
          extensionState={twinState.extensionState}
          systemState={twinState.systemState}
        />

        {/* Lists */}
        <div className="space-y-6">
          <TwinWindowsList
            windows={windows}
            activeWindowId={twinState.activeWindowId}
          />
          <TwinTabsList
            tabs={tabs}
            windows={twinState.windows}
            groups={twinState.groups}
            activeTabId={twinState.activeTabId}
          />
        </div>
      </div>
    </div>
  );
}
