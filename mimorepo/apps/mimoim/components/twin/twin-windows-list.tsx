import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Maximize2, Crosshair, Eye, EyeOff } from "lucide-react";
import type { WindowState } from "@twin/chrome";
import { cn } from "@/lib/utils";

interface TwinWindowsListProps {
  windows: WindowState[];
  activeWindowId: number | null;
  className?: string;
}

interface WindowRowProps {
  window: WindowState;
  isActive: boolean;
}

function WindowRow({ window, isActive }: WindowRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-muted/50 [&_td]:last:border-b-0",
        isActive && "bg-muted/70"
      )}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground/70" />
          <span className="font-medium text-foreground">{window.id}</span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <span className="inline-flex items-center rounded-md bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground/80 border border-border/40">
          {window.type}
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="font-mono">
            {window.width} × {window.height}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
          <Crosshair className="h-3.5 w-3.5" />
          <span className="font-mono">
            {window.top}, {window.left}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-sm text-muted-foreground/70 font-mono">{window.tabIds.length}</td>
      <td className="px-4 py-3 align-middle">
        {window.focused ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Eye className="h-3.5 w-3.5" />
            Focused
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <EyeOff className="h-3.5 w-3.5" />
            Not focused
          </span>
        )}
      </td>
    </tr>
  );
}

export function TwinWindowsList({ windows, activeWindowId, className }: TwinWindowsListProps) {
  if (windows.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Windows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No windows available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/60 bg-card/40 backdrop-blur-sm", className)}>
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-lg font-semibold">Windows ({windows.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/40 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-border/60 transition-colors">
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[100px]">
                  ID
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[120px]">
                  Type
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[140px]">
                  Dimensions
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[140px]">
                  Position
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[80px]">
                  Tabs
                </th>
                <th className="h-11 px-4 text-left align-middle font-semibold text-muted-foreground/80 w-[120px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {windows.map((window) => (
                <WindowRow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
