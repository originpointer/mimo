"use client";

import { type UIMessage } from "ai";
import { SendHorizontalIcon } from "lucide-react";
import { type FormEvent, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ChatInterfaceProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Messages Area */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto scroll-smooth px-4 pt-8">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="w-full max-w-2xl space-y-4">
            {messages.map((message) => {
              const textContent =
                message.parts
                  .filter((part: any) => part.type === "text")
                  .map((part: any) => part.text || "")
                  .join("") || "";

              return (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <UserMessage content={textContent} />
                  ) : (
                    <AssistantMessage content={textContent} />
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex w-full max-w-2xl gap-4 py-4">
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
      <div className="mx-auto w-full max-w-2xl px-4 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="relative flex w-full items-end rounded-xl border bg-card shadow-sm">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Send a message..."
              rows={1}
              autoFocus
              className="max-h-40 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="m-2 size-9 shrink-0 rounded-lg"
              disabled={isLoading || !input.trim()}
            >
              <SendHorizontalIcon className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex flex-grow basis-full flex-col items-center justify-center">
      <Avatar className="size-20 border-2 border-primary/10">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl">
          🤖
        </AvatarFallback>
      </Avatar>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Hello there!
      </h1>
      <p className="mt-2 text-muted-foreground">How can I help you today?</p>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex w-full flex-col items-end gap-2 py-4">
      <div className="max-w-xl rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex w-full gap-4 py-4">
      <Avatar className="size-10 border">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
          🤖
        </AvatarFallback>
      </Avatar>
      <div className="prose prose-sm dark:prose-invert max-w-none flex-1 leading-7 text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
