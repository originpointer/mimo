import { describe, expect, it } from 'vitest';

import { inferIntent } from '../../../apps/mimoserver/server/utils/tool-disclosure';

describe('mimoserver/tool-disclosure inferIntent', () => {
  it('treats open+click (CN) as interact (tier1)', () => {
    const input = '使用浏览器打开 https://zustand-demo.pmnd.rs/ 点击页面中按钮6次';
    expect(inferIntent(input)).toBe('interact');
  });

  it('treats open-only as navigate', () => {
    const input = '用浏览器打开 https://zustand-demo.pmnd.rs/';
    expect(inferIntent(input)).toBe('navigate');
  });

  it('treats open+extract as extract (tier2)', () => {
    const input = '打开 https://example.com 然后抽取页面标题';
    expect(inferIntent(input)).toBe('extract');
  });
});

