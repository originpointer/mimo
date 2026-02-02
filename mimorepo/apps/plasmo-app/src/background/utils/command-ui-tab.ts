/**
 * Command UI Tab policy
 *
 * We must NEVER run browser automation on "command UI" pages (e.g. chat/id pages)
 * that talk to the extension via externally_connectable messaging.
 *
 * Source of truth: chrome.runtime.getManifest().externally_connectable.matches
 *
 * Important: keep this module safe to import in non-extension runtimes (tests).
 * Do NOT access `chrome` at module top-level.
 */
 
type ManifestLike = {
  externally_connectable?: {
    matches?: unknown;
  };
};
 
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
 
function globToRegExp(glob: string): RegExp {
  // Minimal glob: only supports '*' wildcard.
  const re = '^' + glob.split('*').map(escapeRegex).join('.*') + '$';
  return new RegExp(re);
}
 
function parseMatchPattern(pattern: string): {
  scheme: string;
  host: string;
  port: string | null;
  path: string;
} | null {
  // We only need to support the shapes we actually use, e.g.
  // - http://localhost:3000/*
  // - http://127.0.0.1:3000/*
  // (and optionally future http(s) + wildcard path).
  const m = /^(\*|http|https):\/\/([^/]+)(\/.*)$/.exec(pattern.trim());
  if (!m) return null;
 
  const scheme = m[1]!;
  const hostPort = m[2]!;
  const path = m[3]!;
 
  const idx = hostPort.lastIndexOf(':');
  if (idx >= 0 && hostPort.indexOf(']') === -1) {
    const host = hostPort.slice(0, idx);
    const port = hostPort.slice(idx + 1);
    return { scheme, host, port, path };
  }
 
  return { scheme, host: hostPort, port: null, path };
}
 
function matchHost(hostname: string, hostPattern: string): boolean {
  const host = hostname.toLowerCase();
  const pat = hostPattern.toLowerCase();
 
  if (pat === '*') return true;
  if (pat.startsWith('*.')) {
    const suffix = pat.slice(2);
    return host === suffix || host.endsWith('.' + suffix);
  }
  return host === pat;
}
 
function matchScheme(protocol: string, schemePattern: string): boolean {
  const proto = protocol.toLowerCase().replace(/:$/, '');
  const pat = schemePattern.toLowerCase();
  if (pat === '*') return proto === 'http' || proto === 'https';
  return proto === pat;
}
 
function matchPort(port: string, portPattern: string | null): boolean {
  if (portPattern == null || portPattern === '') return true;
  if (portPattern === '*') return true;
  return port === portPattern;
}
 
export function getExternallyConnectableMatches(manifest?: ManifestLike): string[] {
  const m = manifest ?? ((globalThis as any)?.chrome?.runtime?.getManifest?.() as ManifestLike | undefined);
  const raw = m?.externally_connectable?.matches;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => typeof x === 'string' && x.trim().length > 0) as string[];
}
 
export function matchExternallyConnectablePattern(url: string, pattern: string): boolean {
  const parsed = parseMatchPattern(pattern);
  if (!parsed) return false;
 
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
 
  if (!matchScheme(u.protocol, parsed.scheme)) return false;
  if (!matchHost(u.hostname, parsed.host)) return false;
  if (!matchPort(u.port, parsed.port)) return false;
 
  // Manifest patterns match path; include query/hash in the match to be conservative.
  const fullPath = u.pathname + u.search + u.hash;
  return globToRegExp(parsed.path).test(fullPath);
}
 
export function isCommandUiTabUrl(url: string, matches?: string[]): boolean {
  const u = String(url || '');
  if (!u) return false;
  const patterns = matches ?? getExternallyConnectableMatches();
  return patterns.some((p) => matchExternallyConnectablePattern(u, p));
}
 
export function assertNotCommandUiTabUrl(url: string, message?: string): void {
  if (isCommandUiTabUrl(url)) {
    throw new Error(message || `Blocked: command UI tab cannot be used for automation (url=${url})`);
  }
}
 
