import { defineNitroPlugin } from 'nitropack/runtime';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

import {
  BionSocketEvent,
  decodePluginMessage,
  encodeFrontendEnvelope,
  encodePluginMessage,
  type BionBrowserCandidate,
  type BionBrowserActionMessage,
  type BionBrowserActionResult,
  type BionFrontendEvent,
  type BionFrontendMessageEnvelope,
  type BionFrontendToServerMessage,
  type BionPluginMessage,
  type BionTabEventMessage,
} from '@bion/protocol';
import { registerBrowserTools, runBrowserTask } from '@bion/browser-tools';
import { createBionBrowserTransport } from '@bion/browser-bion-adapter';
import { createBrowserTwin } from '@twin/chrome';
import { LLMProvider } from '@mimo/llm';
import { ToolRegistry } from '@mimo/agent-tools/registry';
import { ToolScheduler } from '@mimo/agent-tools/scheduler';
import { z } from 'zod';
import { logger } from '@/server/utils/logger';
import { persistLlmRun } from '@/server/utils/persist-llm-run';
import { persistMessage } from '@/server/utils/persist-message';
import {
  ToolDisclosurePolicy,
  inferDomain,
  inferIntent,
  maxTier,
  toolsForTier,
  type ToolIntent,
  type ToolTier,
} from '@/server/utils/tool-disclosure';

/**
 * 客户端类型枚举
 * - page: 前端页面客户端
 * - extension: 浏览器扩展客户端
 * - unknown: 未知类型客户端
 */
type ClientType = 'page' | 'extension' | 'unknown';

/**
 * 工具升级请求错误类
 * 当 LLM 请求使用更高层级的工具时抛出此错误
 */
class ToolUpgradeRequestedError extends Error {
  /** 请求的工具层级 */
  readonly requestedTier: ToolTier;
  /** 升级原因（可选） */
  readonly reason?: string;

  /**
   * 创建工具升级请求错误实例
   * @param requestedTier - 请求的工具层级
   * @param reason - 升级原因的描述文本（可选）
   */
  constructor(requestedTier: ToolTier, reason?: string) {
    super(`Tool upgrade requested: ${requestedTier}${reason ? ` (${reason})` : ''}`);
    this.requestedTier = requestedTier;
    this.reason = reason;
  }
}

/**
 * 解析端口号字符串
 * @param raw - 原始端口号字符串（可能为 undefined）
 * @returns 解析后的端口号（有效范围 1-65535），解析失败返回 null
 */
function parsePort(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0 || n >= 65536) return null;
  return n;
}

/**
 * 在可用端口上启动 HTTP 服务器监听
 * @param params - 配置参数对象
 * @param params.httpServer - HTTP 服务器实例（由 createServer 创建）
 * @param params.preferredPort - 首选端口号
 * @param params.strict - 是否严格模式：true 时仅尝试首选端口，false 时尝试连续端口；当端口由环境变量显式配置时应使用 true
 * @param params.maxTries - 最大尝试次数（默认 20），仅在非严格模式下生效
 * @returns 成功绑定的端口号 Promise
 */
async function listenOnAvailablePort(params: {
  httpServer: ReturnType<typeof createServer>;
  preferredPort: number;
  /**
   * If true, do not try fallback ports; fail fast when preferredPort is in use.
   * Use this when the port is explicitly configured by env.
   */
  strict: boolean;
  maxTries?: number;
}): Promise<number> {
  const maxTries = Math.max(1, params.maxTries ?? 20);

  for (let i = 0; i < maxTries; i++) {
    const port = params.preferredPort + i;
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: any) => {
          reject(err);
        };
        params.httpServer.once('error', onError);
        params.httpServer.listen(port, () => {
          params.httpServer.removeListener('error', onError);
          resolve();
        });
      });
      return port;
    } catch (e) {
      const err = e as any;
      const code = err?.code;
      const isAddrInUse = code === 'EADDRINUSE';

      if (params.strict || !isAddrInUse) {
        throw e;
      }

      // retry next port
    }
  }

  throw new Error(
    `Unable to find an available Bion Socket.IO port starting at ${params.preferredPort} (tried ${maxTries} ports)`
  );
}

/**
 * 获取 Socket 连接的客户端类型
 * @param socket - Socket.IO Socket 实例
 * @returns 客户端类型：'page'、'extension' 或 'unknown'
 */
function getClientType(socket: Socket): ClientType {
  const t = (socket.handshake as any)?.auth?.clientType;
  if (t === 'page' || t === 'extension') return t;
  return 'unknown';
}

/**
 * 生成会话房间名称
 * @param sessionId - 会话 ID
 * @returns Socket.IO 房间名称，格式为 `bion:session:{sessionId}`
 */
function sessionRoom(sessionId: string) {
  return `bion:session:${sessionId}`;
}

/**
 * 生成随机 ID 字符串
 * @returns 20 字符长度的随机字符串（由两个 10 字符的 base36 随机数拼接而成）
 */
function randomId(): string {
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
}

/**
 * 从前端消息中提取用户文本内容
 * @param msg - 前端到服务器的消息对象（部分类型）
 * @returns 提取的用户文本内容，如果未找到返回空字符串
 */
function extractUserText(msg: Partial<BionFrontendToServerMessage>): string {
  const anyMsg = msg as any;
  if (typeof anyMsg?.content === 'string' && anyMsg.content.length > 0) return anyMsg.content;

  const contents = anyMsg?.contents;
  if (Array.isArray(contents)) {
    return contents
      .filter((c: any) => c && c.type === 'text' && typeof c.value === 'string')
      .map((c: any) => c.value)
      .join('');
  }

  return '';
}

/**
 * 安全地解析 JSON 字符串
 * @param text - 待解析的 JSON 字符串
 * @returns 解析后的对象，解析失败返回 null
 */
function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 从文本中提取首个 URL
 * @param text - 待搜索的文本
 * @returns 提取的完整 URL（含 https:// 协议头），未找到返回 null
 */
function extractFirstUrlLike(text: string): string | null {
  const s = String(text || '');
  const http = s.match(/https?:\/\/[^\s]+/i)?.[0];
  if (http) return http;
  const www = s.match(/\bwww\.[^\s]+\.[^\s]+\b/i)?.[0];
  if (www) return `https://${www}`;
  const bareDomain = s.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/i)?.[0];
  if (bareDomain && bareDomain.includes('.')) return `https://${bareDomain}`;
  return null;
}

/**
 * 根据文本推断已知网站的 URL
 * 仅识别高置信度的全球知名网站
 * @param text - 用户输入的文本
 * @returns 推断出的完整 URL，未匹配到返回 null
 */
function inferKnownUrlFromText(text: string): string | null {
  const t = String(text || '').toLowerCase();
  // Keep this list tiny and conservative: only the high-confidence global sites.
  if (/\bgoogle\b/.test(t)) return 'https://www.google.com';
  if (/\byoutube\b/.test(t)) return 'https://www.youtube.com';
  if (/\bgmail\b/.test(t)) return 'https://mail.google.com';
  if (/\bgithub\b/.test(t)) return 'https://github.com';
  if (/\bbing\b/.test(t)) return 'https://www.bing.com';
  return null;
}

/**
 * 将 Bion 协议的标签页事件转换为数字孪生事件格式
 * @param bionEvent - Bion 协议的标签页事件
 * @returns 数字孪生事件对象，转换失败返回 null
 */
