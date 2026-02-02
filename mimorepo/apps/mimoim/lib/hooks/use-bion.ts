'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBionFrontendClient, type BionFrontendClient } from '@bion/client';
import type { BionFrontendMessageEnvelope } from '@bion/protocol';

const BION_URL = process.env.NEXT_PUBLIC_BION_URL || 'http://localhost:6007';
const BION_ENABLED = process.env.NEXT_PUBLIC_BION_ENABLED === 'true';

export function useBionClient(options?: { enabled?: boolean; url?: string }): {
  enabled: boolean;
  client: BionFrontendClient | null;
  isConnected: boolean;
  lastEnvelope: BionFrontendMessageEnvelope | null;
  error: string | null;
} {
  const enabled = options?.enabled ?? BION_ENABLED;
  const url = options?.url ?? BION_URL;

  const client = useMemo(() => {
    if (!enabled) return null;
    return createBionFrontendClient({ url, namespace: '/mimo', autoConnect: false, auth: { clientType: 'page' } });
  }, [enabled, url]);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEnvelope, setLastEnvelope] = useState<BionFrontendMessageEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track which client instance we've connected to avoid re-connecting
  const connectedClientRef = useRef<BionFrontendClient | null>(null);

  useEffect(() => {
    // Skip if client is null or if we've already connected this exact client instance
    if (!client) {
      connectedClientRef.current = null;
      return;
    }

    // If we've already connected this exact client instance, skip
    if (client === connectedClientRef.current) {
      return;
    }

    // Clean up previous connection if client changed
    if (connectedClientRef.current && connectedClientRef.current !== client) {
      try {
        connectedClientRef.current.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      setIsConnected(false);
    }

    let unsub: (() => void) | null = null;
    let mounted = true;

    const run = async () => {
      try {
        await client.connect();
        if (!mounted) {
          // If unmounted before connection completed, disconnect
          client.disconnect();
          return;
        }
        connectedClientRef.current = client;
        setIsConnected(true);
        unsub = client.onEnvelope((env) => setLastEnvelope(env));
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
      // Only disconnect if this is still the current client
      if (connectedClientRef.current === client) {
        try {
          client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        setIsConnected(false);
        connectedClientRef.current = null;
      }
    };
  }, [client]);

  return { enabled, client, isConnected, lastEnvelope, error };
}

