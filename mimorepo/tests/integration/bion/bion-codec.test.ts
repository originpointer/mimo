import { describe, expect, it } from 'vitest';

import { decodePluginMessage, encodePluginMessage } from '@bion/protocol';

describe('bion codec', () => {
  it('encodes browser_action screenshot urls to snake_case', () => {
    const wire = encodePluginMessage({
      type: 'browser_action',
      id: 'abc',
      sessionId: 'sess',
      clientId: 'cli',
      timestamp: 1,
      action: { browser_navigate: { url: 'http://example.com' } },
      screenshotPresignedUrl: 's1',
      cleanScreenshotPresignedUrl: 's2',
    });

    expect((wire as any).screenshot_presigned_url).toBe('s1');
    expect((wire as any).clean_screenshot_presigned_url).toBe('s2');
    expect((wire as any).screenshotPresignedUrl).toBeUndefined();
  });

  it('decodes browser_action_result without type field', () => {
    const decoded = decodePluginMessage({
      status: 'success',
      actionId: 'act1',
      result: {
        url: 'u',
        title: 't',
        result: 'ok',
        elements: '',
        markdown: '',
        full_markdown: '',
        viewport_width: 1,
        viewport_height: 2,
        pixels_above: 0,
        pixels_below: 0,
        new_pages: [],
        screenshot_uploaded: true,
        clean_screenshot_uploaded: true,
      },
    });

    expect(decoded).not.toBeNull();
    expect((decoded as any).actionId).toBe('act1');
    expect((decoded as any).result.viewportWidth).toBe(1);
    expect((decoded as any).result.fullMarkdown).toBe('');
  });
});

