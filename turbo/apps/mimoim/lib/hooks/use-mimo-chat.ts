"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createId } from "@repo/mimo-utils";
import { useMimoClient } from "@/lib/hooks/use-mimo-client";
import type { ChatDeltaEvent, FrontendEventEnvelope, FrontendUserMessage, StructuredOutputEvent } from "mimo-protocol";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function useMimoChat(taskId: string) {
  const { client, enabled } = useMimoClient({ enabled: true });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "streaming">("ready");
  const lastSentId = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;
    const unsub = client.onEvent((env: FrontendEventEnvelope) => {
      if (env.event.type === "chatDelta") {
        const event = env.event as ChatDeltaEvent;
        const target = event.targetEventId;
        const assistantId = `assistant:${target}`;
        setMessages((prev) => {
          const next = [...prev];
          const index = next.findIndex((m) => m.id === assistantId);
          if (index === -1) {
            next.push({ id: assistantId, role: "assistant", text: event.delta.content });
          } else {
            const existing = next[index];
            if (!existing) return prev;
            next[index] = {
              ...existing,
              text: existing.text + event.delta.content,
            };
          }
          return next;
        });
        if (event.finished) setStatus("ready");
      }

      if (env.event.type === "structuredOutput") {
        const event = env.event as StructuredOutputEvent;
        if (event.status !== "error") return;
        setMessages((prev) => [
          ...prev,
          { id: createId("assistant"), role: "assistant", text: event.error || "Error" },
        ]);
        setStatus("ready");
      }
    });
    return () => unsub();
  }, [client]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!enabled || !client) {
        setMessages((prev) => [...prev, { id: createId("assistant"), role: "assistant", text: "Mimo not connected." }]);
        return;
      }

      const id = createId("user");
      lastSentId.current = id;
      setMessages((prev) => [...prev, { id, role: "user", text }]);
      setStatus("streaming");

      const payload: FrontendUserMessage = {
        type: "user_message",
        id,
        timestamp: Date.now(),
        taskId,
        content: text,
      };

      client.send(payload as any);
    },
    [client, enabled, taskId]
  );

  return { messages, status, sendMessage };
}
