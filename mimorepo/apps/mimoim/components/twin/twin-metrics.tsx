import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Globe, Monitor, Loader2, Cpu, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwinMetricsProps {
  totalWindows: number;
  totalTabs: number;
  activeWindowId: number | null;
  activeTabId: number | null;
  loadingTabsCount: number;
  completeTabsCount: number;
  extensionState?: string;
  systemState?: string;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

function MetricCard({ title, value, description, icon, className }: MetricCardProps) {
  return (
    <Card className={cn(
      "border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-border hover:shadow-sm",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground/80">{title}</CardTitle>
        <div className="rounded-lg bg-muted/50 p-1.5">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight capitalize">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function TwinMetrics({
  totalWindows,
  totalTabs,
  activeWindowId,
  activeTabId,
  loadingTabsCount,
  completeTabsCount,
  extensionState,
  systemState,
  className,
}: TwinMetricsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      <MetricCard
        title="Total Windows"
        value={totalWindows}
        description={activeWindowId ? `Window ${activeWindowId} active` : "No active window"}
        icon={<Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />}
      />
      <MetricCard
        title="Total Tabs"
        value={totalTabs}
        description={activeTabId ? `Tab ${activeTabId} active` : "No active tab"}
        icon={<Globe className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
      />
      <MetricCard
        title="System State"
        value={systemState || "Unknown"}
        description="Background session status"
        icon={<Server className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
      />
      <MetricCard
        title="Extension State"
        value={extensionState || "Unknown"}
        description="Content script status"
        icon={<Cpu className="h-4 w-4 text-orange-500 dark:text-orange-400" />}
      />
      <MetricCard
        title="Loading Tabs"
        value={loadingTabsCount}
        description={`${completeTabsCount} tabs complete`}
        icon={<Loader2 className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
      />
      <MetricCard
        title="Active Window"
        value={activeWindowId ?? "N/A"}
        description={activeWindowId ? "Currently focused" : "No focus"}
        icon={<Monitor className="h-4 w-4 text-sky-500 dark:text-sky-400" />}
      />
    </div>
  );
}
