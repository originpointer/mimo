"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { SendHorizontalIcon } from "lucide-react";
import { type FC } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="bg-background box-border flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col items-center overflow-y-auto scroll-smooth bg-inherit px-4 pt-8">
        <ThreadWelcome />
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
        <div className="min-h-8 flex-grow" />
      </ThreadPrimitive.Viewport>

      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-4">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex flex-grow basis-full flex-col items-center justify-center">
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
          <ThreadSuggestion prompt="What's the weather in San Francisco?" />
          <ThreadSuggestion prompt="Explain React hooks" />
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadSuggestion: FC<{ prompt: string }> = ({ prompt }) => {
  return (
    <ThreadPrimitive.Suggestion
      prompt={prompt}
      method="replace"
      autoSend
      asChild
    >
      <Button variant="outline" className="h-auto max-w-64 whitespace-normal px-4 py-2 text-sm">
        {prompt}
      </Button>
    </ThreadPrimitive.Suggestion>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="relative flex w-full items-end rounded-xl border bg-card shadow-sm">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Send a message..."
        rows={1}
        className="max-h-40 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <ComposerPrimitive.Send asChild>
        <Button size="icon" variant="ghost" className="m-2 size-9 shrink-0 rounded-lg">
          <SendHorizontalIcon className="size-4" />
        </Button>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="flex w-full max-w-2xl flex-col items-end gap-2 py-4">
      <div className="max-w-xl rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-2xl grid-cols-[auto_1fr] gap-4 py-4">
      <Avatar className="size-10 border">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
          🤖
        </AvatarFallback>
      </Avatar>
      <div className="prose prose-sm dark:prose-invert max-w-none leading-7 text-foreground">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};
