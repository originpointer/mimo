import Link from "next/link";

import { ConnectorChip } from "@/components/chat/connector-chip";
import { Button } from "@/components/ui/button";

const SUGGESTIONS: Array<{ label: string; prompt: string }> = [
  { label: "打开 localhost 并检查页面", prompt: "使用浏览器插件打开 localhost，并告诉我你看到了什么。" },
  { label: "总结当前页面的主要信息", prompt: "用浏览器插件抓取当前页面内容，给我一个要点总结。" },
  { label: "提取页面里的关键信息", prompt: "用浏览器插件提取当前页面里最关键的信息（标题、摘要、链接）。" },
];

export default function ChatHome({
  newTask,
}: {
  newTask: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="h-full">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[768px] flex-col px-6 py-10">
          <div className="mt-[12vh]">
            <h1 className="text-balance font-serif text-4xl font-medium tracking-tight">
              我能为你做什么？
            </h1>
          </div>

          <div className="mt-10 w-full">
            <form action={newTask} className="relative">
              <div className="rounded-[22px] border bg-background/70 shadow-sm backdrop-blur">
                <div className="px-4 pt-4">
                  <textarea
                    name="prompt"
                    rows={2}
                    placeholder="分配一个任务或提问任何问题"
                    className="w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex items-center gap-2 px-3 pb-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled
                    aria-label="附件（即将支持）"
                  >
                    +
                  </Button>

                  <ConnectorChip />

                  <div className="ml-auto">
                    <Button type="submit" className="rounded-full">
                      新建并开始
                    </Button>
                  </div>
                </div>
              </div>

              <div className="-mt-[18px] rounded-b-[22px] border-x border-b bg-muted/20 px-5 pb-3 pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="truncate">将你的工具连接到 Mimo</span>
                  <div className="ml-auto">
                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                      <Link href="/tools">去配置</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <form key={s.label} action={newTask}>
                  <input type="hidden" name="prompt" value={s.prompt} />
                  <Button type="submit" variant="outline" className="rounded-full">
                    {s.label}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

