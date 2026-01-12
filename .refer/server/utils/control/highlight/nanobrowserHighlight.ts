import type { DriverAdapter } from "../driverAdapter"
import { getNanobrowserBuildDomTreeSource } from "./nanobrowserBuildDomTreeSource"
import { toStagehandAbsXPath } from "./xpathCompat"

export type NanobrowserHighlightItem = {
  highlightIndex: number
  xpath: string
  tagName?: string
  attributes?: Record<string, string | null>
}

export type NanobrowserHighlightRunOptions = {
  showHighlightElements?: boolean
  focusHighlightIndex?: number
  viewportExpansion?: number
  debugMode?: boolean
  startId?: number
  startHighlightIndex?: number
}

function buildRunExpression(source: string, opts: Required<NanobrowserHighlightRunOptions>): string {
  // NOTE: `source` defines window.buildDomTree = (...) => {...}
  // We inject it once and then execute it.
  return `(() => {
    try {
      if (typeof window.buildDomTree !== 'function') {
        ${source}
      }
      const res = window.buildDomTree(${JSON.stringify(opts)});
      const map = res && res.map ? res.map : {};
      const items = [];
      for (const k of Object.keys(map)) {
        const n = map[k];
        if (!n || typeof n !== 'object') continue;
        if (typeof n.highlightIndex !== 'number') continue;
        items.push({
          highlightIndex: n.highlightIndex,
          xpath: n.xpath,
          tagName: n.tagName,
          attributes: n.attributes
        });
      }
      // Sort by highlight index for stable output
      items.sort((a, b) => a.highlightIndex - b.highlightIndex);
      return { ok: true, items };
    } catch (e) {
      return { ok: false, error: (e && e.message) ? e.message : String(e) };
    }
  })()`
}

export async function runNanobrowserHighlight(
  driver: DriverAdapter,
  options?: { sessionId?: string; tabId?: number } & NanobrowserHighlightRunOptions
): Promise<NanobrowserHighlightItem[]> {
  const source = await getNanobrowserBuildDomTreeSource()
  const opts: Required<NanobrowserHighlightRunOptions> = {
    showHighlightElements: options?.showHighlightElements ?? true,
    focusHighlightIndex: options?.focusHighlightIndex ?? -1,
    viewportExpansion: options?.viewportExpansion ?? 0,
    debugMode: options?.debugMode ?? false,
    startId: options?.startId ?? 0,
    startHighlightIndex: options?.startHighlightIndex ?? 0
  }

  const expr = buildRunExpression(source, opts)
  const out = (await driver.evaluate(expr, {
    tabId: options?.tabId,
    sessionId: options?.sessionId,
    returnByValue: true
  })) as { ok: true; items: NanobrowserHighlightItem[] } | { ok: false; error: string } | undefined

  if (!out || (out as { ok?: boolean }).ok !== true) {
    throw new Error(`runNanobrowserHighlight failed: ${(out as { error?: string })?.error ?? "unknown"}`)
  }

  // Normalize xpath into Stagehand-style absolute xpaths
  return out.items.map((it) => ({
    ...it,
    xpath: toStagehandAbsXPath(it.xpath)
  }))
}

export async function clearNanobrowserHighlightOverlays(
  driver: DriverAdapter,
  options?: { sessionId?: string; tabId?: number }
): Promise<{ removed: boolean }> {
  const expr = `(() => {
    try {
      const fns = window._highlightCleanupFunctions;
      if (Array.isArray(fns)) {
        for (const fn of fns) {
          try { if (typeof fn === 'function') fn(); } catch {}
        }
        window._highlightCleanupFunctions = [];
      }
      const id = 'playwright-highlight-container';
      const el = document.getElementById(id);
      if (el) el.remove();
      return { ok: true, removed: true };
    } catch (e) {
      return { ok: false, error: (e && e.message) ? e.message : String(e) };
    }
  })()`
  const out = (await driver.evaluate(expr, {
    tabId: options?.tabId,
    sessionId: options?.sessionId,
    returnByValue: true
  })) as { ok: true; removed: boolean } | { ok: false; error: string } | undefined
  if (!out || (out as { ok?: boolean }).ok !== true) {
    throw new Error(`clearNanobrowserHighlightOverlays failed: ${(out as { error?: string })?.error ?? "unknown"}`)
  }
  return { removed: out.removed }
}

