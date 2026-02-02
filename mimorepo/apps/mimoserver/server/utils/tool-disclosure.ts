import { CacheKeyBuilder } from '@mimo/agent-cache';
import { FileSystemStore } from '@mimo/agent-cache/storage';
import { join } from 'node:path';

/**
 * 工具层级类型
 * tier0: 基础导航工具
 * tier1: 交互工具（点击、填充、截图）
 * tier2: 高级工具（XPath扫描、标记、获取HTML）
 * tier3: 预留给高级功能工具
 */
export type ToolTier = 'tier0' | 'tier1' | 'tier2' | 'tier3';

/**
 * 工具意图类型
 * navigate: 导航操作
 * interact: 交互操作（点击、输入等）
 * highlight: 高亮/标记元素
 * extract: 提取/抓取数据
 * debug: 调试操作
 * unknown: 未知意图
 */
export type ToolIntent = 'navigate' | 'interact' | 'highlight' | 'extract' | 'debug' | 'unknown';

/**
 * 工具策略键类型
 * 用于唯一标识一个工具策略配置
 */
export type ToolPolicyKey = {
  kind: 'toolPolicy';
  intent: ToolIntent;
  domain: string; // 仅包含主机名
  model: string;
  extensionVersion: string;
  toolchainVersion: string;
  tools: string[];
};

/**
 * 工具策略记录类型
 * 存储工具策略的执行历史和状态
 */
export type ToolPolicyRecord = {
  tier: ToolTier;
  toolNames: string[];
  observedUsedTools: string[];
  lastSuccessAt: number;
  failCount: number;
  upgradeCount: number;
};

/**
 * 工具披露配置类型
 */
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

/**
 * 验证并限制工具层级在有效范围内
 * @param tier - 需要验证的工具层级
 * @returns 有效的工具层级，如果输入无效则返回默认值 'tier1'
 */
function clampTier(tier: ToolTier): ToolTier {
  if (tiersInOrder.includes(tier)) return tier;
  return 'tier1';
}

/**
 * 获取指定层级及以下所有层级的工具列表
 * @param tier - 目标工具层级
 * @returns 该层级及以下所有层级的工具名称数组（去重后保持稳定顺序）
 */
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

/**
 * 从用户输入文本中推断操作意图
 * @param userText - 用户输入的文本
 * @returns 推断出的工具意图类型（navigate/interact/highlight/extract/debug/unknown）
 */
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

  // Extract / scrape
  if (t.includes('抽取') || t.includes('extract') || t.includes('简历') || t.includes('resume')) return 'extract';

  // Debug-ish
  if (t.includes('调试') || t.includes('debug') || t.includes('html')) return 'debug';

  // Interaction (click/fill/type). This must take priority over navigation because
  // many real user requests combine "open + click" and need tier1 tools.
  if (t.includes('点击') || t.includes('click') || t.includes('输入') || t.includes('fill') || t.includes('type')) return 'interact';

  // Navigate / open / visit (only when it's NOT a richer request above)
  if (t.includes('打开') || t.includes('open') || t.includes('visit') || t.includes('navigate')) return 'navigate';

  return 'unknown';
}

/**
 * 从URL字符串中提取域名
 * @param urlLike - URL字符串或空值
 * @returns 提取出的域名，如果解析失败则返回空字符串
 */
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

/**
 * 根据操作意图获取推荐的默认工具层级
 * @param intent - 工具意图类型
 * @returns 推荐的默认工具层级
 */
export function defaultTierForIntent(intent: ToolIntent): ToolTier {
  if (intent === 'highlight') return 'tier2';
  // Extraction flows often need richer tooling, but keep it conservative until Tier3 is fully wired.
  if (intent === 'extract') return 'tier2';
  if (intent === 'debug') return 'tier2';
  if (intent === 'navigate') return 'tier0';
  if (intent === 'interact') return 'tier1';
  return 'tier1';
}

