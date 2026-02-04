import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin, Pin, EyeOff, Layers } from "lucide-react";
import type { TabState, WindowState, TabGroupState } from "@twin/chrome";
import { cn } from "@/lib/utils";
import { TwinStatBadge } from "./twin-stat-badge";

interface TwinTabsListProps {
  tabs: TabState[];
  windows: Map<number, WindowState>;
  groups?: Map<number, TabGroupState>; // Added groups prop
  activeTabId: number | null;
  className?: string;
}

interface TabRowProps {
  tab: TabState;
  isActive: boolean;
  windowTitle?: string;
  group?: TabGroupState; // Added group prop
}

const GROUP_COLORS: Record<string, string> = {
  grey: "bg-slate-400 border-slate-500",
  blue: "bg-blue-400 border-blue-500",
  red: "bg-red-400 border-red-500",
  yellow: "bg-yellow-400 border-yellow-500",
  green: "bg-green-400 border-green-500",
  pink: "bg-pink-400 border-pink-500",
  purple: "bg-purple-400 border-purple-500",
  cyan: "bg-cyan-400 border-cyan-500",
  orange: "bg-orange-400 border-orange-500",
};

function TabRow({ tab, isActive, windowTitle, group }: TabRowProps) {
  // Get hostname from URL for display
  const getHostname = (url: string | null) => {
    if (!url) return "N/A";
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-muted/50 [&_td]:last:border-b-0",
        isActive && "bg-muted/70"
      )}
    >
      <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground/70">
        {tab.id}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          {tab.favIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tab.favIconUrl}
              alt=""
              className="h-4 w-4 flex-shrink-0 rounded-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
          )}
          <span className="truncate font-medium text-foreground" title={tab.title || "Untitled"}>
            {tab.title || "Untitled"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <span className="truncate text-muted-foreground/80 block" title={getHostname(tab.url)}>
          {getHostname(tab.url)}
        </span>
      </td>
      <td className="px-4 py-3 align-middle text-sm text-muted-foreground/70 font-mono">{tab.windowId}</td>
      <td className="px-4 py-3 align-middle">
        {group ? (
          <div className="flex items-center gap-1.5" title={`Group: ${group.title || "Untitled"}`}>
            <span className={cn("h-3 w-3 rounded-full border", GROUP_COLORS[group.color] || "bg-gray-400 border-gray-500")}></span>
            <span className="text-xs font-medium text-muted-foreground max-w-[100px] truncate">{group.title || "Group"}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">-</span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        {tab.status && <TwinStatBadge status={tab.status} />}
      </td>
      <td className="px-4 py-3 align-middle text-center text-sm text-muted-foreground/70 font-mono">{tab.index}</td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          {tab.active && <TwinStatBadge status="active" />}
          {tab.pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
              <Pin className="h-3 w-3" />
            </span>
          )}
          {tab.hidden && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
              <EyeOff className="h-3 w-3" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function TwinTabsList({ tabs, windows, groups, activeTabId, className }: TwinTabsListProps) {
  if (tabs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No tabs available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/60 bg-card/40 backdrop-blur-sm", className)}>
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-lg font-semibold">Tabs ({tabs.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/40 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-border/60 transition-colors">
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[80px]">
                  ID
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[280px] min-w-[200px]">
                  Title
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[200px] min-w-[150px]">
                  URL
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[80px]">
                  Window
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[120px]">
                  Group
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[90px]">
                  Status
                </th>
                <th className="h-11 px-4 text-center align-middle font-semibold text-muted-foreground/80 w-[60px]">
                  Index
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[120px]">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody>
              {tabs.map((tab) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  windowTitle={windows.get(tab.windowId)?.type}
                  group={tab.groupId && groups ? groups.get(tab.groupId) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
