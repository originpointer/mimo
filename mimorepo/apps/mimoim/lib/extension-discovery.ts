export type BionClientInfo =
  | {
      ok: true;
      extensionId: string;
      extensionName: string;
      version: string;
      clientId: string | null;
      socketConnected: boolean;
    }
  | { ok: false; error: string };

export type ExtensionRegistration = {
  extensionId: string;
  extensionName: string;
  clientId?: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
  updatedAt: number;
};

const BRIDGE_REQUEST = 'mimoim/get_bion_client_info';
const BRIDGE_RESPONSE = 'mimoim/get_bion_client_info_result';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function getApiBaseCandidates(): string[] {
  const out: string[] = [];

  const rawMimoserverUrl = (process.env.NEXT_PUBLIC_MIMOSERVER_URL || '').trim();
  if (rawMimoserverUrl) out.push(rawMimoserverUrl.replace(/\/+$/, ''));

  // Try derive API port from Bion socket URL (usually :nitroPort+1).
  const rawBionUrl = (process.env.NEXT_PUBLIC_BION_URL || '').trim();
  if (rawBionUrl) {
    try {
      const u = new URL(rawBionUrl);
      const port = Number(u.port || '');
      if (Number.isFinite(port) && port > 1) {
        const api = new URL(u.toString());
        api.port = String(port - 1);
        out.push(api.origin);
      }
    } catch {
      // ignore
    }
  }

  // Dev default.
  out.push('http://localhost:6006');

  // Same-origin fallback (if proxied).
  out.push('');

  // Deduplicate while preserving order.
  return out.filter((v, i) => out.indexOf(v) === i);
}

export function getApiBaseCandidatesForDebug(): string[] {
  return getApiBaseCandidates();
}

export async function fetchRegisteredExtensionIds(): Promise<string[]> {
  type ApiResp = {
    ok: boolean;
    extensions?: Array<{ extensionId: string }>;
  };

  const bases = getApiBaseCandidates();
  for (const base of bases) {
    const url = `${base}/api/extension/extension-list`.replace(/\/{2,}/g, '/').replace(':/', '://');
    try {
      const json = await fetchJson<ApiResp>(url);
      const ids = Array.isArray(json.extensions)
        ? json.extensions
            .map((e) => String((e as any).extensionId || '').trim())
            .filter(Boolean)
        : [];
      if (ids.length > 0) return ids;
    } catch {
      // try next base
    }
  }
  return [];
}

export async function fetchExtensionList(): Promise<
  | { ok: true; base: string; extensions: ExtensionRegistration[]; latest: ExtensionRegistration | null }
  | { ok: false; error: string; triedBases: string[] }
> {
  type ApiResp = {
    ok: boolean;
    extensions?: ExtensionRegistration[];
    latest?: ExtensionRegistration | null;
    error?: string;
  };

  const bases = getApiBaseCandidates();
  let lastErr: string | null = null;

  for (const base of bases) {
    const url = `${base}/api/extension/extension-list`.replace(/\/{2,}/g, '/').replace(':/', '://');
    try {
      const json = await fetchJson<ApiResp>(url);
      if (!json || typeof json !== 'object') throw new Error('invalid response');
      if (json.ok !== true) throw new Error(json.error || 'api returned ok=false');
      const extensions = Array.isArray(json.extensions) ? json.extensions : [];
      const latest = json.latest ?? null;
      return { ok: true, base, extensions, latest };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  return { ok: false, error: lastErr || 'failed to load extension list', triedBases: bases };
}

export async function probeBionClientInfoViaBridge(params?: { timeoutMs?: number }): Promise<BionClientInfo> {
  const timeoutMs = Math.max(100, params?.timeoutMs ?? 1500);

  if (typeof window === 'undefined') return { ok: false, error: 'not in browser' };

  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const p = new Promise<BionClientInfo>((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as any;
      if (!data || data.type !== BRIDGE_RESPONSE) return;
      if (data.requestId !== requestId) return;

      window.removeEventListener('message', onMessage);
      const payload = data.payload as any;
      if (payload && typeof payload === 'object' && typeof payload.ok === 'boolean') {
        resolve(payload as BionClientInfo);
      } else {
        resolve({ ok: false, error: 'invalid bridge response' });
      }
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: BRIDGE_REQUEST, requestId }, '*');
  });

  try {
    return await withTimeout(p, timeoutMs);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function waitForConnectedBionClient(params?: {
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<{ clientId: string; extensionId?: string } | null> {
  const maxWaitMs = Math.max(0, params?.maxWaitMs ?? 15_000);
  const pollIntervalMs = Math.max(250, params?.pollIntervalMs ?? 750);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const info = await probeBionClientInfoViaBridge({ timeoutMs: Math.min(1500, pollIntervalMs) });
    if (info.ok && info.clientId && info.socketConnected) {
      return { clientId: info.clientId, extensionId: info.extensionId };
    }
    await sleep(pollIntervalMs);
  }

  return null;
}

