import { CacheKeyBuilder } from '@mimo/agent-cache';
import { FileSystemStore } from '@mimo/agent-cache/storage';
import { join } from 'node:path';

export type ToolTier = 'tier0' | 'tier1' | 'tier2' | 'tier3';
export type ToolIntent = 'navigate' | 'interact' | 'highlight' | 'extract' | 'debug' | 'unknown';

export type ToolPolicyKey = {
  kind: 'toolPolicy';
  intent: ToolIntent;
  domain: string; // host only
  model: string;
  extensionVersion: string;
  toolchainVersion: string;
};

export type ToolPolicyRecord = {
  tier: ToolTier;
  toolNames: string[];
  observedUsedTools: string[];
  lastSuccessAt: number;
  failCount: number;
  upgradeCount: number;
};

type ToolDisclosureConfig = {
  rootDir?: string;
  ttlMs?: number;
  toolchainVersion?: string;
};

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days
const DEFAULT_TOOLCHAIN_VERSION = 'v1';

const tier0Tools = ['browser_navigate', 'browser_get_content', 'browser_session_stop'] as const;
const tier1Tools = ['browser_click', 'browser_fill', 'browser_screenshot'] as const;
const tier2Tools = ['browser_xpath_scan', 'browser_xpath_mark', 'browser_get_html'] as const;
// Tier3 is reserved for “power” tools. Only include tools that the extension executor
// actually supports; otherwise they can silently no-op.
const tier3Tools = [] as const;

const tiersInOrder: ToolTier[] = ['tier0', 'tier1', 'tier2', 'tier3'];

function clampTier(tier: ToolTier): ToolTier {
  if (tiersInOrder.includes(tier)) return tier;
  return 'tier1';
}

export function toolsForTier(tier: ToolTier): string[] {
  const t = clampTier(tier);
  const idx = tiersInOrder.indexOf(t);
  const out: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const cur = tiersInOrder[i]!;
    if (cur === 'tier0') out.push(...tier0Tools);
    if (cur === 'tier1') out.push(...tier1Tools);
    if (cur === 'tier2') out.push(...tier2Tools);
    if (cur === 'tier3') out.push(...tier3Tools);
  }
  // De-dupe but keep stable order.
  return Array.from(new Set(out));
}

export function inferIntent(userText: string): ToolIntent {
  const t = String(userText || '').toLowerCase();

  // Highlight / mark / “interactive elements”
  if (
    t.includes('高亮') ||
    t.includes('highlight') ||
    t.includes('mark') ||
    t.includes('outline') ||
    t.includes('可交互') ||
    t.includes('interactive') ||
    t.includes('xpath') && (t.includes('标记') || t.includes('mark'))
  ) {
    return 'highlight';
  }

  // Navigate / open / visit
  if (t.includes('打开') || t.includes('open') || t.includes('visit') || t.includes('navigate')) return 'navigate';

  // Extract / scrape
  if (t.includes('抽取') || t.includes('extract') || t.includes('简历') || t.includes('resume')) return 'extract';

  // Debug-ish
  if (t.includes('调试') || t.includes('debug') || t.includes('html')) return 'debug';

  // Otherwise assume interaction
  if (t.includes('点击') || t.includes('click') || t.includes('输入') || t.includes('fill') || t.includes('type')) return 'interact';

  return 'unknown';
}

export function inferDomain(urlLike: string | null | undefined): string {
  const raw = String(urlLike || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.host;
  } catch {
    return '';
  }
}

export function defaultTierForIntent(intent: ToolIntent): ToolTier {
  if (intent === 'highlight') return 'tier2';
  // Extraction flows often need richer tooling, but keep it conservative until Tier3 is fully wired.
  if (intent === 'extract') return 'tier2';
  if (intent === 'debug') return 'tier2';
  if (intent === 'navigate') return 'tier0';
  if (intent === 'interact') return 'tier1';
  return 'tier1';
}

function tierRank(tier: ToolTier): number {
  return tiersInOrder.indexOf(clampTier(tier));
}

