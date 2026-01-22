"use client";

import { type UIMessage } from "ai";
import { SendHorizontalIcon } from "lucide-react";
import { type FormEvent, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ConnectorChip } from "@/components/chat/connector-chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ChatInterfaceProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  addToolOutput?: (args: {
    tool: string;
    toolCallId: string;
    output: unknown;
  }) => void;
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  addToolOutput,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40">
      {/* Messages Area */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto scroll-smooth px-4 pt-8">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="w-full max-w-[768px] space-y-4 pb-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                addToolOutput={addToolOutput}
              />
            ))}
            {isLoading && (
              <div className="flex w-full max-w-[768px] gap-4 py-4">
                <Avatar className="size-10 border">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
                    🤖
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} className="min-h-8" />
      </div>

      {/* Input Area */}
      <div className="mx-auto w-full max-w-[768px] px-4 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="rounded-[22px] border bg-background/70 shadow-sm backdrop-blur">
            <div className="px-4 pt-4">
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="分配一个任务或提问任何问题"
                rows={2}
                autoFocus
                className="max-h-52 w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
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
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 rounded-full"
                  disabled={isLoading || !input.trim()}
                  aria-label="发送"
                >
                  <SendHorizontalIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex w-full max-w-[768px] flex-grow basis-full flex-col items-center justify-center px-6">
      <Avatar className="size-20 border-2 border-primary/10">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl">
          🤖
        </AvatarFallback>
      </Avatar>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">你好！</h1>
      <p className="mt-2 text-muted-foreground">我能帮你完成什么任务？</p>
    </div>
  );
}

function MessageBubble({
  message,
  addToolOutput,
}: {
  message: UIMessage;
  addToolOutput?: ChatInterfaceProps["addToolOutput"];
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={[
        "flex w-full gap-4 py-3",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      {!isUser && (
        <Avatar className="size-10 border bg-background">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
            🤖
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={[
          "max-w-[640px] rounded-2xl px-4 py-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
        ].join(" ")}
      >
        {message.parts.map((part: any, index: number) => {
          if (part.type === "step-start") {
            return index > 0 ? (
              <div key={index} className="my-2">
                <hr className="border-border" />
              </div>
            ) : null;
          }

          if (part.type === "text") {
            const text = String(part.text ?? "");
            if (!text.trim()) return null;
            return (
              <div
                key={index}
                className={isUser ? "whitespace-pre-wrap" : "prose prose-sm dark:prose-invert max-w-none leading-7"}
              >
                {isUser ? (
                  text
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                )}
              </div>
            );
          }

          // 兼容 tool parts（来自旧版 /chat/page.tsx）
          if (part.type === "tool-askForConfirmation") {
            const input = part.input as { message?: string } | undefined;
            const output = part.output as { confirmed?: boolean } | undefined;
            const messageText = input?.message ?? "需要确认操作";

            if (part.state === "output-available") {
              const confirmed = Boolean(output?.confirmed);
              return (
                <div key={index} className="mt-3 text-sm">
                  <div className="text-muted-foreground">{messageText}</div>
                  <div className="mt-2 font-medium">{confirmed ? "已确认" : "已拒绝"}</div>
                </div>
              );
            }

            if (part.state === "input-available" || part.state === "input-streaming") {
              return (
                <div key={index} className="mt-3 text-sm">
                  <div className="text-muted-foreground">{messageText}</div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        addToolOutput?.({
                          tool: "askForConfirmation",
                          toolCallId: part.toolCallId,
                          output: { confirmed: true },
                        })
                      }
                      disabled={!addToolOutput}
                    >
                      确认
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        addToolOutput?.({
                          tool: "askForConfirmation",
                          toolCallId: part.toolCallId,
                          output: { confirmed: false },
                        })
                      }
                      disabled={!addToolOutput}
                    >
                      拒绝
                    </Button>
                  </div>
                </div>
              );
            }

            if (part.state === "output-error") {
              return (
                <div key={index} className="mt-3 text-sm">
                  <div className="text-muted-foreground">{messageText}</div>
                  <div className="mt-2 text-destructive">{part.errorText || "执行失败"}</div>
                </div>
              );
            }

            return null;
          }

          if (part.type === "tool-getLocation" || part.type === "tool-getWeatherInformation") {
            return (
              <div key={index} className="mt-3 text-sm text-muted-foreground">
                {(part.state === "input-streaming" || part.state === "input-available") && (
                  <div>
                    {part.type === "tool-getLocation" ? "正在获取位置信息..." : "正在获取天气信息..."}
                  </div>
                )}
                {part.state === "output-available" && (
                  <div>
                    {part.type === "tool-getLocation" ? (
                      <>
                        位置：
                        {(part.output as { city?: string } | undefined)?.city ?? "Unknown"}
                      </>
                    ) : (
                      <>天气：{part.output ?? "Unknown"}</>
                    )}
                  </div>
                )}
                {part.state === "output-error" && (
                  <div className="text-destructive">{part.errorText || "执行失败"}</div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
