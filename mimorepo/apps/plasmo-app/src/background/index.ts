/**
 * Background Script - Stagehand XPath (CDP)
 * 
 * 在 MV3 background service worker 中运行，通过 chrome.debugger (CDP) 扫描页面并构建 XPath。
 *
 * 目标：该 app 只保留“使用 CDP 构建 XPath”的能力；页面状态监听/同步等能力已移除。
 */

import { STAGEHAND_XPATH_SCAN, type StagehandXPathItem, type StagehandXPathScanPayload, type StagehandXPathScanResponse } from '../types/stagehand-xpath';
import {
  buildSessionDomIndex,
  mergeFrameXPath,
  queryBodyAbsXPath,
  querySelectorAllBackendIds,
  relativizeXPath,
  toDebuggee,
  type SessionDomIndex,
} from './stagehandSnapshot';

class StagehandXPathManager {
  // 防抖/去重：同一个 tabId 的 XPath 扫描不并发执行，避免重复 attach debugger/重复构建 DOM 索引。
  private stagehandXPathInFlight: Map<number, Promise<StagehandXPathScanResponse>> = new Map();

  constructor() {
    this.setupMessageListeners();
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Tab Page -> Background -> Content: 扫描当前活动标签页并生成 XPath
      if (message.type === STAGEHAND_XPATH_SCAN) {
        const payload = message.payload as Partial<StagehandXPathScanPayload> | undefined;
        const requestedTabId = payload && typeof payload.targetTabId === 'number' ? payload.targetTabId : undefined;

        const isScannableUrl = (url: string | undefined): boolean => {
          // 扩展/内部页不允许注入或不允许 debugger attach，提前拦截给出可读错误。
          const u = String(url || '');
          if (!u) return false;
          const blocked = [
            'chrome://',
            'edge://',
            'about:',
            'devtools://',
            'chrome-extension://',
            'moz-extension://',
            'view-source:',
            'file://',
          ];
          return !blocked.some((p) => u.startsWith(p));
        };

        const runOnTab = (tabId: number) => {
          chrome.tabs.get(tabId, (tab) => {
            const tabUrl = tab?.url;
            if (chrome.runtime.lastError) {
              sendResponse({
                ok: false,
                error: `tabs.get failed: ${chrome.runtime.lastError.message}`,
              } satisfies StagehandXPathScanResponse);
              return;
            }
            if (!isScannableUrl(tabUrl)) {
              sendResponse({
                ok: false,
                error: `目标 Tab 不可扫描（url=${tabUrl || 'unknown'}）。请使用 http/https 页面。`,
              } satisfies StagehandXPathScanResponse);
              return;
            }

            const maxItems =
              typeof payload?.maxItems === 'number' && Number.isFinite(payload.maxItems) && payload.maxItems > 0
                ? Math.floor(payload.maxItems)
                : 200;
            const selector =
              typeof payload?.selector === 'string' && payload.selector.trim()
                ? payload.selector.trim()
                : "a,button,input,textarea,select,[role='button'],[onclick]";
            const includeShadow = Boolean(payload?.includeShadow);

            // 核心流程：通过 chrome.debugger 走 CDP，把页面/各 iframe 中的候选元素映射到稳定的 XPath。
            const run = this.scanStagehandXPathViaCdp(tabId, { maxItems, selector, includeShadow });
            run
              .then((resp) => sendResponse(resp))
              .catch((e) =>
                sendResponse({
                  ok: false,
                  error: e instanceof Error ? e.message : String(e),
                } satisfies StagehandXPathScanResponse),
              );
          });
        };

        if (requestedTabId != null) {
          runOnTab(requestedTabId);
          return true;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs?.[0]?.id;
          if (!tabId) {
            sendResponse({ ok: false, error: 'No active tab found' } satisfies StagehandXPathScanResponse);
            return;
          }
          runOnTab(tabId);
        });

        return true;
      }