function convertBionTabEventToTwinEvent(bionEvent: BionTabEventMessage): import('@twin/chrome').TabEvent | null {
  const { eventType, tab, window, tabId, windowId, timestamp } = bionEvent;

  switch (eventType) {
    case 'tab_created':
      if (!tab) return null;
      return {
        type: 'tab_created',
        tab: {
          id: tab.tabId,
          windowId: tab.windowId,
          url: tab.url ?? null,
          title: tab.title ?? null,
          favIconUrl: tab.favIconUrl ?? null,
          status: tab.status ?? null,
          active: tab.active,
          pinned: tab.pinned,
          hidden: tab.hidden,
          index: tab.index,
          openerTabId: tab.openerTabId ?? null,
          lastUpdated: timestamp,
        },
      };

    case 'tab_updated':
      if (!tab) return null;
      return {
        type: 'tab_updated',
        tab: {
          id: tab.tabId,
          windowId: tab.windowId,
          url: tab.url ?? null,
          title: tab.title ?? null,
          favIconUrl: tab.favIconUrl ?? null,
          status: tab.status ?? null,
          active: tab.active,
          pinned: tab.pinned,
          hidden: tab.hidden,
          index: tab.index,
          openerTabId: tab.openerTabId ?? null,
          lastUpdated: timestamp,
        },
        changes: {
          url: tab.url !== undefined,
          status: tab.status !== undefined,
          title: tab.title !== undefined,
          favIconUrl: tab.favIconUrl !== undefined,
        },
      };

    case 'tab_activated':
      return {
        type: 'tab_activated',
        tabId: tabId ?? tab?.tabId ?? 0,
        windowId: windowId ?? window?.windowId ?? 0,
        tab: tab ? {
          id: tab.tabId,
          windowId: tab.windowId,
          url: tab.url ?? null,
          title: tab.title ?? null,
          favIconUrl: tab.favIconUrl ?? null,
          status: tab.status ?? null,
          active: tab.active,
          pinned: tab.pinned,
          hidden: tab.hidden,
          index: tab.index,
          openerTabId: tab.openerTabId ?? null,
          lastUpdated: timestamp,
        } : undefined,
      };

    case 'tab_removed':
      return {
        type: 'tab_removed',
        tabId: tabId ?? 0,
        windowId: windowId ?? 0,
      };

    case 'window_created':
      if (!window) return null;
      return {
        type: 'window_created',
        window: {
          id: window.windowId,
          focused: window.focused,
          top: window.top ?? null,
          left: window.left ?? null,
          width: window.width ?? null,
          height: window.height ?? null,
          type: window.type,
          tabIds: [],
          lastUpdated: timestamp,
        },
      };

    case 'window_removed':
      return {
        type: 'window_removed',
        windowId: windowId ?? 0,
      };

    default:
      return null;
  }
}

/**
 * 判断用户文本是否表达浏览器操作意图
 * @param userText - 用户输入的文本
 * @returns 是否为浏览器操作意图
 */
