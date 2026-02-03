"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpIcon, SquareIcon, PaperclipIcon, CircleFadingArrowUpIcon, MoreHorizontalIcon, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatStatus } from "@/lib/types";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  status: ChatStatus;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  status,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus textarea on mount (desktop only)
    if (window.innerWidth > 768) {
      textareaRef.current?.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    onSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && status === "ready") {
        onSend();
      }
    }
  };

  const isReady = status === "ready";
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
      <form onSubmit={handleSubmit} className="relative flex w-full flex-col gap-4">
        <div className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="w-full resize-none border-0! border-none! bg-transparent p-2 text-base text-foreground outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden field-sizing-content max-h-[6lh]"
            disabled={!isReady}
          />

          <div className="flex items-center justify-between p-1">
            <div className="flex items-center gap-0 sm:gap-0.5">
              <Button
                type="button"
                variant="ghost"
                className="aspect-square h-8 rounded-lg p-1"
                disabled={!isReady}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="aspect-square h-8 rounded-lg p-1"
                    disabled={!isReady}
                  >
                    <Bot size={14} style={{ width: 14, height: 14 }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>GitHub</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isStreaming ? (
              <Button
                type="button"
                onClick={onStop}
                className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90"
              >
                <SquareIcon size={14} />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              >
                <ArrowUpIcon size={14} />
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
          multiple
          onChange={(e) => {
            // File upload handling - placeholder for Phase 2
            console.log("Files selected:", e.target.files);
          }}
          type="file"
        />
      </form>
    </div>
  );
}
