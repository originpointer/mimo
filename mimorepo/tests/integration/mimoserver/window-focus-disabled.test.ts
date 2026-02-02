import { describe, expect, it } from 'vitest';

import { handleWindowFocus } from '../../../apps/plasmo-app/src/types/window-focus';

describe('WINDOW_FOCUS policy', () => {
  it('is disabled (no focus stealing)', () => {
    let resp: any = null;
    const ok = handleWindowFocus({ type: 'WINDOW_FOCUS', payload: { targetTabId: 123 } }, null as any, (r) => {
      resp = r;
    });

    expect(ok).toBe(true);
    expect(resp?.ok).toBe(false);
    expect(String(resp?.error || '')).toMatch(/disabled/i);
  });
});

