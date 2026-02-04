import { cn } from "@/lib/utils";

export type StatBadgeStatus = "loading" | "complete" | "active" | "inactive" | "pinned" | "hidden";

interface TwinStatBadgeProps {
  status: StatBadgeStatus;
  className?: string;
}

const statusStyles: Record<StatBadgeStatus, string> = {
  loading: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
  complete: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
  active: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20",
  pinned: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30",
  hidden: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-500/20",
};

const statusLabels: Record<StatBadgeStatus, string> = {
  loading: "Loading",
  complete: "Complete",
  active: "Active",
  inactive: "Inactive",
  pinned: "Pinned",
  hidden: "Hidden",
};

export function TwinStatBadge({ status, className }: TwinStatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
