"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { SendHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === "getLocation") {
        const cities = ["New York", "Los Angeles", "Chicago", "San Francisco"];
        const city = cities[Math.floor(Math.random() * cities.length)];
        addToolOutput({
          tool: "getLocation",
          toolCallId: toolCall.toolCallId,
          output: { city },
        });
      }
    },
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!error) return;
    const description =
      error instanceof Error ? error.message : "请求失败，请稍后重试。";
    toast.error("请求发生错误", { description });
  }, [error]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Avatar className="size-20 border-2 border-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl">
                    🤖
                  </AvatarFallback>
                </Avatar>
                <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                  Hello there!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  How can I help you today?
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    className="h-auto max-w-64 whitespace-normal px-4 py-2 text-sm"
                    onClick={() => {
                      if (status !== "ready") return;
                      sendMessage({ text: "What's the weather in San Francisco?" });
                    }}
                    disabled={isBusy}
                  >
                    What&apos;s the weather in San Francisco?
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto max-w-64 whitespace-normal px-4 py-2 text-sm"
                    onClick={() => {
                      if (status !== "ready") return;
                      sendMessage({ text: "Explain React hooks" });
                    }}
                    disabled={isBusy}
                  >
                    Explain React hooks
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start gap-4"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="size-10 border shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
                          🤖
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.parts.map((part, index) => {
                        if (part.type === "step-start") {
                          return index > 0 ? (
                            <div key={index} className="my-2">
                              <hr className="border-border" />
                            </div>
                          ) : null;
                        }

                        if (part.type === "text") {
                          return <span key={index}>{part.text}</span>;
                        }

                        if (part.type === "tool-askForConfirmation") {
                          const input = part.input as { message?: string } | undefined;
                          const output = part.output as
                            | { confirmed?: boolean }
                            | undefined;
                          const messageText = input?.message ?? "需要确认操作";
                          if (part.state === "output-available") {
                            const confirmed = Boolean(output?.confirmed);
                            return (
                              <div key={index} className="mt-3 text-sm">
                                <div className="text-muted-foreground">
                                  {messageText}
                                </div>
                                <div className="mt-2 font-medium">
                                  {confirmed ? "已确认" : "已拒绝"}
                                </div>
                              </div>
                            );
                          }

                          if (
                            part.state === "input-available" ||
                            part.state === "input-streaming"
                          ) {
                            return (
                              <div key={index} className="mt-3 text-sm">
                                <div className="text-muted-foreground">
                                  {messageText}
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      addToolOutput({
                                        tool: "askForConfirmation",
                                        toolCallId: part.toolCallId,
                                        output: { confirmed: true },
                                      })
                                    }
                                  >
                                    确认
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      addToolOutput({
                                        tool: "askForConfirmation",
                                        toolCallId: part.toolCallId,
                                        output: { confirmed: false },
                                      })
                                    }
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
                                <div className="text-muted-foreground">
                                  {messageText}
                                </div>
                                <div className="mt-2 text-destructive">
                                  {part.errorText || "执行失败"}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        }

                        if (
                          part.type === "tool-getLocation" ||
                          part.type === "tool-getWeatherInformation"
                        ) {
                          return (
                            <div key={index} className="mt-3 text-sm">
                              {(part.state === "input-streaming" ||
                                part.state === "input-available") && (
                                <div className="text-muted-foreground">
                                  {part.type === "tool-getLocation"
                                    ? "正在获取位置信息..."
                                    : "正在获取天气信息..."}
                                </div>
                              )}
                              {part.state === "output-available" && (
                                <div className="text-muted-foreground">
                                  {part.type === "tool-getLocation" ? (
                                    <>
                                      位置：
                                      {(part.output as { city?: string } | undefined)
                                        ?.city ?? "Unknown"}
                                    </>
                                  ) : (
                                    <>
                                      天气：{part.output ?? "Unknown"}
                                    </>
                                  )}
                                </div>
                              )}
                              {part.state === "output-error" && (
                                <div className="text-destructive">
                                  {part.errorText || "执行失败"}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                ))}
                {isBusy && (
                  <div className="flex justify-start gap-4">
                    <Avatar className="size-10 border shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
                        🤖
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-xl rounded-2xl px-4 py-3 bg-muted text-foreground">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="mx-auto w-full max-w-2xl px-4 pb-4">
            <form
              onSubmit={handleSubmit}
              className="relative flex w-full items-end rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                placeholder="Send a message..."
                className="max-h-40 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
                disabled={status !== "ready"}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="m-2 size-9 shrink-0 rounded-lg transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-30"
                disabled={status !== "ready" || !input.trim()}
              >
                <SendHorizontalIcon className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