export function maxTier(a: ToolTier, b: ToolTier): ToolTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

function getCacheRootDir(config?: ToolDisclosureConfig): string {
  const env = process.env.MIMO_TOOL_POLICY_CACHE_DIR;
  if (config?.rootDir) return config.rootDir;
  if (env && env.trim()) return env.trim();
  return join(process.cwd(), '.mimo-cache');
}

function buildPolicyStoreKey(key: ToolPolicyKey): string {
  const kb = new CacheKeyBuilder();
  const hash = kb.buildConfigSignature(key);
  return `toolPolicy:${hash}`;
}

let sharedStore: FileSystemStore | null = null;
function getStore(config?: ToolDisclosureConfig): FileSystemStore {
  if (sharedStore) return sharedStore;
  const rootDir = getCacheRootDir(config);
  sharedStore = new FileSystemStore({
    rootDir,
    subdir: 'tool-policy',
    defaultTTL: config?.ttlMs ?? DEFAULT_TTL_MS,
  });
  return sharedStore;
}

export class ToolDisclosurePolicy {
  private readonly ttlMs: number;
  private readonly toolchainVersion: string;
  private readonly store: FileSystemStore;

  constructor(config?: ToolDisclosureConfig) {
    this.ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
    this.toolchainVersion = config?.toolchainVersion ?? DEFAULT_TOOLCHAIN_VERSION;
    this.store = getStore(config);
  }

  async getRecommendedTier(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion'>): Promise<{ tier: ToolTier; cached: boolean }> {
    const key: ToolPolicyKey = { kind: 'toolPolicy', toolchainVersion: this.toolchainVersion, ...input };
    const storeKey = buildPolicyStoreKey(key);

    const cached = await this.store.get<ToolPolicyRecord>(storeKey);
    if (cached?.tier) {
      // Prefer cached tier (already TTL-protected by store).
      return { tier: clampTier(cached.tier), cached: true };
    }

    return { tier: defaultTierForIntent(key.intent), cached: false };
  }

  async recordSuccess(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion'> & {
    tier: ToolTier;
    toolNames: string[];
    observedUsedTools: string[];
  }): Promise<void> {
    const key: ToolPolicyKey = {
      kind: 'toolPolicy',
      toolchainVersion: this.toolchainVersion,
      intent: input.intent,
      domain: input.domain,
      model: input.model,
      extensionVersion: input.extensionVersion,
    };
    const storeKey = buildPolicyStoreKey(key);
    const now = Date.now();

    const existing = await this.store.get<ToolPolicyRecord>(storeKey);
    const next: ToolPolicyRecord = {
      tier: clampTier(input.tier),
      toolNames: Array.from(new Set(input.toolNames)),
      observedUsedTools: Array.from(new Set(input.observedUsedTools)),
      lastSuccessAt: now,
      failCount: existing?.failCount ?? 0,
      upgradeCount: existing?.upgradeCount ?? 0,
    };

    await this.store.set(storeKey, next, this.ttlMs);
  }

  async recordUpgrade(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion'> & { fromTier: ToolTier; toTier: ToolTier }): Promise<void> {
    const key: ToolPolicyKey = {
      kind: 'toolPolicy',
      toolchainVersion: this.toolchainVersion,
      intent: input.intent,
      domain: input.domain,
      model: input.model,
      extensionVersion: input.extensionVersion,
    };
    const storeKey = buildPolicyStoreKey(key);

    const existing = await this.store.get<ToolPolicyRecord>(storeKey);
    const next: ToolPolicyRecord = {
      tier: clampTier(input.toTier),
      toolNames: existing?.toolNames ?? toolsForTier(input.toTier),
      observedUsedTools: existing?.observedUsedTools ?? [],
      lastSuccessAt: existing?.lastSuccessAt ?? 0,
      failCount: existing?.failCount ?? 0,
      upgradeCount: (existing?.upgradeCount ?? 0) + 1,
    };

    // Keep TTL fresh if upgrades happen repeatedly.
    await this.store.set(storeKey, next, this.ttlMs);
  }
}

