# Control Verification Endpoints

This directory contains automated verification pages for testing CDP-based browser control features.

## Available Verifications

### Phase 4: Frame/OOPIF
**URL**: `http://localhost:3000/control/verify/phase4`

Tests frame and out-of-process iframe (OOPIF) handling:
- Scenario 1: Same-origin iframe
- Scenario 2: Cross-origin OOPIF (e.g., https://example.com)
- Scenario 3: Nested iframes

**Status**: ✅ Phase 4 completed - OOPIF support verified

### Phase 5: Wait/Stability
**URL**: `http://localhost:3000/control/verify/phase5`

Tests wait conditions and stability detection:
- Scenario 1: Event reception verification
- Scenario 2: Check status API
- Scenario 3: Wait for page load
- Scenario 4: Wait for network idle
- Scenario 5: Wait for stable (combined)
- Scenario 6: Timeout mechanism

**Status**: ✅ Implementation complete - ready for verification

## Prerequisites

1. **Chrome Extension Installed**
   - Extension must be loaded and running
   - Extension ID configured in verification page

2. **Development Server Running**
   ```bash
   pnpm dev
   ```

3. **Environment Variables** (optional)
   ```bash
   CONTROL_EXTENSION_ID=your-extension-id-here
   CONTROL_REPLY_URL=http://localhost:3000/control/callback
   ```

## How to Use

1. Start the development server
2. Open Chrome browser with extension installed
3. Navigate to verification URL
4. Configure `extensionId` and `replyUrl` if needed
5. Click "Run All Scenarios" or individual scenario buttons
6. Review results:
   - ✅ Green = Pass
   - ❌ Red = Fail
   - Check "Detailed Output" for debugging

## Common Issues

### "chrome.runtime missing"
- **Cause**: Page not opened in Chrome browser or extension not installed
- **Fix**: Open page in Chrome with extension loaded

### "SSE connect timeout"
- **Cause**: Extension not responding to stream connection
- **Fix**: Check extension background script, verify extension is active

### "Missing extensionId"
- **Cause**: Extension ID not configured
- **Fix**: Enter extension ID in input field (auto-saved to localStorage)

### Scenarios failing unexpectedly
- **Cause**: Events not being captured or forwarded
- **Fix**: 
  1. Check extension's `chrome.debugger.onEvent` handler
  2. Verify events are POSTed to `/control/events`
  3. Check browser console for errors

## Architecture

```
Verification Page (Browser)
    │
    ├─→ chrome.runtime.sendMessage() → Extension
    │       │
    │       └─→ chrome.debugger.sendCommand() → Target Tab
    │
    └─→ fetch() → Server APIs
            │
            ├─→ /control/stream (SSE)
            ├─→ /control/run (orchestration)
            ├─→ /control/wait (wait conditions)
            ├─→ /control/events (query events)
            └─→ /test-*.html (test pages)
```

## Test Pages

Each verification uses specific test pages:

| Page | URL | Purpose |
|------|-----|---------|
| Same-origin iframe | `/test-iframe.html` | Tests iframe detection |
| Cross-origin OOPIF | `/test-oopif.html` | Tests OOPIF session handling |
| Nested iframes | `/test-nested.html` | Tests nested iframe support |
| Instant load | `/test-instant.html` | Fast loading page |
| Slow load | `/test-slow-load.html` | 2s delayed load event |
| Multi-resource | `/test-multi-resource.html` | 6 images with delays |
| Delayed image | `/slow-image.png?delay=N` | Configurable delay resource |

## Adding New Verifications

To add a new verification endpoint:

1. Create `server/routes/control/verify/phaseN.get.ts`
2. Follow the pattern from phase4 or phase5
3. Include:
   - Input fields for extensionId/replyUrl
   - SSE connection helper
   - Scenario functions
   - Result display
4. Add test pages if needed in `server/routes/test-*.html.get.ts`
5. Update this README

## Related Documentation

- [Phase 4 Verification Doc](../../../../verification/phase4-frame-oopif.md)
- [Phase 5 Verification Doc](../../../../verification/phase5-stability-wait.md)
- [Phase 5 Implementation Summary](../../../../verification/phase5-implementation-summary.md)

