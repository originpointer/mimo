"use client";

import { useEffect, useState } from "react";
import { useMimoClient } from "@/lib/hooks/use-mimo-client";
import type { SnapshotSyncEvent } from "mimo-protocol";

export function useSnapshot() {
  const { client, isConnected } = useMimoClient({ enabled: true });
  const [snapshot, setSnapshot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch("/api/snapshot");
        if (!res.ok) throw new Error(`snapshot: ${res.status}`);
        const data = await res.json();
        setSnapshot(data.data || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchInitial();
  }, []);

  useEffect(() => {
    if (!client || !isConnected) return;
    const unsub = client.onEvent((env) => {
      if (env.event.type !== "snapshotSync") return;
      const event = env.event as SnapshotSyncEvent;
      setSnapshot({
        ...event.state,
        lastUpdated: event.state.lastUpdated,
        connected: true,
        ageMs: 0,
        stale: false,
      });
    });
    return () => unsub();
  }, [client, isConnected]);

  return { snapshot, error };
}
