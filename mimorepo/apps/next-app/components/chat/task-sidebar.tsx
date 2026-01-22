import Link from "next/link";

import type { ChatListItem } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";

function formatUpdatedAt(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskSidebar({
  chats,
  currentChatId,
  newTask,
}: {
  chats: ChatListItem[];
  currentChatId?: string;
  newTask: (formData: FormData) => Promise<void>;
}) {
  return (
    <aside className="w-[300px] shrink-0 border-r bg-background">
      <div className="flex h-dvh flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-sm font-semibold">
              M
            </div>
            <div className="text-sm font-medium">Mimo</div>
          </div>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Settings">
            <span className="text-lg leading-none">⋯</span>
          </Button>
        </div>

        {/* Quick actions */}
        <div className="px-2">
          <form action={newTask}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full justify-start rounded-xl"
            >
              新建任务
            </Button>
          </form>
          <div className="mt-2 grid gap-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start rounded-xl text-muted-foreground"
              disabled
            >
              搜索（即将支持）
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start rounded-xl text-muted-foreground"
              disabled
            >
              库（即将支持）
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="px-4 pb-2 text-xs font-medium text-muted-foreground">
            所有任务
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {chats.length === 0 ? (
              <div className="px-2 py-6 text-sm text-muted-foreground">
                暂无历史任务。点击上方“新建任务”开始。
              </div>
            ) : (
              <ul className="space-y-1">
                {chats.map((c) => {
                  const active = currentChatId && c.id === currentChatId;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/chat/${c.id}`}
                        className={[
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "hover:bg-muted/70 text-foreground",
                        ].join(" ")}
                      >
                        <div className="size-8 shrink-0 rounded-lg border bg-background" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{c.title}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {formatUpdatedAt(c.updatedAt)}
                          </div>
                        </div>
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-muted-foreground">⋯</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t p-3">
          <div className="grid gap-2">
            <Button variant="outline" className="w-full justify-start rounded-xl" asChild>
              <Link href="/tools">连接浏览器插件</Link>
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="size-8" aria-label="Help">
                ?
              </Button>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Share">
                ↗
              </Button>
              <div className="ml-auto text-xs text-muted-foreground">Manus 风格</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

