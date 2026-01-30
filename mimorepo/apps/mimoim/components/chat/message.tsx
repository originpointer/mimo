"use client";

import { SparklesIcon } from "lucide-react";
import { cn, sanitizeText } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

interface MessageProps {
  message: ChatMessage;
  isLoading?: boolean;
}

export function Message({ message, isLoading }: MessageProps) {
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "w-full": message.role === "assistant",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user",
          })}
        >
          <div>
            <div
              className={cn({
                "wrap-break-word w-fit rounded-2xl px-3 py-2 text-right text-white":
                  message.role === "user",
                "bg-transparent px-0 py-0 text-left":
                  message.role === "assistant",
              })}
              data-testid="message-content"
              style={
                message.role === "user"
                  ? { backgroundColor: "#006cff" }
                  : undefined
              }
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {sanitizeText(textContent)}
                {isLoading && message.role === "assistant" && (
                  <span className="inline-block animate-pulse">▊</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
