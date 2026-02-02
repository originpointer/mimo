import { describe, expect, it } from 'vitest';

import {
  getExternallyConnectableMatches,
  isCommandUiTabUrl,
  matchExternallyConnectablePattern,
} from '../../../apps/plasmo-app/src/background/utils/command-ui-tab';

describe('command-ui-tab policy (externally_connectable.matches)', () => {
  it('matches localhost command UI pages', () => {
    const matches = ['http://localhost:3000/*'];
    expect(isCommandUiTabUrl('http://localhost:3000/chat/abc', matches)).toBe(true);
    expect(isCommandUiTabUrl('http://localhost:3000/chat/abc?x=1', matches)).toBe(true);
  });

  it('does not match other ports / schemes', () => {
    const matches = ['http://localhost:3000/*', 'http://127.0.0.1:3000/*'];
    expect(isCommandUiTabUrl('http://localhost:3001/chat/abc', matches)).toBe(false);
    expect(isCommandUiTabUrl('https://localhost:3000/chat/abc', matches)).toBe(false);
    expect(isCommandUiTabUrl('http://127.0.0.1:3000/chat/abc', matches)).toBe(true);
  });

  it('supports wildcard scheme', () => {
    expect(matchExternallyConnectablePattern('https://example.com/x', '*://example.com/*')).toBe(true);
    expect(matchExternallyConnectablePattern('http://example.com/x', '*://example.com/*')).toBe(true);
    expect(matchExternallyConnectablePattern('ftp://example.com/x', '*://example.com/*')).toBe(false);
  });

  it('extracts matches from a manifest-like object', () => {
    const manifest = {
      externally_connectable: {
        matches: ['http://localhost:3000/*', 123, null, ''],
      },
    };
    expect(getExternallyConnectableMatches(manifest as any)).toEqual(['http://localhost:3000/*']);
  });
});