      return false;
    });
  }

  private async sendCdp<T = unknown>(
    tabId: number,
    sessionId: string | undefined,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    // chrome.debugger.sendCommand 是对 CDP 的薄封装：
    // - sessionId 为空 => root target
    // - sessionId 不为空 => flatten autoAttach 下的子 target（例如 OOPIF iframe）的会话
    const target = toDebuggee(tabId, sessionId);
    return await new Promise<T>((resolve, reject) => {
      try {
        chrome.debugger.sendCommand(target, method as never, (params || {}) as never, (result) => {
          const err = chrome.runtime.lastError;
          if (err) {
            // chrome.debugger 的错误有时会把 CDP error JSON 放进 message：{"code":-32000,"message":"Not allowed"}
            const raw = String(err.message || '');
            let details = raw;
            try {
              const parsed = JSON.parse(raw) as { code?: number; message?: string };
              if (parsed && (typeof parsed.code === 'number' || typeof parsed.message === 'string')) {
                details = `${parsed.code ?? ''} ${parsed.message ?? ''}`.trim();
              }
            } catch {
              // keep raw
            }
            return reject(
              new Error(
                `CDP sendCommand failed: ${method} (tabId=${tabId}${sessionId ? `, sessionId=${sessionId}` : ''}): ${details}`,
              ),
            );
          }
          resolve(result as T);
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private async scanStagehandXPathViaCdp(
    tabId: number,
    options: { maxItems: number; selector: string; includeShadow: boolean },
  ): Promise<StagehandXPathScanResponse> {
    // 同一 tabId 只允许一个扫描在飞：避免 attach 冲突（"Another debugger is already attached"）
    // 也避免重复构建 DOM 索引带来的性能浪费。
    const existing = this.stagehandXPathInFlight.get(tabId);
    if (existing) return await existing;

    const promise = this.scanStagehandXPathViaCdpImpl(tabId, options).finally(() => {
      this.stagehandXPathInFlight.delete(tabId);
    });
    this.stagehandXPathInFlight.set(tabId, promise);
    return await promise;
  }

  private async scanStagehandXPathViaCdpImpl(
    tabId: number,
    options: { maxItems: number; selector: string; includeShadow: boolean },
  ): Promise<StagehandXPathScanResponse> {
    const started = Date.now();
    const pierce = Boolean(options.includeShadow);

    const attach = async () => {
      await new Promise<void>((resolve, reject) => {
        try {
          // chrome.debugger.attach 需要 CDP 协议版本号字符串（例如 "1.3"），"0.1" 会报不支持
          chrome.debugger.attach({ tabId }, '1.3', () => {
            const err = chrome.runtime.lastError;
            if (err) return reject(new Error(err.message));
            resolve();
          });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
    };

    const detach = async () => {
      await new Promise<void>((resolve) => {
        try {
          chrome.debugger.detach({ tabId }, () => resolve());
        } catch {
          resolve();
        }
      });
    };

    const sendRoot = async <T = unknown>(method: string, params?: Record<string, unknown>) =>
      await this.sendCdp<T>(tabId, undefined, method, params);

    const sendSess = async <T = unknown>(sessionId: string, method: string, params?: Record<string, unknown>) =>
      await this.sendCdp<T>(tabId, sessionId, method, params);

    type AttachedTarget = { sessionId: string; targetId: string; type: string; url?: string };
    const attached: Map<string, AttachedTarget> = new Map();

    const onEvent = (source: chrome.debugger.Debuggee, method: string, params?: any) => {
      if ((source as any)?.tabId !== tabId) return;
      if (method !== 'Target.attachedToTarget') return;
      // autoAttach + flatten 模式下，每个子 target（比如 OOPIF iframe）都会触发 attachedToTarget，
      // 我们在这里收集 sessionId，后续用它对该子 target 发送 DOM/Page 命令。
      const p = params as { sessionId?: string; targetInfo?: { targetId?: string; type?: string; url?: string } } | undefined;
      const sid = p?.sessionId;
      const ti = p?.targetInfo;
      if (!sid || !ti?.targetId || !ti?.type) return;
      attached.set(sid, { sessionId: sid, targetId: ti.targetId, type: ti.type, url: ti.url });
    };

    try {
      await attach();
      chrome.debugger.onEvent.addListener(onEvent);

      // 一些环境下 Page.* 命令在未 enable 时会返回 Not allowed；先 enable 提高兼容性
      await sendRoot('Page.enable', {}).catch(() => {});

      // bootstrap：对齐 stagehand multiplexer 语义
      // - autoAttach: 自动 attach 新出现的 target（尤其是 OOPIF iframe）
      // - flatten: 让子 target 的命令走 sessionId（便于统一 sendCdp）
      await sendRoot('Target.setAutoAttach', {
        autoAttach: true,
        flatten: true,
        waitForDebuggerOnStart: false,
      });
      // verification 结论：Target.setDiscoverTargets 在 chrome.debugger 下可能直接 Not allowed
      // 低影响：后续我们会通过 Target.getTargets + attachToTarget 补齐已有 targets，并依赖 autoAttach 捕获新 OOPIF
      await sendRoot('Target.setDiscoverTargets', { discover: true }).catch(() => {});

      // 主 frame tree（root session）
      const rootTree = await sendRoot<{ frameTree: any }>('Page.getFrameTree', {});

      // 尝试对“已存在的 iframe target”补 attach（避免只靠新建事件）。
      // 注意：在 chrome.debugger 环境下，CDP Target.getTargets 可能 Not allowed（verification 已记录）。
      // 这里优先尝试 CDP Target.getTargets，失败则 fallback 到扩展 API chrome.debugger.getTargets()。
      const listTargets = async (): Promise<Array<{ targetId?: string; type?: string; url?: string; attached?: boolean }>> => {
        try {
          const t = await sendRoot<{ targetInfos: any[] }>('Target.getTargets', {});
          return Array.isArray(t?.targetInfos) ? (t.targetInfos as any[]) : [];
        } catch {
          // fallback: extension API (does not require CDP Target domain permission)
          const extTargets = await new Promise<chrome.debugger.TargetInfo[]>((resolve) => {
            try {
              chrome.debugger.getTargets((ts) => resolve((ts as chrome.debugger.TargetInfo[]) || []));
            } catch {
              resolve([]);
            }
          });
          return extTargets.map((x) => ({
            targetId: (x as any).id as string | undefined,
            type: (x as any).type as string | undefined,
            url: (x as any).url as string | undefined,
            attached: Boolean((x as any).attached),
          }));
        }
      };

      const targets = await listTargets();
      for (const t of targets) {
        if (t?.type !== 'iframe') continue;
        if (t?.attached === true) continue;
        if (!t?.targetId) continue;
        try {
          // 手动补 attach：让已存在的 iframe 也进入 attached map（否则只靠新创建事件会漏）
          const r = await sendRoot<{ sessionId: string }>('Target.attachToTarget', { targetId: t.targetId, flatten: true });
          if (r?.sessionId) attached.set(r.sessionId, { sessionId: r.sessionId, targetId: t.targetId, type: 'iframe', url: t.url });
        } catch {
          // ignore (Target.attachToTarget may also be restricted in some environments)
        }
      }

      // 构建 frameId -> (OOPIF) sessionId 映射：每个子 session 调一次 Page.getFrameTree，取其 root frame.id
      const frameSessionByFrameId = new Map<string, string>();
      for (const sid of attached.keys()) {
        try {
          await sendSess(sid, 'Page.enable', {}).catch(() => {});
          const ft = await sendSess<{ frameTree: any }>(sid, 'Page.getFrameTree', {});
          const fid = ft?.frameTree?.frame?.id;
          if (typeof fid === 'string' && fid) frameSessionByFrameId.set(fid, sid);
        } catch {
          // ignore child sessions that vanish quickly
        }
      }

      // 合并 frame tree：root + 每个 child session 的 subtree（用于拿到 OOPIF 内部的 nested frames）
      const parentByFrame = new Map<string, string | null>();
      const frames = new Set<string>();

      const indexTree = (node: any, parent: string | null) => {
        const id = node?.frame?.id;
        if (typeof id !== 'string' || !id) return;
        parentByFrame.set(id, parent);
        frames.add(id);
        for (const c of node?.childFrames || []) indexTree(c, id);
      };
      indexTree(rootTree?.frameTree, null);

      for (const [fid, sid] of frameSessionByFrameId.entries()) {
        try {
          const ft = await sendSess<{ frameTree: any }>(sid, 'Page.getFrameTree', {});
          // 该 tree 的根就是 fid；其 childFrames 的 parent 就是 fid
          for (const c of ft?.frameTree?.childFrames || []) indexTree(c, fid);
        } catch {
          // ignore
        }
      }

      const rootFrameId = rootTree?.frameTree?.frame?.id as string | undefined;
      if (!rootFrameId) return { ok: false, error: 'Page.getFrameTree missing root frame id' };

      const resolveOwnerSessionId = (frameId: string): string | undefined => {
        // “frameId 属于哪个 session？”：
        // - OOPIF 的根 frameId 会直接出现在 frameSessionByFrameId
        // - nested frame 可能属于 OOPIF 内部，沿 parentByFrame 往上爬，找到最近的 OOPIF 根
        if (frameSessionByFrameId.has(frameId)) return frameSessionByFrameId.get(frameId);
        let cur: string | null | undefined = parentByFrame.get(frameId);
        while (cur) {
          const sid = frameSessionByFrameId.get(cur);
          if (sid) return sid;
          cur = parentByFrame.get(cur);
        }
        return undefined; // root session
      };

      // 构建 per-session DOM index
      const sessionIndex = new Map<string, SessionDomIndex>();
      const getIndex = async (sid: string | undefined): Promise<SessionDomIndex> => {
        // SessionDomIndex 是一次性“DOM 快照索引”：
        // - backendNodeId -> 绝对 XPath（absByBe）
        // - 以及 iframe contentDocument 等辅助映射（用于 same-process iframe）
        const key = sid || '__root__';
        const existing = sessionIndex.get(key);
        if (existing) return existing;
        const idx = await buildSessionDomIndex(
          async (method, params) => await this.sendCdp(tabId, sid, method, params),
          pierce,
        );
        sessionIndex.set(key, idx);
        return idx;
      };

      await getIndex(undefined);
      for (const sid of new Set(frameSessionByFrameId.values())) await getIndex(sid);

      // computeFramePrefixes（对齐 stagehand：在 parent session 上 DOM.getFrameOwner(childFrameId) 找到 iframe 宿主）
      const absPrefixByFrame = new Map<string, string>();
      absPrefixByFrame.set(rootFrameId, '');

      const computeAbsPrefix = async (frameId: string): Promise<string> => {
        // 目标：算出某个 frame 的“宿主 iframe”在父文档中的绝对 XPath。
        // 后续把子 frame 内部的元素 xpath 变成：prefix + (body 内相对 xpath)。
        const existing = absPrefixByFrame.get(frameId);
        if (existing != null) return existing;

        const parentId = parentByFrame.get(frameId);
        if (!parentId) {
          absPrefixByFrame.set(frameId, '');
          return '';
        }

        const parentPrefix = await computeAbsPrefix(parentId);
        const parentSid = resolveOwnerSessionId(parentId);
        const parentIdx = await getIndex(parentSid);

        try {
          const owner = await this.sendCdp<{ backendNodeId?: number }>(tabId, parentSid, 'DOM.getFrameOwner', { frameId });
          const be = owner?.backendNodeId;
          if (typeof be === 'number') {
            const xp = parentIdx.absByBe.get(be);
            if (xp) {
              absPrefixByFrame.set(frameId, xp);
              return xp;
            }
          }
        } catch {
          // ignore
        }

        // OOPIF / race / missing mapping → inherit parent prefix（与 stagehand 测试一致）
        absPrefixByFrame.set(frameId, parentPrefix);
        return parentPrefix;
      };

      for (const fid of frames) {
        if (fid === rootFrameId) continue;
        await computeAbsPrefix(fid);
      }

      // 扫描每个 frame：querySelectorAll + describeNode -> backendNodeId
      const items: StagehandXPathItem[] = [];
      let framesScanned = 0;

      // 稳定顺序：root 先，再按 frames 插入顺序
      const orderedFrames = [rootFrameId, ...Array.from(frames).filter((x) => x !== rootFrameId)];

      for (const fid of orderedFrames) {
        if (items.length >= options.maxItems) break;
        framesScanned++;

        const sid = resolveOwnerSessionId(fid);
        const idx = await getIndex(sid);

        // 获取该 frame 的 document nodeId：
        // - root/OOPIF：用 sessionIndex.rootNodeId
        // - same-process child frame：通过 parent session 的 DOM.getFrameOwner 找到 iframe backend，再用 contentDocument backend -> nodeId
        let docNodeId = idx.rootNodeId;
        if (sid === undefined && fid !== rootFrameId) {
          // same-process child frame lives in parent session（root）；用 root session index 的 contentDocRootByIframeBe 来定位 doc root
          const parentId = parentByFrame.get(fid);
          const parentSid = parentId ? resolveOwnerSessionId(parentId) : undefined;
          const parentIdx = await getIndex(parentSid);
          try {
            const owner = await this.sendCdp<{ backendNodeId?: number }>(tabId, parentSid, 'DOM.getFrameOwner', { frameId: fid });
            const iframeBe = owner?.backendNodeId;
            if (typeof iframeBe === 'number') {
              const docBe = parentIdx.contentDocRootByIframeBe.get(iframeBe);
              if (typeof docBe === 'number') {
                const nid = parentIdx.nodeIdByBe.get(docBe);
                if (typeof nid === 'number') docNodeId = nid;
              }
            }
          } catch {
            // ignore
          }
        }

        // 计算 frame body 的绝对 xpath，用于把 child frame 的 /html/body 前缀裁掉
        const bodyAbs = await queryBodyAbsXPath(async (m, p) => await this.sendCdp(tabId, sid, m, p), docNodeId, idx);

        const pairs = await querySelectorAllBackendIds(
          async (m, p) => await this.sendCdp(tabId, sid, m, p),
          docNodeId,
          options.selector,
          options.maxItems - items.length,
        );

        const absPrefix = absPrefixByFrame.get(fid) || '';

        for (const { backendNodeId, node } of pairs) {
          if (items.length >= options.maxItems) break;

          // root frame：保持现有“绝对 xpath”输出（不裁掉 /html/body）
          // child frame：输出形如 `${iframeXpath}${relXpathWithinBody}`，避免把每层 frame 的 /html/body 都串上去
          const nodeAbs = idx.absByBe.get(backendNodeId) || '/';
          const xpath =
            fid === rootFrameId
              ? nodeAbs
              : mergeFrameXPath(absPrefix, relativizeXPath(bodyAbs, nodeAbs));

          const attrs = Array.isArray(node.attributes) ? node.attributes : [];
          const attr = (k: string): string | undefined => {
            const key = k.toLowerCase();
            for (let i = 0; i + 1 < attrs.length; i += 2) {
              if (String(attrs[i]).toLowerCase() === key) return String(attrs[i + 1]);
            }
            return undefined;
          };

          const tagName = String(node.nodeName || '').toLowerCase();
          const id = attr('id') || undefined;
          const className = attr('class') || undefined;
          const textSnippet =
            attr('aria-label') || attr('title') || attr('alt') || attr('placeholder') || undefined;

          items.push({ xpath, tagName, id, className, textSnippet });
        }
      }

      return {
        ok: true,
        items,
        meta: { totalCandidates: items.length, durationMs: Date.now() - started, framesScanned } as any,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error:
          msg.includes('Cannot attach to this target') || msg.includes('Another debugger is already attached')
            ? `chrome.debugger.attach 失败（可能该 Tab 正在被 DevTools 调试）：${msg}`
            : msg,
      };
    } finally {
      try {
        chrome.debugger.onEvent.removeListener(onEvent);
      } catch {
        // ignore
      }
      // detach 放在 finally：确保即使中途报错，也尽可能释放 debugger 连接，避免影响后续扫描/开发调试。
      await detach();
    }
  }

  // 说明：该类只负责“扫描并生成 XPath”，不再维护页面状态。
}

// 初始化 XPath 扫描管理器
const stagehandXPathManager = new StagehandXPathManager();

// 导出供其他模块使用
export default stagehandXPathManager;
