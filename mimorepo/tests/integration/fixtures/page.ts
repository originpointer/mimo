import type { IPage } from '@mimo/agent-cache';

type ElementState = {
  id: string;
  tag: string;
  value?: string;
  clicked?: boolean;
};

function parseElementsById(html: string): Map<string, ElementState> {
  const map = new Map<string, ElementState>();
  const re = /<([a-zA-Z0-9-]+)\s+[^>]*id=["']([^"']+)["'][^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = (match[1] ?? '').toLowerCase();
    const id = match[2] ?? '';
    if (!id) continue;
    map.set(id, { id, tag });
  }
  return map;
}

function selectorToId(selector: string): string | null {
  const s = selector.trim();
  if (s.startsWith('#')) return s.slice(1);
  // Minimal support for [id="x"] selectors if needed
  const m = s.match(/\[id=["']([^"']+)["']\]/);
  return m?.[1] ?? null;
}

export function createNodeTestPage(initialUrl?: string): IPage & {
  getState(): { url: string; html: string; elements: Record<string, ElementState> };
} {
  let currentUrl = initialUrl ?? 'about:blank';
  let html = '';
  let elements = new Map<string, ElementState>();

  const page: IPage & {
    getState(): { url: string; html: string; elements: Record<string, ElementState> };
  } = {
    async goto(url: string) {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
      currentUrl = url;
      html = await res.text();
      elements = parseElementsById(html);
    },

    url() {
      return currentUrl;
    },

    async waitForSelector(selector: string, options?: { state?: string; timeout?: number }) {
      const timeout = options?.timeout ?? 5000;
      const endAt = Date.now() + timeout;
      const id = selectorToId(selector);
      if (!id) {
        throw new Error(`Unsupported selector: ${selector}`);
      }
      while (Date.now() < endAt) {
        if (elements.has(id)) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`Timeout waiting for selector: ${selector}`);
    },

    async click(selector: string) {
      const id = selectorToId(selector);
      if (!id) throw new Error(`Unsupported selector: ${selector}`);
      const el = elements.get(id);
      if (!el) throw new Error(`No element for selector: ${selector}`);
      el.clicked = true;
      elements.set(id, el);
    },

    async type(selector: string, text: string) {
      const id = selectorToId(selector);
      if (!id) throw new Error(`Unsupported selector: ${selector}`);
      const el = elements.get(id);
      if (!el) throw new Error(`No element for selector: ${selector}`);
      el.value = (el.value ?? '') + text;
      elements.set(id, el);
    },

    async screenshot(options?: { encoding?: string }) {
      const snapshot = {
        url: currentUrl,
        html,
        elements: Object.fromEntries(elements.entries()),
      };
      const encoded = Buffer.from(JSON.stringify(snapshot), 'utf8').toString('base64');
      if (options?.encoding === 'base64') {
        return encoded;
      }
      return Buffer.from(encoded, 'utf8');
    },

    async evaluate(fn: () => any) {
      return await fn();
    },

    getState() {
      return {
        url: currentUrl,
        html,
        elements: Object.fromEntries(elements.entries()),
      };
    },
  };

  return page;
}

