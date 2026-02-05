"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createFrontendBusClient, type FrontendBusClient } from "mimo-bus/client";
import type { FrontendEventEnvelope } from "mimo-protocol";

const MIMO_URL = process.env.NEXT_PUBLIC_MIMO_SERVER_URL || "http://localhost:6006";
const MIMO_ENABLED = process.env.NEXT_PUBLIC_MIMO_ENABLED === "true";

export function useMimoClient(options?: { enabled?: boolean; url?: string }) {
  const enabled = options?.enabled ?? MIMO_ENABLED;
  const url = options?.url ?? MIMO_URL;

  const client = useMemo(() => {
    if (!enabled) return null;
    return createFrontendBusClient({ url, autoConnect: false });
  }, [enabled, url]);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEnvelope, setLastEnvelope] = useState<FrontendEventEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedClientRef = useRef<FrontendBusClient | null>(null);

  useEffect(() => {
    if (!client) {
      connectedClientRef.current = null;
      return;
    }

    if (client === connectedClientRef.current) return;

    if (connectedClientRef.current && connectedClientRef.current !== client) {
      try {
        connectedClientRef.current.disconnect();
      } catch {
        // ignore
      }
      setIsConnected(false);
    }

    let unsub: (() => void) | null = null;
    let mounted = true;

    const run = async () => {
      try {
        await client.connect();
        if (!mounted) {
          client.disconnect();
          return;
        }
        connectedClientRef.current = client;
        setIsConnected(true);
        unsub = client.onEvent((env) => setLastEnvelope(env));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    };

    run();

    return () => {
      mounted = false;
      if (unsub) {
        unsub();
        unsub = null;
      }
      if (connectedClientRef.current === client) {
        try {
          client.disconnect();
        } catch {
          // ignore
        }
        setIsConnected(false);
        connectedClientRef.current = null;
      }
    };
  }, [client]);

  return { enabled, client, isConnected, lastEnvelope, error };
}