/**
 * 获取工具层级在预定义顺序中的索引值
 * @param tier - 工具层级
 * @returns 层级索引（数字越大表示层级越高）
 */
function tierRank(tier: ToolTier): number {
  return tiersInOrder.indexOf(clampTier(tier));
}

/**
 * 比较两个工具层级，返回较高（功能更强）的层级
 * @param a - 第一个工具层级
 * @param b - 第二个工具层级
 * @returns 两个层级中较高的那个
 */
export function maxTier(a: ToolTier, b: ToolTier): ToolTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

/**
 * 获取缓存根目录路径
 * @param config - 可选的配置对象
 * @returns 缓存根目录的绝对路径
 */
function getCacheRootDir(config?: ToolDisclosureConfig): string {
  const env = process.env.MIMO_TOOL_POLICY_CACHE_DIR;
  if (config?.rootDir) return config.rootDir;
  if (env && env.trim()) return env.trim();
  return join(process.cwd(), '.mimo-cache');
}

/**
 * 根据策略键构建缓存存储键
 * @param key - 工具策略键对象
 * @returns 用于缓存存储的唯一键字符串
 */
function buildPolicyStoreKey(key: ToolPolicyKey): string {
  const kb = new CacheKeyBuilder();
  const hash = kb.buildConfigSignature(key);
  return `toolPolicy:${hash}`;
}

let sharedStore: FileSystemStore | null = null;

/**
 * 获取单例的文件系统存储实例
 * @param config - 可选的配置对象
 * @returns 文件系统存储实例
 */
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

/**
 * 工具披露策略类
 * 负责管理和缓存工具策略，包括推荐层级、记录成功和升级等操作
 */
export class ToolDisclosurePolicy {
  private readonly ttlMs: number;
  private readonly toolchainVersion: string;
  private readonly store: FileSystemStore;

  /**
   * 构造函数，初始化工具披露策略实例
   * @param config - 可选的配置对象，包含TTL、工具链版本等设置
   */
  constructor(config?: ToolDisclosureConfig) {
    this.ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
    this.toolchainVersion = config?.toolchainVersion ?? DEFAULT_TOOLCHAIN_VERSION;
    this.store = getStore(config);
  }

  /**
   * 根据输入参数获取推荐的工具层级，优先从缓存中读取
   * @param input - 包含意图、域名、模型、扩展版本等的输入对象
   * @returns 包含推荐层级和是否来自缓存的标识的对象
   */
  async getRecommendedTier(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion' | 'tools'>): Promise<{ tier: ToolTier; cached: boolean }> {
    const key: ToolPolicyKey = { kind: 'toolPolicy', toolchainVersion: this.toolchainVersion, tools: [], ...input };
    const storeKey = buildPolicyStoreKey(key);

    const cached = await this.store.get<ToolPolicyRecord>(storeKey);
    if (cached?.tier) {
      // Prefer cached tier (already TTL-protected by store).
      return { tier: clampTier(cached.tier), cached: true };
    }

    return { tier: defaultTierForIntent(key.intent), cached: false };
  }

  /**
   * 记录工具执行成功的策略数据到缓存
   * @param input - 包含层级、工具名称、实际使用的工具等信息
   */
  async recordSuccess(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion' | 'tools'> & {
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
      tools: input.toolNames,
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

  /**
   * 记录工具层级升级的策略数据
   * @param input - 包含原始层级和目标层级的输入对象
   */
  async recordUpgrade(input: Omit<ToolPolicyKey, 'kind' | 'toolchainVersion' | 'tools'> & { fromTier: ToolTier; toTier: ToolTier }): Promise<void> {
    const key: ToolPolicyKey = {
      kind: 'toolPolicy',
      toolchainVersion: this.toolchainVersion,
      intent: input.intent,
      domain: input.domain,
      model: input.model,
      extensionVersion: input.extensionVersion,
      tools: [],
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

