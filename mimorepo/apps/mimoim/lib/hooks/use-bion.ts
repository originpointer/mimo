'use client';

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!client) return;

    let unsub: (() => void) | null = null;
    let mounted = true;

    const run = async () => {
      try {
        await client.connect();
        if (!mounted) return;
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
      try {
        unsub?.();
      } finally {
        client.disconnect();
        setIsConnected(false);
      }
    };
  }, [client]);

  return { enabled, client, isConnected, lastEnvelope, error };
}

