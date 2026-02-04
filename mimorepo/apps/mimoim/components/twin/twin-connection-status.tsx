import { cn } from "@/lib/utils";

export interface TwinConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

/**
 * TwinConnectionStatus component
 *
 * Displays the connection status to the browser extension.
 * Shows a green indicator when connected, yellow when waiting.
 */
export function TwinConnectionStatus({ isConnected, error }: TwinConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-green-500" : "bg-yellow-500"
      )} />
      <span className="text-sm text-muted-foreground">
        {isConnected ? "实时连接" : "等待连接"}
      </span>
      {error && (
        <span className="text-sm text-red-500" title={error}>
          连接错误
        </span>
      )}
    </div>
  );
}
