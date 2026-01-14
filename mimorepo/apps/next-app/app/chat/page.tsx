"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizontalIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:6006/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const text = await response.text();
      
      // Parse the UI Message Stream format
      const lines = text.split("\n").filter((line) => line.trim());
      let assistantContent = "";
      
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);
          if (chunk.type === "text-delta") {
            assistantContent += chunk.delta;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      if (assistantContent) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: assistantContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your message.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
                    onClick={() => setInput("What's the weather in San Francisco?")}
                  >
                    What&apos;s the weather in San Francisco?
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto max-w-64 whitespace-normal px-4 py-2 text-sm"
                    onClick={() => setInput("Explain React hooks")}
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
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
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
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="m-2 size-9 shrink-0 rounded-lg transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-30"
                disabled={isLoading || !input.trim()}
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