function isBrowserIntent(userText: string): boolean {
  const t = String(userText || '').toLowerCase();
  if (!t.trim()) return false;

  // Direct URL is always a browser intent.
  if (/https?:\/\//i.test(t) || /\bwww\./i.test(t)) return true;

  // Common intents (CN/EN)
  const intentHit =
    /(\bopen\b|\bvisit\b|\bnavigate\b|\bgo\s+to\b)/i.test(t) ||
    /浏览器|打开|访问|前往|跳转|去\s*到|用浏览器/.test(userText);

  if (!intentHit) return false;

  // If the text contains something that looks like a domain or a known website keyword.
  const hasDomainLike = /\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/i.test(t);
  const hasKnownSite = /\bgoogle\b|\byoutube\b|\bgmail\b|\bgithub\b|\bbing\b/i.test(t);
  return hasDomainLike || hasKnownSite;
}

/**
 * 待确认的浏览器任务
 */
type PendingBrowserTask = {
  /** 请求 ID */
  requestId: string;
  /** 会话 ID */
  sessionId: string;
  /** 目标事件 ID */
  targetEventId: string;
  /**
   * Raw structured JSON parsed from the final LLM output.
   */
  payload: any;
  /** 任务摘要描述 */
  summary: string;
  /** 任务标题（可选） */
  title?: string;
  /** 创建时间戳 */
  createdAt: number;
};

/**
 * 类型守卫：检查值是否为普通对象（Record）
 * @param v - 待检查的值
 * @returns 是否为 Record<string, unknown> 类型
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * 从解析的 JSON 中提取浏览器任务摘要
 * @param parsed - 解析后的 JSON 对象
 * @returns 任务摘要字符串，如果结构不匹配返回 null
 */
function summarizeBrowserTask(parsed: unknown): string | null {
  if (!isRecord(parsed)) return null;
  const type = parsed.type;
  if (type !== 'mimo_browser_task' && type !== 'browser_task') return null;

  const summary =
    (typeof parsed.summary === 'string' && parsed.summary.trim()) ||
    (typeof parsed.brief === 'string' && parsed.brief.trim()) ||
    '请求开启浏览器任务';
  return summary;
}

/**
 * 从解析的 JSON 中提取浏览器操作
 * @param parsed - 解析后的 JSON 对象
 * @returns 浏览器操作对象（键为操作名，值为参数），提取失败返回 null
 */
function extractBrowserAction(parsed: unknown): Record<string, Record<string, unknown>> | null {
  if (!isRecord(parsed)) return null;
  const action = (parsed as any).action ?? (parsed as any).browserAction ?? (parsed as any).browser_action;
  if (!isRecord(action)) return null;

  // Ensure action is Record<string, Record<string, unknown>>
  const out: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(action)) {
    if (!k) continue;
    if (isRecord(v)) out[k] = v as Record<string, unknown>;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * 从浏览器操作中提取首个导航 URL
 * @param action - 浏览器操作对象
 * @returns 提取的 HTTP/HTTPS URL，未找到返回 null
 */
function extractFirstNavigateUrl(action: Record<string, Record<string, unknown>> | null): string | null {
  if (!action) return null;
  const nav = (action as any).browser_navigate;
  const url = typeof nav?.url === 'string' ? String(nav.url) : '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return null;
}

/**
 * 清理和截断标题文本
 * @param input - 原始标题输入
 * @returns 清理后的标题，最多 18 个字符
 */
function sanitizeTitle(input: string): string {
  const s = String(input || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '浏览器任务';
  // Keep it short for tabGroup title
  return s.length > 18 ? s.slice(0, 18) : s;
}

/**
 * 使用 LLM 生成浏览器任务标题
 * @param params - 生成标题的参数
 * @param params.llm - LLM 客户端实例
 * @param params.model - 模型名称
 * @param params.userText - 用户原始输入文本
 * @param params.summary - 任务摘要
 * @param params.url - 目标 URL（可选）
 * @returns 生成的任务标题 Promise
 */
async function generateBrowserTaskTitle(params: {
  llm: any;
  model: string;
  userText: string;
  summary: string;
  url?: string | null;
}): Promise<string> {
  try {
    const prompt = [
      `用户需求: ${params.userText || ''}`.trim(),
      `任务摘要: ${params.summary || ''}`.trim(),
      params.url ? `目标URL: ${params.url}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const resp = await params.llm.complete({
      model: params.model,
      temperature: 0.2,
      maxTokens: 64,
      messages: [
        {
          role: 'system',
          content:
            '你是一个任务命名助手。请为浏览器自动化任务生成一个简短标题：中文为主，<= 12 个字，避免标点和引号，只输出标题文本。',
        },
        { role: 'user', content: prompt },
      ] as any,
    } as any);

    return sanitizeTitle(resp?.content ?? '');
  } catch {
    return sanitizeTitle(params.summary || '浏览器任务');
  }
}

/**
 * Bion 服务器端运行时类型
 * 存储在 `globalThis` 上，供其他服务器路由访问
 * 其他服务器路由可以通过读取 `globalThis.__bion` 来发送 UI 事件或调用插件
 */
export type BionRuntime = {
  /** Socket.IO 服务器实例 */
  io: SocketIOServer;
  /** Socket.IO 命名空间实例 */
  namespace: ReturnType<SocketIOServer['of']>;
  /**
   * 向指定会话发送 UI 事件
   * @param sessionId - 会话 ID
   * @param event - 前端事件对象
   * @param envelopeId - 消息包 ID（可选）
   */
  emitUiEvent(sessionId: string, event: BionFrontendEvent, envelopeId?: string): void;
  /**
   * 调用浏览器插件的浏览器操作
   * @param clientId - 客户端 ID
   * @param msg - 浏览器操作消息
   * @param timeoutMs - 超时时间（毫秒，默认 30000）
   * @returns 浏览器操作执行结果 Promise
   */
  callPluginBrowserAction(clientId: string, msg: BionBrowserActionMessage, timeoutMs?: number): Promise<BionBrowserActionResult>;
  /**
   * 获取所有已连接的插件列表
   * @returns 插件信息数组，包含 clientId 和 socketId
   */
  getPlugins(): { clientId: string; socketId: string }[];
  /**
   * 获取浏览器数字孪生状态存储
   * @returns BrowserTwinStore 实例
   */
  getBrowserTwin(): ReturnType<typeof createBrowserTwin>;
};

declare global {
  // eslint-disable-next-line no-var
  var __bion: BionRuntime | undefined;
}

/**
 * Bion Socket.IO 插件入口
 * 创建并初始化 Socket.IO 服务器，处理浏览器扩展与前端页面之间的实时通信
 * @param nitroApp - Nitro 应用实例
 */
export default defineNitroPlugin((nitroApp) => {
  // 防止重复初始化
  if (globalThis.__bion) {
    return;
  }

  const llmProvider = new LLMProvider();
  const defaultModel =
    process.env.MIMO_MODEL ||
    process.env.MIMO_LLM_MODEL ||
    process.env.LLM_MODEL ||
    'anthropic/claude-haiku-4.5';

  const persistBrowserSession =
    process.env.MIMO_PERSIST_BROWSER_SESSION !== undefined
      ? process.env.MIMO_PERSIST_BROWSER_SESSION === 'true'
      : process.env.NODE_ENV === 'development';
  const browserSessionTtlMs = Math.max(
    30_000,
    Number.parseInt(String(process.env.MIMO_BROWSER_SESSION_TTL_MS || '600000'), 10) || 600_000
  );

  // sessionId -> chat history (best-effort, in-memory)
  const historyBySessionId = new Map<
    string,
    Array<{ role: 'system' | 'user' | 'assistant'; content: string; timestamp: number }>
  >();

  /**
   * 活跃的浏览器会话信息
   */
  type ActiveBrowserSession = {
    /** 请求 ID */
    requestId: string;
    /** 客户端 ID */
    clientId: string;
    /** 会话标题 */
    title: string;
    /** 会话开始时间戳 */
    startedAt: number;
    /** 最后使用时间戳 */
    lastUsedAt: number;
  };
  // sessionId -> active browser session (when persistence enabled)
  const activeBrowserSessionBySessionId = new Map<string, ActiveBrowserSession>();

  // Socket.IO port:
  // - Prefer explicit env override: BION_SOCKET_PORT
  // - Otherwise, try to follow Nitro's port (+1) in dev, falling back to 6007
  const explicitSocketPort = parsePort(process.env.BION_SOCKET_PORT);
  const nitroPort =
    parsePort(process.env.NITRO_PORT) ??
    parsePort(process.env.PORT) ??
    parsePort((nitroApp as any)?.options?.devServer?.port) ??
    parsePort((nitroApp as any)?.options?.port);
  const preferredPort = explicitSocketPort ?? (nitroPort ? nitroPort + 1 : 6007);
  const namespaceName = '/mimo';

  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io/',
  });

  const nsp = io.of(namespaceName);

  // Log ALL connections to the main server (any namespace)
  io.on('connection', (socket) => {
    console.log('[Bion] Root namespace connection:', {
      socketId: socket.id,
      namespace: socket.nsp.name,
      auth: JSON.stringify((socket.handshake as any)?.auth),
      url: socket.handshake.headers?.referer,
    });
  });

  // plugin clientId -> socket
  const pluginByClientId = new Map<string, Socket>();
  const pluginMetaByClientId = new Map<
    string,
    { clientId: string; clientName: string; ua: string; version: string; allowOtherClientId: boolean }
  >();

  // Browser Twin Store - 数字孪生状态存储
  // 实时同步浏览器标签页和窗口状态
  const browserTwin = createBrowserTwin();

  const toolDisclosure = new ToolDisclosurePolicy();

  // sessionId -> selected browser extension clientId
  const selectedClientIdBySessionId = new Map<string, string>();

  // sessionIds that are currently waiting for browser selection UI.
  const waitingBrowserSelectionSessionIds = new Set<string>();

  // sessionId -> pending browser task (waiting for user confirmation)
  const pendingBrowserTaskBySessionId = new Map<string, PendingBrowserTask>();

  /**
   * 获取所有可用的浏览器扩展候选列表
   * @returns 浏览器扩展候选数组
   */
  const getBrowserCandidates = (): BionBrowserCandidate[] => {
    const candidates: BionBrowserCandidate[] = [];
    for (const [clientId] of pluginByClientId.entries()) {
      const meta = pluginMetaByClientId.get(clientId);
      candidates.push({
        clientId,
        clientName: meta?.clientName ?? 'MimoBrowser',
        ua: meta?.ua ?? '',
        allowOtherClientId: meta?.allowOtherClientId ?? true,
      });
    }
    return candidates;
  };

  /**
   * 刷新正在等待浏览器选择的会话状态
   * - 如果只有一个候选浏览器，自动选择并触发确认流程
   * - 如果有多个候选浏览器，发送选择 UI 事件
   */
  const refreshWaitingBrowserSelections = () => {
    const candidates = getBrowserCandidates();
    const sessions = Array.from(waitingBrowserSelectionSessionIds);
    for (const sessionId of sessions) {
      if (candidates.length === 1) {
        const only = candidates[0]!;
        selectedClientIdBySessionId.set(sessionId, only.clientId);
        waitingBrowserSelectionSessionIds.delete(sessionId);
        emitUiEvent(sessionId, {
          type: 'myBrowserSelection',
          id: randomId(),
          timestamp: Date.now(),
          status: 'selected',
          connectedBrowser: only,
        } satisfies BionFrontendEvent);

        const pending = pendingBrowserTaskBySessionId.get(sessionId);
        if (pending) {
          emitUiEvent(sessionId, {
            type: 'browserTaskConfirmationRequested',
            id: randomId(),
            timestamp: Date.now(),
            requestId: pending.requestId,
            clientId: only.clientId,
            summary: pending.summary,
            browserActionPreview: extractBrowserAction(pending.payload) ?? pending.payload,
            targetEventId: pending.targetEventId,
          } satisfies BionFrontendEvent);
        }
      } else {
        emitUiEvent(sessionId, {
          type: 'myBrowserSelection',
          id: randomId(),
          timestamp: Date.now(),
          status: 'waiting_for_selection',
          browserCandidates: candidates,
        } satisfies BionFrontendEvent);
      }
    }
  };

  nsp.on('connection', (socket) => {
    const clientType = getClientType(socket);
    const handshakeAuth = (socket.handshake as any)?.auth;

    // Log ALL connection attempts with full details
    console.log('[Bion] NEW CONNECTION:', {
      socketId: socket.id,
      clientType,
      namespace: socket.nsp.name,
      handshakeAuth: JSON.stringify(handshakeAuth),
      url: socket.handshake.headers?.referer,
      userAgent: socket.handshake.headers?.['user-agent'],
    });

    if (clientType === 'unknown' && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[Bion] unknown clientType handshake', {
        socketId: socket.id,
        auth: handshakeAuth,
      });
    }

    if (clientType === 'page') {
      socket.on(BionSocketEvent.Message, async (payload: unknown) => {
        const msg = payload as Partial<BionFrontendToServerMessage>;
        const sessionId = (msg as any)?.sessionId;
        const msgType = String((msg as any)?.type || '');

        // Debug logging
        console.log('[Bion] Page message received:', { sessionId, msgType, hasMsg: !!msg });

        if (typeof sessionId === 'string' && sessionId.length > 0) {
          socket.join(sessionRoom(sessionId));
        }

        if (typeof sessionId !== 'string' || sessionId.length === 0) {
          console.warn('[Bion] Invalid or missing sessionId, ignoring message');
          return;
        }

        // User selects a connected browser extension clientId.
        if (msgType === BionSocketEvent.SelectMyBrowser || msgType === 'select_my_browser') {
          const targetClientId = String((msg as any)?.targetClientId || '').trim();
          if (!targetClientId) return;
          selectedClientIdBySessionId.set(sessionId, targetClientId);
          waitingBrowserSelectionSessionIds.delete(sessionId);

          const candidates = getBrowserCandidates();
          const connected = candidates.find((c) => c.clientId === targetClientId);
          if (connected) {
            emitUiEvent(sessionId, {
              type: 'myBrowserSelection',
              id: randomId(),
              timestamp: Date.now(),
              status: 'selected',
              connectedBrowser: connected,
            } satisfies BionFrontendEvent);
          }

          const pending = pendingBrowserTaskBySessionId.get(sessionId);
          if (pending) {
            emitUiEvent(sessionId, {
              type: 'browserTaskConfirmationRequested',
              id: randomId(),
              timestamp: Date.now(),
              requestId: pending.requestId,
              clientId: targetClientId,
              summary: pending.summary,
              browserActionPreview: extractBrowserAction(pending.payload) ?? pending.payload,
              targetEventId: pending.targetEventId,
            } satisfies BionFrontendEvent);
          }
          return;
        }

        // User confirms / cancels starting a browser task.
        if (msgType === 'confirm_browser_task') {
          const requestId = String((msg as any)?.requestId || '').trim();
          const confirmed = Boolean((msg as any)?.confirmed);
          if (!requestId) return;

          const pending = pendingBrowserTaskBySessionId.get(sessionId);
          if (!pending || pending.requestId !== requestId) return;

          const clientId = selectedClientIdBySessionId.get(sessionId);
          if (!clientId) {
            emitUiEvent(sessionId, {
              type: 'structuredOutput',
              id: randomId(),
              timestamp: Date.now(),
              status: 'error',
              error: 'No browser selected. Please select a browser extension first.',
              isComplete: true,
              targetEventId: pending.targetEventId,
            } as any);
            return;
          }

          if (!confirmed) {
            pendingBrowserTaskBySessionId.delete(sessionId);
            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: 'browser_task',
              actionId: requestId,
              status: 'success',
              brief: 'Browser task cancelled by user',
            } satisfies BionFrontendEvent);
            return;
          }

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'browser_task',
            actionId: requestId,
            status: 'start',
            brief: 'Starting browser task',
            description: pending.summary,
          } satisfies BionFrontendEvent);

          try {
            const action = extractBrowserAction(pending.payload);
            const initialUrl = extractFirstNavigateUrl(action);
            const history = historyBySessionId.get(sessionId) ?? [];
            const lastUserText =
              [...history].reverse().find((m) => m.role === 'user')?.content ?? pending.summary;

            const llm = llmProvider.getClient(defaultModel);
            const title = await generateBrowserTaskTitle({
              llm,
              model: defaultModel,
              userText: lastUserText,
              summary: pending.summary,
              url: initialUrl,
            });
            pending.title = title;

            const transport = createBionBrowserTransport({
              callPluginBrowserAction,
              timeoutMs: 90_000,
            });

            await runBrowserTask({
              transport,
              sessionId,
              clientId,
              requestId,
              summary: pending.summary,
              title,
              initialUrl,
              targetEventId: pending.targetEventId,
              action,
            });

            pendingBrowserTaskBySessionId.delete(sessionId);
            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: 'browser_task',
              actionId: requestId,
              status: 'success',
              brief: 'Browser task finished',
            } satisfies BionFrontendEvent);
          } catch (e) {
            pendingBrowserTaskBySessionId.delete(sessionId);
            const err = e instanceof Error ? e.message : String(e);
            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: 'browser_task',
              actionId: requestId,
              status: 'error',
              brief: 'Browser task failed',
              detail: { error: err },
            } satisfies BionFrontendEvent);
          }
          return;
        }

        if (msgType !== 'user_message') {
          console.log('[Bion] Skipping non-user_message:', msgType);
          return;
        }

        const userMessageId = typeof (msg as any)?.id === 'string' ? String((msg as any).id) : randomId();
        const userText = extractUserText(msg);
        if (!userText.trim()) return;

        console.log('[Bion] Processing user_message:', { sessionId, userMessageId, userText });

        // If we keep browser sessions across messages, expire stale ones.
        let activeBrowserSession = persistBrowserSession ? activeBrowserSessionBySessionId.get(sessionId) ?? null : null;
        const now = Date.now();
        if (activeBrowserSession && now - activeBrowserSession.lastUsedAt > browserSessionTtlMs) {
          try {
            const transport = createBionBrowserTransport({
              callPluginBrowserAction,
              timeoutMs: 20_000,
            });
            await transport.execute({
              sessionId,
              clientId: activeBrowserSession.clientId,
              actionId: `${activeBrowserSession.requestId}:session_stop:ttl`,
              actionName: 'session/stop',
              params: { requestId: activeBrowserSession.requestId },
            });
          } catch {
            // ignore best-effort stop on TTL expiry
          } finally {
            activeBrowserSessionBySessionId.delete(sessionId);
            activeBrowserSession = null;
          }
        }

        // Append user message to session history.
        const history = historyBySessionId.get(sessionId) ?? [];
        history.push({ role: 'user', content: userText, timestamp: Date.now() });
        historyBySessionId.set(sessionId, history);

        const model = defaultModel;
        const llm = llmProvider.getClient(model);
        const temperature = 0.2;
        const maxTokens = 800;
        const startedAt = Date.now();

        // Agent loop is powerful but invasive (it starts a dedicated browser session per message).
        // Default to OFF; enable explicitly with MIMO_AGENT_LOOP=true.
        const agentLoopEnabled = process.env.MIMO_AGENT_LOOP === 'true';
        if (agentLoopEnabled) {
          const loopActionId = `llmloop:${sessionId}:${userMessageId}`;
          const requestId = `browser:${sessionId}:${userMessageId}:${randomId()}`;

          logger.info(
            {
              sessionId,
              userMessageId,
              loopActionId,
              model,
              temperature,
              maxTokens,
              historyCount: history.length,
              userText,
            },
            '[Bion] Agent loop start'
          );

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: loopActionId,
            status: 'start',
            brief: 'Agent loop started',
            description: `model=${model}`,
          } satisfies BionFrontendEvent);

          // Resolve a browser extension clientId (dev-friendly auto-pick if only one).
          let clientId = selectedClientIdBySessionId.get(sessionId) ?? null;
          if (!clientId) {
            const candidates = getBrowserCandidates();
            if (candidates.length === 1) {
              clientId = candidates[0]!.clientId;
              selectedClientIdBySessionId.set(sessionId, clientId);
              waitingBrowserSelectionSessionIds.delete(sessionId);
              emitUiEvent(sessionId, {
                type: 'myBrowserSelection',
                id: randomId(),
                timestamp: Date.now(),
                status: 'selected',
                connectedBrowser: candidates[0]!,
              } satisfies BionFrontendEvent);
            } else {
              waitingBrowserSelectionSessionIds.add(sessionId);
              emitUiEvent(sessionId, {
                type: 'myBrowserSelection',
                id: randomId(),
                timestamp: Date.now(),
                status: 'waiting_for_selection',
                browserCandidates: candidates,
              } satisfies BionFrontendEvent);
            }
          }

          if (!clientId) {
            const msgText = 'Please select a browser extension first, then retry your request.';
            history.push({ role: 'assistant', content: msgText, timestamp: Date.now() });
            historyBySessionId.set(sessionId, history);
            emitUiEvent(sessionId, {
              type: 'chatDelta',
              id: randomId(),
              timestamp: Date.now(),
              delta: { content: msgText },
              finished: true,
              sender: 'assistant',
              targetEventId: userMessageId,
            } satisfies BionFrontendEvent);
            return;
          }

          const transport = createBionBrowserTransport({
            callPluginBrowserAction,
            timeoutMs: 90_000,
          });

          const registry = new ToolRegistry();
          registerBrowserTools(registry);
          const scheduler = new ToolScheduler({ defaultGroup: 'default' });

          const browserToolsConfig = {
            transport,
            sessionId,
            clientId,
            createActionId: () => `${requestId}:${randomId()}`,
          };

          // Start a dedicated browser session for this request.
          const historyForTitle = historyBySessionId.get(sessionId) ?? [];
          const lastUserText =
            [...historyForTitle].reverse().find((m) => m.role === 'user')?.content ?? userText;
          const title = await generateBrowserTaskTitle({
            llm,
            model,
            userText: lastUserText,
            summary: userText,
            url: null,
          });

          const startTool = registry.getTool('browser_session_start');
          if (!startTool) throw new Error('browser_session_start tool not registered');
          const startExec = await scheduler.execute(
            startTool,
            { requestId, summary: userText, title },
            { config: { browserTools: browserToolsConfig } } as any
          );
          if (!startExec.success) throw new Error(startExec.error || 'browser_session_start failed');

          let lastObservation: unknown = null;
          const maxSteps = Math.max(1, Number.parseInt(String(process.env.MIMO_AGENT_LOOP_MAX_STEPS || '8'), 10) || 8);

          for (let step = 0; step < maxSteps; step++) {
            const obsJson =
              lastObservation == null
                ? ''
                : JSON.stringify(lastObservation).slice(0, 12_000);

            const decision = await llm.complete({
              model,
              temperature: 0.2,
              maxTokens: 512,
              messages: [
                {
                  role: 'system',
                  content:
                    [
                      'You are a tool-using agent controlling a browser extension.',
                      'You MUST respond with a single JSON object and nothing else.',
                      'Choose either:',
                      '{"type":"tool","name":"<tool_name>","arguments":{...}} or {"type":"final","content":"..."}',
                      'Allowed tool names:',
                      '- browser_navigate { url }',
                      '- browser_get_content { maxChars? }',
                      '- browser_click { selector? , xpath? }',
                      '- browser_fill { selector? , xpath? , text }',
                      '- browser_screenshot { reason? }',
                      '- browser_session_stop { requestId }',
                      'Prefer calling browser_get_content after navigation to observe the page.',
                    ].join('\n'),
                },
                { role: 'user', content: `User request:\n${userText}` },
                obsJson ? { role: 'user', content: `Last observation (JSON, may be truncated):\n${obsJson}` } : null,
              ].filter(Boolean) as any,
            } as any);

            const parsed = safeJsonParse(String(decision?.content ?? '').trim());
            if (!parsed || typeof parsed !== 'object') {
              // If the model refuses to produce JSON, treat as final.
              const finalText = String(decision?.content ?? '').trim() || 'Done.';
              history.push({ role: 'assistant', content: finalText, timestamp: Date.now() });
              historyBySessionId.set(sessionId, history);
              emitUiEvent(sessionId, {
                type: 'chatDelta',
                id: randomId(),
                timestamp: Date.now(),
                delta: { content: finalText },
                finished: true,
                sender: 'assistant',
                targetEventId: userMessageId,
              } satisfies BionFrontendEvent);
              break;
            }

            const t = (parsed as any).type;
            if (t === 'final') {
              const finalText = String((parsed as any).content ?? '').trim() || 'Done.';
              history.push({ role: 'assistant', content: finalText, timestamp: Date.now() });
              historyBySessionId.set(sessionId, history);
              emitUiEvent(sessionId, {
                type: 'chatDelta',
                id: randomId(),
                timestamp: Date.now(),
                delta: { content: finalText },
                finished: true,
                sender: 'assistant',
                targetEventId: userMessageId,
              } satisfies BionFrontendEvent);
              break;
            }

            if (t !== 'tool') throw new Error('Invalid agent loop JSON: missing type');

            const toolName = String((parsed as any).name || '').trim();
            const toolArgs = (parsed as any).arguments ?? {};
            if (!toolName) throw new Error('Invalid tool call: missing name');

            const tool = registry.getTool(toolName);
            if (!tool) throw new Error(`Unknown tool: ${toolName}`);

            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: toolName,
              actionId: `${loopActionId}:${step}`,
              status: 'start',
              brief: `Running ${toolName}`,
              argumentsDetail: toolArgs,
            } satisfies BionFrontendEvent);

            logger.info(
              { sessionId, userMessageId, tool: toolName, step, actionId: loopActionId, params: toolArgs },
              '[Bion] Agent loop tool execute start'
            );

            const exec = await scheduler.execute(tool, toolArgs, { config: { browserTools: browserToolsConfig } } as any);
            if (!exec.success) {
              logger.error(
                { sessionId, userMessageId, tool: toolName, step, actionId: loopActionId, error: exec.error },
                '[Bion] Agent loop tool execute failed'
              );
              emitUiEvent(sessionId, {
                type: 'toolUsed',
                id: randomId(),
                timestamp: Date.now(),
                tool: toolName,
                actionId: `${loopActionId}:${step}`,
                status: 'error',
                brief: `${toolName} failed`,
                detail: { error: exec.error },
              } satisfies BionFrontendEvent);
              throw new Error(exec.error || `${toolName} failed`);
            }

            lastObservation = exec.result ?? null;
            logger.info(
              {
                sessionId,
                userMessageId,
                tool: toolName,
                step,
                actionId: loopActionId,
                result: exec.result,
              },
              '[Bion] Agent loop tool execute success'
            );

            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: toolName,
              actionId: `${loopActionId}:${step}`,
              status: 'success',
              brief: `${toolName} success`,
            } satisfies BionFrontendEvent);

            if (toolName === 'browser_session_stop') {
              // If the model stops the session, end loop with a short final response.
              const finalText = 'Browser session stopped.';
              history.push({ role: 'assistant', content: finalText, timestamp: Date.now() });
              historyBySessionId.set(sessionId, history);
              emitUiEvent(sessionId, {
                type: 'chatDelta',
                id: randomId(),
                timestamp: Date.now(),
                delta: { content: finalText },
                finished: true,
                sender: 'assistant',
                targetEventId: userMessageId,
              } satisfies BionFrontendEvent);
              break;
            }
          }

          // Best-effort session stop if loop didn't call it.
          try {
            const stopTool = registry.getTool('browser_session_stop');
            if (stopTool) {
              await scheduler.execute(stopTool, { requestId }, { config: { browserTools: browserToolsConfig } } as any);
            }
          } catch {
            // ignore
          }

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: loopActionId,
            status: 'success',
            brief: 'Agent loop finished',
            detail: { durationMs: Date.now() - startedAt },
          } satisfies BionFrontendEvent);

          const durationMs = Date.now() - startedAt;
          const finalHistory = historyBySessionId.get(sessionId) ?? [];
          const lastAssistantMsg = [...finalHistory].reverse().find((m) => m.role === 'assistant');
          const assistantText = lastAssistantMsg?.content ?? '';

          logger.info(
            {
              sessionId,
              userMessageId,
              loopActionId,
              model,
              durationMs,
              historyCount: finalHistory.length,
              assistantChars: assistantText.length,
              assistantText,
            },
            '[Bion] Agent loop success'
          );

          // Persist full conversation messages for Agent Loop
          void persistMessage({
            sessionId,
            taskId: sessionId,
            userMessageId,
            llmActionId: loopActionId,
            model,
            temperature,
            maxTokens,
            userText,
            llmMessages: finalHistory.map((m: any) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
            assistantText,
            durationMs,
            tools: ['browser_navigate', 'browser_get_content', 'browser_click', 'browser_fill', 'browser_screenshot', 'browser_session_stop'],
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, loopActionId, filePath }, '[Bion] persisted message (agent loop)');
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              logger.error({ sessionId, userMessageId, loopActionId, message, stack }, '[Bion] persist message failed (agent loop)');
            });

          return;
        }

        // Native tool calling (non-invasive): only enable when the user's message
        // clearly asks to open/visit a website.
        const wantsBrowserStop = /关闭浏览器|关闭\s*会话|stop\s+browser|stop\s+session/i.test(userText);
        const browserIntent = isBrowserIntent(userText) || (persistBrowserSession && Boolean(activeBrowserSession));
        const browserRequestId = activeBrowserSession?.requestId ?? (browserIntent ? `browser:${sessionId}:${userMessageId}:${randomId()}` : null);
        let browserSessionStop: (() => Promise<void>) | null = null;

        // If browser intent, prepare a browser session + toolset for the LLM.
        let llmMessages: any = history as any;
        let llmTools: any = undefined;
        let llmExperimentalContext: any = undefined;
        // Tool-policy vars must live in this scope (used by retry + policy recorders below).
        let intent: ToolIntent = 'unknown';
        let domain = '';
        let extensionVersion = 'unknown';
        let selectedTier: ToolTier = 'tier1';
        let toolNames: string[] = [];
        const observedUsedTools = new Set<string>();

        // Declare these outside the conditional block so they're accessible in the catch block
        let buildToolSet: (() => Record<string, any>) | null = null;
        var toolSet: Record<string, any> = {};

        if (browserIntent && browserRequestId) {
          // Resolve a browser extension clientId (dev-friendly auto-pick if only one).
          let clientId = activeBrowserSession?.clientId ?? selectedClientIdBySessionId.get(sessionId) ?? null;
          if (clientId && !pluginByClientId.has(clientId)) {
            // Connected extension disappeared; drop the persisted session.
            if (persistBrowserSession) activeBrowserSessionBySessionId.delete(sessionId);
            activeBrowserSession = null;
            clientId = selectedClientIdBySessionId.get(sessionId) ?? null;
          }
          if (!clientId) {
            const candidates = getBrowserCandidates();
            if (candidates.length === 1) {
              clientId = candidates[0]!.clientId;
              selectedClientIdBySessionId.set(sessionId, clientId);
              waitingBrowserSelectionSessionIds.delete(sessionId);
              emitUiEvent(sessionId, {
                type: 'myBrowserSelection',
                id: randomId(),
                timestamp: Date.now(),
                status: 'selected',
                connectedBrowser: candidates[0]!,
              } satisfies BionFrontendEvent);
            } else {
              waitingBrowserSelectionSessionIds.add(sessionId);
              emitUiEvent(sessionId, {
                type: 'myBrowserSelection',
                id: randomId(),
                timestamp: Date.now(),
                status: 'waiting_for_selection',
                browserCandidates: candidates,
              } satisfies BionFrontendEvent);
            }
          }

          if (!clientId) {
            const msgText = 'Please select a browser extension first, then retry your request.';
            history.push({ role: 'assistant', content: msgText, timestamp: Date.now() });
            historyBySessionId.set(sessionId, history);
            emitUiEvent(sessionId, {
              type: 'chatDelta',
              id: randomId(),
              timestamp: Date.now(),
              delta: { content: msgText },
              finished: true,
              sender: 'assistant',
              targetEventId: userMessageId,
            } satisfies BionFrontendEvent);
            return;
          }

          const transport = createBionBrowserTransport({
            callPluginBrowserAction,
            timeoutMs: 90_000,
          });

          const registry = new ToolRegistry();
          registerBrowserTools(registry);
          const scheduler = new ToolScheduler({ defaultGroup: 'default' });

          const browserToolsConfig = {
            transport,
            sessionId,
            clientId,
            createActionId: () => `${browserRequestId}:${randomId()}`,
          };

          const toolContext = { config: { browserTools: browserToolsConfig } } as any;
          llmExperimentalContext = toolContext;

          // Start a browser session if we don't already have one persisted.
          const lastUrl = extractFirstUrlLike(userText) ?? inferKnownUrlFromText(userText);
          const title = activeBrowserSession?.title
            ? activeBrowserSession.title
            : await generateBrowserTaskTitle({
                llm,
                model,
                userText,
                summary: userText,
                url: lastUrl,
              });

          if (!activeBrowserSession) {
            const startTool = registry.getTool('browser_session_start');
            if (!startTool) throw new Error('browser_session_start tool not registered');

            logger.info(
              { sessionId, userMessageId, tool: 'browser_session_start', actionId: `${browserRequestId}:session_start` },
              '[Bion] Browser session start'
            );

            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: 'browser_session_start',
              actionId: `${browserRequestId}:session_start`,
              status: 'start',
              brief: 'Starting browser session',
            } satisfies BionFrontendEvent);

            const startExec = await scheduler.execute(
              startTool,
              { requestId: browserRequestId, summary: userText, title, initialUrl: lastUrl ?? undefined },
              toolContext as any
            );
            if (!startExec.success) {
              logger.error(
                { sessionId, userMessageId, tool: 'browser_session_start', actionId: `${browserRequestId}:session_start`, error: startExec.error },
                '[Bion] Browser session start failed'
              );
              emitUiEvent(sessionId, {
                type: 'toolUsed',
                id: randomId(),
                timestamp: Date.now(),
                tool: 'browser_session_start',
                actionId: `${browserRequestId}:session_start`,
                status: 'error',
                brief: 'browser_session_start failed',
                detail: { error: startExec.error },
              } satisfies BionFrontendEvent);
              throw new Error(startExec.error || 'browser_session_start failed');
            }

            logger.info(
              { sessionId, userMessageId, tool: 'browser_session_start', actionId: `${browserRequestId}:session_start`, result: startExec.result },
              '[Bion] Browser session start success'
            );

            emitUiEvent(sessionId, {
              type: 'toolUsed',
              id: randomId(),
              timestamp: Date.now(),
              tool: 'browser_session_start',
              actionId: `${browserRequestId}:session_start`,
              status: 'success',
              brief: 'Browser session started',
            } satisfies BionFrontendEvent);

            if (persistBrowserSession) {
              activeBrowserSession = {
                requestId: browserRequestId,
                clientId,
                title,
                startedAt: Date.now(),
                lastUsedAt: Date.now(),
              };
              activeBrowserSessionBySessionId.set(sessionId, activeBrowserSession);
            } else {
              browserSessionStop = async () => {
                try {
                  const stopTool = registry.getTool('browser_session_stop');
                  if (!stopTool) return;

                  logger.info(
                    { sessionId, userMessageId, tool: 'browser_session_stop', actionId: `${browserRequestId}:session_stop` },
                    '[Bion] Browser session stop'
                  );

                  emitUiEvent(sessionId, {
                    type: 'toolUsed',
                    id: randomId(),
                    timestamp: Date.now(),
                    tool: 'browser_session_stop',
                    actionId: `${browserRequestId}:session_stop`,
                    status: 'start',
                    brief: 'Stopping browser session',
                  } satisfies BionFrontendEvent);
                  const stopExec = await scheduler.execute(stopTool, { requestId: browserRequestId }, toolContext as any);

                  if (stopExec.success) {
                    logger.info(
                      { sessionId, userMessageId, tool: 'browser_session_stop', actionId: `${browserRequestId}:session_stop`, result: stopExec.result },
                      '[Bion] Browser session stop success'
                    );
                  } else {
                    logger.error(
                      { sessionId, userMessageId, tool: 'browser_session_stop', actionId: `${browserRequestId}:session_stop`, error: stopExec.error },
                      '[Bion] Browser session stop failed'
                    );
                  }

                  emitUiEvent(sessionId, {
                    type: 'toolUsed',
                    id: randomId(),
                    timestamp: Date.now(),
                    tool: 'browser_session_stop',
                    actionId: `${browserRequestId}:session_stop`,
                    status: stopExec.success ? 'success' : 'error',
                    brief: stopExec.success ? 'Browser session stopped' : 'browser_session_stop failed',
                    detail: stopExec.success ? undefined : { error: stopExec.error },
                  } satisfies BionFrontendEvent);
                } catch {
                  // ignore best-effort stop failures
                }
              };
            }
          } else {
            // Refresh activity timestamp for persisted sessions.
            activeBrowserSession.lastUsedAt = Date.now();
            activeBrowserSessionBySessionId.set(sessionId, activeBrowserSession);
          }

          // Handle explicit stop request.
          if (wantsBrowserStop) {
            if (persistBrowserSession && activeBrowserSession) {
              try {
                const stopTool = registry.getTool('browser_session_stop');
                if (!stopTool) throw new Error('browser_session_stop tool not registered');
                await scheduler.execute(stopTool, { requestId: activeBrowserSession.requestId }, toolContext as any);
              } catch {
                // ignore
              } finally {
                activeBrowserSessionBySessionId.delete(sessionId);
                activeBrowserSession = null;
              }
            }

            const msgText = 'Browser session stopped.';
            history.push({ role: 'assistant', content: msgText, timestamp: Date.now() });
            historyBySessionId.set(sessionId, history);
            emitUiEvent(sessionId, {
              type: 'chatDelta',
              id: randomId(),
              timestamp: Date.now(),
              delta: { content: msgText },
              finished: true,
              sender: 'assistant',
              targetEventId: userMessageId,
            } satisfies BionFrontendEvent);
            return;
          }

          intent = inferIntent(userText);
          domain = inferDomain(lastUrl);
          extensionVersion = pluginMetaByClientId.get(clientId)?.version || 'unknown';

          const recommended = await toolDisclosure.getRecommendedTier({
            intent,
            domain,
            model,
            extensionVersion,
          });
          selectedTier = recommended.tier;

          // Prefer the smallest tier that historically worked for this (intent, domain, model, extensionVersion).
          // The selected tier expands to include all tools from lower tiers.
          toolNames = toolsForTier(selectedTier);

          // Allow the model to explicitly request a larger tier when it knows it needs discovery/debug tools.
          // NOTE: this triggers a server-side rerun with expanded tools (see stream loop below).
          const requestToolsParams = z.object({
            tier: z.enum(['tier0', 'tier1', 'tier2', 'tier3']).optional(),
            reason: z.string().optional(),
          });

          /**
           * 构建当前层级的工具集
           * 根据选定的工具层级，返回包含所有可用工具的工具集对象
           * @returns 工具集对象，键为工具名称，值为工具配置
           */
          buildToolSet = (): Record<string, any> => {
            toolNames = toolsForTier(selectedTier);

            const newToolSet: Record<string, any> = {};
            newToolSet['mimo_request_tools'] = {
              name: 'mimo_request_tools',
              group: 'mimo',
              description:
                'Request the server to expand the available tool tier for this request. Use when you need additional browser tools not currently available (e.g. xpath scan/mark).',
              parameters: requestToolsParams,
              execute: async (params: any) => {
                const requested = (params?.tier as ToolTier | undefined) ?? 'tier2';
                const reason = typeof params?.reason === 'string' ? params.reason : undefined;
                observedUsedTools.add('mimo_request_tools');
                throw new ToolUpgradeRequestedError(requested, reason);
              },
            };

            for (const name of toolNames) {
              const t = registry.getTool(name);
              if (!t) continue;
              newToolSet[name] = {
                ...t,
                execute: async (params: any, ctx: any) => {
                  observedUsedTools.add(name);
                  const toolCallId = (ctx as any)?.metadata?.toolCallId;
                  const actionId = toolCallId ? String(toolCallId) : `${browserRequestId}:${randomId()}`;

                  logger.info(
                    { sessionId, userMessageId, tool: name, actionId, params },
                    '[Bion] Tool execute start'
                  );

                  emitUiEvent(sessionId, {
                    type: 'toolUsed',
                    id: randomId(),
                    timestamp: Date.now(),
                    tool: name,
                    actionId,
                    status: 'start',
                    brief: `Running ${name}`,
                    argumentsDetail: params,
                  } satisfies BionFrontendEvent);

                  const exec = await scheduler.execute(t, params, ctx as any);
                  if (!exec.success) {
                    logger.error(
                      { sessionId, userMessageId, tool: name, actionId, error: exec.error },
                      '[Bion] Tool execute failed'
                    );
                    emitUiEvent(sessionId, {
                      type: 'toolUsed',
                      id: randomId(),
                      timestamp: Date.now(),
                      tool: name,
                      actionId,
                      status: 'error',
                      brief: `${name} failed`,
                      detail: { error: exec.error },
                    } satisfies BionFrontendEvent);
                    throw new Error(exec.error || `${name} failed`);
                  }

                  // Log tool execution result - this is critical for understanding model reasoning
                  logger.info(
                    {
                      sessionId,
                      userMessageId,
                      tool: name,
                      actionId,
                      result: exec.result,
                    },
                    '[Bion] Tool execute success'
                  );

                  emitUiEvent(sessionId, {
                    type: 'toolUsed',
                    id: randomId(),
                    timestamp: Date.now(),
                    tool: name,
                    actionId,
                    status: 'success',
                    brief: `${name} success`,
                  } satisfies BionFrontendEvent);

                  return exec.result;
                },
              };
            }

            return newToolSet;
          };

          toolSet = buildToolSet();

          llmTools = Object.keys(toolSet).length > 0 ? toolSet : undefined;
          llmMessages = [
            {
              role: 'system',
              content: [
                'You can use browser tools to open and interact with websites.',
                'When the user asks to open/visit a website, use the browser tools instead of saying you cannot.',
                'If the user provides a site name (e.g. \"google\"), infer a reasonable https URL.',
                'After navigation, you may call browser_get_content to confirm the page opened.',
                'For interactions: use browser_click (click buttons/links) and browser_fill (type into inputs). If you need click/fill tools and they are not available, call mimo_request_tools FIRST with tier1.',
                'Example: mimo_request_tools { tier: \"tier1\", reason: \"need click/fill\" }',
                'To highlight all interactive elements: call browser_xpath_scan, then call browser_xpath_mark with { xpaths: scan.xpaths ?? scan.items.map(i => i.xpath) }.',
                'If you need additional tools that are not available, call mimo_request_tools FIRST (before writing assistant text).',
                'Example: mimo_request_tools { tier: \"tier2\", reason: \"need xpath scan/mark\" }',
              ].join('\\n'),
            },
            ...history,
          ] as any;
        }

        // Stream text tokens as chatDelta
        let assistantAccum = '';
        let lastUsage: unknown | null = null;
        const llmActionId = `llm:${sessionId}:${userMessageId}`;
        try {
          logger.info(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              temperature,
              maxTokens,
              historyCount: history.length,
              userText,
              llmMessages: llmMessages.map((m: any) => ({ role: m.role, content: m.content })),
              tools: llmTools ? Object.keys(llmTools) : undefined,
            },
            '[Bion] LLM stream start'
          );

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'start',
            brief: 'LLM streaming started',
            description: `model=${model}`,
            argumentsDetail: {
              model,
              maxTokens,
              temperature,
            },
          } satisfies BionFrontendEvent);

          let streamedOk = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            // Reset per attempt (in case we rerun with expanded tools).
            assistantAccum = '';
            lastUsage = null;

            try {
              console.log('[Bion] Starting LLM stream:', { sessionId, userMessageId, model, temperature, maxTokens, hasTools: !!llmTools });

              for await (const chunk of llm.stream({
                model,
                // Cast: the runtime only needs role/content fields.
                messages: llmMessages,
                temperature,
                maxTokens,
                tools: llmTools,
                toolChoice: llmTools ? 'auto' : undefined,
                experimentalContext: llmExperimentalContext,
              } as any)) {
                const delta = chunk.content ?? '';
                if (chunk.usage && (chunk.usage as any).totalTokens !== undefined) {
                  lastUsage = chunk.usage;
                }
                if (!delta) continue;
                assistantAccum += delta;

                emitUiEvent(sessionId, {
                  type: 'chatDelta',
                  id: randomId(),
                  timestamp: Date.now(),
                  delta: { content: delta },
                  finished: false,
                  sender: 'assistant',
                  targetEventId: userMessageId,
                } satisfies BionFrontendEvent);
              }

              streamedOk = true;
              break;
            } catch (e) {
              if (e instanceof ToolUpgradeRequestedError) {
                const fromTier = selectedTier;
                selectedTier = maxTier(selectedTier, e.requestedTier);
                if (buildToolSet) {
                  toolSet = buildToolSet();
                  llmTools = Object.keys(toolSet).length > 0 ? toolSet : undefined;
                }

                void toolDisclosure
                  .recordUpgrade({
                    intent,
                    domain,
                    model,
                    extensionVersion,
                    fromTier,
                    toTier: selectedTier,
                  })
                  .catch(() => {});

                // Retry with expanded tools.
                continue;
              }
              throw e;
            }
          }

          if (!streamedOk) {
            throw new Error('LLM streaming failed after tool-tier retries');
          }

          // Persist assistant message in history.
          history.push({ role: 'assistant', content: assistantAccum, timestamp: Date.now() });
          historyBySessionId.set(sessionId, history);

          // Mark stream finished
          emitUiEvent(sessionId, {
            type: 'chatDelta',
            id: randomId(),
            timestamp: Date.now(),
            delta: { content: '' },
            finished: true,
            sender: 'assistant',
            targetEventId: userMessageId,
          } satisfies BionFrontendEvent);

          // Best-effort structured output: if final assistant text is JSON.
          const parsed = safeJsonParse(assistantAccum.trim());
          if (parsed !== null) {
            emitUiEvent(sessionId, {
              type: 'structuredOutput',
              id: randomId(),
              timestamp: Date.now(),
              status: 'success',
              data: parsed,
              isComplete: true,
              targetEventId: userMessageId,
            } as any);

            // If the final structured output indicates a browser task request, trigger selection/confirmation flow.
            const summary = summarizeBrowserTask(parsed);
            if (summary) {
              const requestId = `browser:${sessionId}:${userMessageId}:${randomId()}`;
              pendingBrowserTaskBySessionId.set(sessionId, {
                requestId,
                sessionId,
                targetEventId: userMessageId,
                payload: parsed as any,
                summary,
                createdAt: Date.now(),
              });

              const selectedClientId = selectedClientIdBySessionId.get(sessionId);
              if (!selectedClientId) {
                const candidates = getBrowserCandidates();
                waitingBrowserSelectionSessionIds.add(sessionId);
                emitUiEvent(sessionId, {
                  type: 'myBrowserSelection',
                  id: randomId(),
                  timestamp: Date.now(),
                  status: 'waiting_for_selection',
                  browserCandidates: candidates,
                } satisfies BionFrontendEvent);
              } else {
                waitingBrowserSelectionSessionIds.delete(sessionId);
                emitUiEvent(sessionId, {
                  type: 'browserTaskConfirmationRequested',
                  id: randomId(),
                  timestamp: Date.now(),
                  requestId,
                  clientId: selectedClientId,
                  summary,
                  browserActionPreview: extractBrowserAction(parsed) ?? parsed,
                  targetEventId: userMessageId,
                } satisfies BionFrontendEvent);
              }
            }
          }

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'success',
            brief: 'LLM streaming finished',
            detail: {
              model,
              usage: lastUsage ?? undefined,
            },
          } satisfies BionFrontendEvent);

          const durationMs = Date.now() - startedAt;
          logger.info(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              durationMs,
              usage: lastUsage ?? undefined,
              assistantChars: assistantAccum.length,
              assistantText: assistantAccum,
            },
            '[Bion] LLM stream success'
          );

          // Best-effort: persist the smallest successful tool tier for this (intent, domain, model, extensionVersion).
          if (llmTools) {
            void toolDisclosure
              .recordSuccess({
                intent,
                domain,
                model,
                extensionVersion,
                tier: selectedTier,
                toolNames,
                observedUsedTools: Array.from(observedUsedTools),
              })
              .catch((e: unknown) => {
                const message = e instanceof Error ? e.message : String(e);
                logger.warn({ sessionId, message }, '[Bion] tool disclosure policy save failed');
              });
          }

          void persistLlmRun({
            sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            historyCount: history.length,
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted LLM run');
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              logger.error({ sessionId, userMessageId, llmActionId, message, stack }, '[Bion] persist LLM run failed');
            });

          // Persist full conversation messages
          void persistMessage({
            sessionId,
            taskId: sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            llmMessages: llmMessages.map((m: any) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
            tools: llmTools ? Object.keys(llmTools) : undefined,
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted message');
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              logger.error({ sessionId, userMessageId, llmActionId, message, stack }, '[Bion] persist message failed');
            });
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          const durationMs = Date.now() - startedAt;

          logger.error(
            {
              sessionId,
              userMessageId,
              llmActionId,
              model,
              durationMs,
              error: err,
            },
            '[Bion] LLM stream error'
          );

          console.error('[Bion] LLM stream error:', { sessionId, userMessageId, error: err, stack: e instanceof Error ? e.stack : undefined });

          emitUiEvent(sessionId, {
            type: 'structuredOutput',
            id: randomId(),
            timestamp: Date.now(),
            status: 'error',
            error: err,
            isComplete: true,
            targetEventId: userMessageId,
          } as any);

          emitUiEvent(sessionId, {
            type: 'toolUsed',
            id: randomId(),
            timestamp: Date.now(),
            tool: 'llm',
            actionId: llmActionId,
            status: 'error',
            brief: 'LLM streaming error',
            detail: { error: err, model },
          } satisfies BionFrontendEvent);

          void persistLlmRun({
            sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            historyCount: history.length,
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
            error: {
              message: err,
              stack: e instanceof Error ? e.stack : undefined,
            },
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted LLM run (error)');
            })
            .catch((persistErr: unknown) => {
              const message = persistErr instanceof Error ? persistErr.message : String(persistErr);
              const stack = persistErr instanceof Error ? persistErr.stack : undefined;
              logger.error(
                { sessionId, userMessageId, llmActionId, message, stack },
                '[Bion] persist LLM run failed (error)'
              );
            });

          // Persist full conversation messages (error case)
          void persistMessage({
            sessionId,
            taskId: sessionId,
            userMessageId,
            llmActionId,
            model,
            temperature,
            maxTokens,
            userText,
            llmMessages: llmMessages.map((m: any) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
            assistantText: assistantAccum,
            usage: lastUsage ?? undefined,
            durationMs,
            tools: llmTools ? Object.keys(llmTools) : undefined,
            error: {
              message: err,
              stack: e instanceof Error ? e.stack : undefined,
            },
          })
            .then((filePath) => {
              logger.info({ sessionId, userMessageId, llmActionId, filePath }, '[Bion] persisted message (error)');
            })
            .catch((persistErr: unknown) => {
              const message = persistErr instanceof Error ? persistErr.message : String(persistErr);
              const stack = persistErr instanceof Error ? persistErr.stack : undefined;
              logger.error(
                { sessionId, userMessageId, llmActionId, message, stack },
                '[Bion] persist message failed (error)'
              );
            });
        } finally {
          if (browserSessionStop) {
            await browserSessionStop();
          }
        }
      });
    }

    if (clientType === 'extension') {
      socket.on(BionSocketEvent.BrowserExtensionMessage, (payload: unknown, ack?: (response: unknown) => void) => {
        const decoded = decodePluginMessage(payload) ?? (payload as any);
        const msgType = (decoded as any)?.type;

        // 处理标签页事件消息
        if (msgType === 'tab_event') {
          const tabEvent = decoded as BionTabEventMessage;
          // 将 Bion 协议的标签页事件转换为数字孪生事件格式
          const twinEvent = convertBionTabEventToTwinEvent(tabEvent);
          if (twinEvent) {
            browserTwin.applyEvent(twinEvent);
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('[Bion] tab_event applied', {
                eventType: tabEvent.eventType,
                tabId: tabEvent.tab?.tabId ?? tabEvent.tabId,
                windowId: tabEvent.window?.windowId ?? tabEvent.windowId,
              });
            }
          }
          // Acknowledge tab_event messages
          if (typeof ack === 'function') {
            ack({ ok: true });
          }
          return;
        }

        if (msgType === 'activate_extension') {
          const clientId = (decoded as any)?.clientId;
          if (typeof clientId === 'string' && clientId.length > 0) {
            pluginByClientId.set(clientId, socket);
            pluginMetaByClientId.set(clientId, {
              clientId,
              clientName: String((decoded as any)?.browserName || 'MimoBrowser'),
              ua: String((decoded as any)?.ua || ''),
              version: String((decoded as any)?.version || ''),
              allowOtherClientId: Boolean((decoded as any)?.allowOtherClient),
            });
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('[Bion] activate_extension', {
                socketId: socket.id,
                clientId,
                browserName: String((decoded as any)?.browserName || 'MimoBrowser'),
              });
            }
            // If some sessions are waiting for browser selection, refresh candidates.
            refreshWaitingBrowserSelections();
          }
        }

        // If server receives an ack-able non-command message, ack ok.
        if (typeof ack === 'function' && (decoded as any)?.type !== 'browser_action') {
          ack({ ok: true });
        }
      });
    }

    socket.on('disconnect', (reason) => {
      for (const [clientId, s] of pluginByClientId.entries()) {
        if (s.id === socket.id) {
          pluginByClientId.delete(clientId);
          pluginMetaByClientId.delete(clientId);
        }
      }
      // Refresh waiting selection UI after plugin disconnect.
      refreshWaitingBrowserSelections();

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[Bion] disconnected', { socketId: socket.id, reason });
      }
    });
  });

  /**
   * 向指定会话发送前端消息包
   * @param sessionId - 会话 ID
   * @param envelope - 前端消息包对象
   */
  const emitUiEnvelope = (sessionId: string, envelope: BionFrontendMessageEnvelope) => {
    nsp.to(sessionRoom(sessionId)).emit(BionSocketEvent.Message, encodeFrontendEnvelope(envelope));
  };

  /**
   * 向指定会话发送 UI 事件
   * @param sessionId - 会话 ID
   * @param event - 前端事件对象
   * @param envelopeId - 消息包 ID（可选），不提供则自动生成
   */
  const emitUiEvent = (sessionId: string, event: BionFrontendEvent, envelopeId?: string) => {
    const id = envelopeId ?? randomId();
    const envelope: BionFrontendMessageEnvelope = {
      type: 'event',
      id,
      sessionId,
      timestamp: Date.now(),
      event,
    };
    emitUiEnvelope(sessionId, envelope);
  };

  /**
   * 调用浏览器插件执行浏览器操作
   * @param clientId - 浏览器扩展的客户端 ID
   * @param msg - 浏览器操作消息
   * @param timeoutMs - 超时时间（毫秒，默认 30000）
   * @returns 浏览器操作执行结果 Promise
   * @throws 当找不到对应客户端的 socket 时抛出错误
   */
  const callPluginBrowserAction = async (clientId: string, msg: BionBrowserActionMessage, timeoutMs = 30_000) => {
    const socket = pluginByClientId.get(clientId);
    if (!socket) throw new Error(`No plugin connected for clientId=${clientId}`);

    const wire = encodePluginMessage(msg as BionPluginMessage);
    const result = await new Promise<BionBrowserActionResult>((resolve, reject) => {
      socket.timeout(timeoutMs).emit(BionSocketEvent.BrowserExtensionMessage, wire, (err: unknown, response: unknown) => {
        if (err) return reject(err instanceof Error ? err : new Error(String(err)));
        const decoded = decodePluginMessage(response) ?? (response as any);
        resolve(decoded as BionBrowserActionResult);
      });
    });
    return result;
  };

  /**
   * Bion 运行时对象
   * 包含 Socket.IO 服务器实例和相关方法，供全局访问
   */
  const runtime: BionRuntime = {
    io,
    namespace: nsp,
    emitUiEvent,
    callPluginBrowserAction,
    getPlugins: () => Array.from(pluginByClientId.entries()).map(([clientId, s]) => ({ clientId, socketId: s.id })),
    getBrowserTwin: () => browserTwin,
  };

  // 将运行时对象存储在全局变量中，供其他路由访问
  globalThis.__bion = runtime;

  /**
   * Nitro 应用关闭时的清理钩子
   * 按顺序关闭 Socket.IO 服务器、HTTP 连接和 HTTP 服务器
   */
  nitroApp.hooks.hook('close', async () => {
    // Close Socket.IO server first
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    // Close all HTTP connections
    httpServer.closeAllConnections();

    // Close HTTP server with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        httpServer.close();
        resolve();
      }, 5000);

      httpServer.close((err?: Error) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });

    globalThis.__bion = undefined;
  });

  /**
   * 进程终止信号处理函数
   * 清理 Socket.IO 服务器、HTTP 连接和全局运行时对象
   */
  const shutdown = async () => {
    console.log('[Bion] Shutting down Socket.IO server...');
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    globalThis.__bion = undefined;
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start immediately (works in dev + production builds)
  void listenOnAvailablePort({
    httpServer,
    preferredPort,
    strict: Boolean(explicitSocketPort),
    maxTries: process.env.NODE_ENV === 'development' ? 20 : 1,
  })
    .then((boundPort) => {
      if (preferredPort !== boundPort) {
        logger.warn(
          { preferredPort, boundPort },
          `[Bion] Socket.IO port ${preferredPort} is in use; using ${boundPort} instead`
        );
      }

      // eslint-disable-next-line no-console
      console.log(`[Bion] Socket.IO server listening on :${boundPort}${namespaceName}`);

      if (process.env.NODE_ENV === 'development' && !explicitSocketPort) {
        // eslint-disable-next-line no-console
        console.log(`[Bion] Tip: set NEXT_PUBLIC_BION_URL=http://localhost:${boundPort}`);
      }
    })
    .catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      logger.error({ message }, '[Bion] Socket.IO server failed to start');
      // Avoid unhandled promise rejection warnings; keep Nitro running so HTTP routes still work.
      // eslint-disable-next-line no-console
      console.error(`[Bion] Socket.IO server failed to start: ${message}`);
    });
});

