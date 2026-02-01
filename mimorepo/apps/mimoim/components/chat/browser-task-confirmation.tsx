"use client";

export function BrowserTaskConfirmation(props: {
  summary: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-3 text-sm">
      <div className="font-medium">确认开启浏览器任务</div>
      <div className="mt-1 text-xs text-muted-foreground">{props.summary}</div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-lg border bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80"
          onClick={props.onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          onClick={props.onConfirm}
        >
          确认
        </button>
      </div>
    </div>
  );
}

