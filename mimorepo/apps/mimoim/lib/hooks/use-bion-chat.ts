"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatStatus } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { useBionClient } from "@/lib/hooks/use-bion";
import type { BionFrontendEvent, BionUserMessage } from "@bion/protocol";

type TextPart = { type: "text"; text: string };

export interface UseBionChatOptions {
  id: string; // chatId == bion sessionId
  initialMessages?: ChatMessage[];
  generateId?: () => string;
}

export interface UseBionChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: { role: "user"; parts: TextPart[] }) => Promise<void>;
  status: ChatStatus;
  stop: () => void;
}

function asText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text ?? "")
    .join("");
}

function newTextMessage(params: {
  id: string;
  role: "user" | "assistant";
  text: string;
}): ChatMessage {
  return {
    id: params.id,
    role: params.role,
    parts: [{ type: "text", text: params.text }],
    metadata: { createdAt: new Date().toISOString() },
  };
}

export function useBionChat(options: UseBionChatOptions): UseBionChatReturn {
  const { client, enabled: bionEnabled } = useBionClient();
  const generateId = options.generateId ?? generateUUID;
  const generateIdRef = useRef(generateId);
  useEffect(() => {
    generateIdRef.current = generateId;
  }, [generateId]);

  const [messages, setMessages] = useState<ChatMessage[]>(
    options.initialMessages ?? []
  );
  const [status, setStatus] = useState<ChatStatus>("ready");

  // Track which targetEventIds are locally aborted (ignore further deltas).
  const abortedTargetIdsRef = useRef<Set<string>>(new Set());
  const lastSentTargetIdRef = useRef<string | null>(null);
  const lastProcessedEnvelopeIdRef = useRef<string | null>(null);

  const sessionId = options.id;

  const ensureAssistantMessage = useCallback(
    (targetEventId: string) => {
      const assistantId = `assistant:${targetEventId}`;
      setMessages((prev) => {
        if (prev.some((m) => m.id === assistantId)) return prev;
        return [...prev, newTextMessage({ id: assistantId, role: "assistant", text: "" })];
      });
      return assistantId;
    },
    [setMessages]
  );

  const appendAssistantText = useCallback(
    (assistantId: string, delta: string, opts?: { rollback?: boolean }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const current = asText(m.parts as any);
          const next = opts?.rollback ? delta : current + delta;
          return { ...m, parts: [{ type: "text", text: next }] };
        })
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (message: { role: "user"; parts: TextPart[] }) => {
      const text = asText(message.parts);
      const userMessageId = generateId();
      lastSentTargetIdRef.current = userMessageId;

      // Optimistically render user message + placeholder assistant message.
      setMessages((prev) => [
        ...prev,
        newTextMessage({ id: userMessageId, role: "user", text }),
        newTextMessage({ id: `assistant:${userMessageId}`, role: "assistant", text: "" }),
      ]);

      setStatus("submitted");

      if (!bionEnabled || !client) {
        // Keep UI usable: do not lock the input. Surface the issue as an assistant message.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `assistant:${userMessageId}`
              ? {
                  ...m,
                  parts: [
                    {
                      type: "text",
                      text:
                        "Bion is not enabled or not connected. Set `NEXT_PUBLIC_BION_ENABLED=true` and ensure `NEXT_PUBLIC_BION_URL` points to a running mimoserver (default: http://localhost:6007).",
                    },
                  ],
                }
              : m
          )
        );
        setStatus("ready");
        return;
      }

      const payload: BionUserMessage = {
        type: "user_message",
        id: userMessageId,
        timestamp: Date.now(),
        sessionId,
        content: text,
        messageType: "text",
        messageStatus: "sent",
      };

      try {
        client.send(payload as any);
        setStatus("streaming");
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `assistant:${userMessageId}`
              ? {
                  ...m,
                  parts: [
                    {
                      type: "text",
                      text: "Failed to send message via Bion. Please check the server connection and try again.",
                    },
                  ],
                }
              : m
          )
        );
        setStatus("ready");
      }
    },
    [bionEnabled, client, generateId, sessionId]
  );

  const stop = useCallback(() => {
    const targetId = lastSentTargetIdRef.current;
    if (targetId) abortedTargetIdsRef.current.add(targetId);
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!bionEnabled || !client) return;

    const unsub = client.onEnvelope((env) => {
      const envelopeId = env?.id ?? null;
      if (envelopeId && lastProcessedEnvelopeIdRef.current === envelopeId) return;
      lastProcessedEnvelopeIdRef.current = envelopeId;

      const ev = env?.event as BionFrontendEvent | undefined;
      if (!ev || typeof (ev as any).type !== "string") return;

      // Streamed assistant text
      if (ev.type === "chatDelta") {
        const targetEventId = (ev as any).targetEventId as unknown;
        const delta = (ev as any).delta?.content as unknown;
        const finished = (ev as any).finished as unknown;
        const rollback = (ev as any).rollback as unknown;

        if (typeof targetEventId !== "string" || targetEventId.length === 0) return;
        if (abortedTargetIdsRef.current.has(targetEventId)) return;
        if (typeof delta === "string" && delta.length > 0) {
          const assistantId = ensureAssistantMessage(targetEventId);
          appendAssistantText(assistantId, delta, { rollback: rollback === true });
        }
        if (finished === true) {
          setStatus("ready");
        }
        return;
      }

      // Hide tool logs in assistant_only mode
      if (ev.type === "toolUsed") {
        return;
      }

      // If the backend reports an error, surface it as assistant text (no tool log formatting).
      if ((ev as any).type === "structuredOutput") {
        const so = ev as any;
        const soStatus = so.status ? String(so.status) : "unknown";
        const soError = so.error ? String(so.error) : null;

        if (soStatus === "error" && soError) {
          setMessages((prev) => [
            ...prev,
            newTextMessage({
              id: generateIdRef.current(),
              role: "assistant",
              text: `Error: ${soError}`,
            }),
          ]);
        }

        if (soStatus === "success" || soStatus === "error") {
          setStatus("ready");
        }
        return;
      }
    });

    return () => {
      unsub();
    };
  }, [appendAssistantText, bionEnabled, client, ensureAssistantMessage]);

  return useMemo(
    () => ({ messages, sendMessage, status, stop }),
    [messages, sendMessage, status, stop]
  );
}

