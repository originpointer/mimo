import type { BionFrontendMessageEnvelope } from './frontend.js';
import type { BionPluginMessage, BionBrowserActionMessage, BionBrowserActionResult, BionBrowserActionResultSuccess } from './plugin.js';

/**
 * Wire formats (partial) as observed in `.reverse`.
 *
 * Important: the wire format is NOT fully snake_case. Only some nested fields are.
 */

type WireBrowserCandidate = {
  client_id: string;
  client_name: string;
  ua: string;
  allow_other_client_id: boolean;
};

type WireBrowserActionMessage = Omit<BionBrowserActionMessage, 'screenshotPresignedUrl' | 'cleanScreenshotPresignedUrl'> & {
  screenshot_presigned_url?: string;
  clean_screenshot_presigned_url?: string;
};

type WireBrowserActionResultSuccess = Omit<
  BionBrowserActionResultSuccess,
  | 'viewportWidth'
  | 'viewportHeight'
  | 'pixelsAbove'
  | 'pixelsBelow'
  | 'newPages'
  | 'fullMarkdown'
  | 'screenshotUploaded'
  | 'cleanScreenshotUploaded'
  | 'cleanScreenshotPath'
> & {
  viewport_width: number;
  viewport_height: number;
  pixels_above: number;
  pixels_below: number;
  new_pages: unknown[];
  full_markdown: string;
  screenshot_uploaded: boolean;
  clean_screenshot_uploaded: boolean;
  clean_screenshot_path?: string;
};

type WireBrowserActionResult = Omit<BionBrowserActionResult, 'result'> & {
  result?: WireBrowserActionResultSuccess;
};

export type WireFrontendMessageEnvelope = Omit<BionFrontendMessageEnvelope, 'event'> & {
  event: any;
};

export type WirePluginMessage = WireBrowserActionMessage | WireBrowserActionResult | any;

export function encodeFrontendEnvelope(envelope: BionFrontendMessageEnvelope): WireFrontendMessageEnvelope {
  // Only handle known snake_case deltas inside some events; leave envelope as camelCase.
  if (envelope?.type !== 'event') return envelope as any;

  const event = envelope.event as any;
  if (event?.type === 'myBrowserSelection') {
    const browserCandidates = event.browserCandidates;
    const connectedBrowser = event.connectedBrowser;
    return {
      ...envelope,
      event: {
        ...event,
        browser_candidates: Array.isArray(browserCandidates)
          ? browserCandidates.map((c: any): WireBrowserCandidate => ({
              client_id: c.clientId,
              client_name: c.clientName,
              ua: c.ua,
              allow_other_client_id: c.allowOtherClientId,
            }))
          : undefined,
        connected_browser: connectedBrowser
          ? ({
              client_id: connectedBrowser.clientId,
              client_name: connectedBrowser.clientName,
              ua: connectedBrowser.ua,
              allow_other_client_id: connectedBrowser.allowOtherClientId,
            } satisfies WireBrowserCandidate)
          : undefined,
        // keep TS-first keys too (optional; helps TS-first clients)
        browserCandidates: undefined,
        connectedBrowser: undefined,
      },
    };
  }

  return envelope as any;
}

export function decodeFrontendEnvelope(input: unknown): BionFrontendMessageEnvelope | null {
  const envelope = input as any;
  if (!envelope || envelope.type !== 'event' || typeof envelope.event !== 'object') return null;

  const event = envelope.event as any;
  if (event?.type === 'myBrowserSelection') {
    const browserCandidates: WireBrowserCandidate[] | undefined = event.browser_candidates;
    const connectedBrowser: WireBrowserCandidate | undefined = event.connected_browser;
    return {
      ...envelope,
      event: {
        ...event,
        browserCandidates: Array.isArray(browserCandidates)
          ? browserCandidates.map((c) => ({
              clientId: c.client_id,
              clientName: c.client_name,
              ua: c.ua,
              allowOtherClientId: c.allow_other_client_id,
            }))
          : undefined,
        connectedBrowser: connectedBrowser
          ? {
              clientId: connectedBrowser.client_id,
              clientName: connectedBrowser.client_name,
              ua: connectedBrowser.ua,
              allowOtherClientId: connectedBrowser.allow_other_client_id,
            }
          : undefined,
      },
    };
  }

  return envelope as BionFrontendMessageEnvelope;
}

export function encodePluginMessage(message: BionPluginMessage): WirePluginMessage {
  const m = message as any;

  if (m?.type === 'browser_action') {
    const encoded: WireBrowserActionMessage = {
      ...m,
      screenshot_presigned_url: m.screenshotPresignedUrl,
      clean_screenshot_presigned_url: m.cleanScreenshotPresignedUrl,
    };
    delete (encoded as any).screenshotPresignedUrl;
    delete (encoded as any).cleanScreenshotPresignedUrl;
    return encoded;
  }

  if (m?.status && typeof m.actionId === 'string') {
    // BrowserActionResult style
    const result = m.result as BionBrowserActionResultSuccess | undefined;
    const encoded: WireBrowserActionResult = {
      ...m,
      result: result
        ? ({
            ...result,
            viewport_width: result.viewportWidth,
            viewport_height: result.viewportHeight,
            pixels_above: result.pixelsAbove,
            pixels_below: result.pixelsBelow,
            new_pages: result.newPages,
            full_markdown: result.fullMarkdown,
            screenshot_uploaded: result.screenshotUploaded,
            clean_screenshot_uploaded: result.cleanScreenshotUploaded,
            clean_screenshot_path: result.cleanScreenshotPath,
          } satisfies WireBrowserActionResultSuccess)
        : undefined,
    };

    if (encoded.result) {
      delete (encoded.result as any).viewportWidth;
      delete (encoded.result as any).viewportHeight;
      delete (encoded.result as any).pixelsAbove;
      delete (encoded.result as any).pixelsBelow;
      delete (encoded.result as any).newPages;
      delete (encoded.result as any).fullMarkdown;
      delete (encoded.result as any).screenshotUploaded;
      delete (encoded.result as any).cleanScreenshotUploaded;
      delete (encoded.result as any).cleanScreenshotPath;
    }

    return encoded;
  }

  return message as any;
}

export function decodePluginMessage(input: unknown): BionPluginMessage | null {
  const m = input as any;
  if (!m || typeof m !== 'object') return null;

  if (m.type === 'browser_action') {
    const decoded: BionBrowserActionMessage = {
      ...m,
      screenshotPresignedUrl: m.screenshotPresignedUrl ?? m.screenshot_presigned_url,
      cleanScreenshotPresignedUrl: m.cleanScreenshotPresignedUrl ?? m.clean_screenshot_presigned_url,
    };
    delete (decoded as any).screenshot_presigned_url;
    delete (decoded as any).clean_screenshot_presigned_url;
    return decoded;
  }

  // BrowserActionResult does not always include a `type` field on wire.
  if (typeof m.status === 'string' && typeof m.actionId === 'string') {
    const result = m.result as WireBrowserActionResultSuccess | undefined;
    const decoded: BionBrowserActionResult = {
      ...m,
      result: result
        ? {
            ...result,
            viewportWidth: result.viewport_width,
            viewportHeight: result.viewport_height,
            pixelsAbove: result.pixels_above,
            pixelsBelow: result.pixels_below,
            newPages: result.new_pages,
            fullMarkdown: result.full_markdown,
            screenshotUploaded: result.screenshot_uploaded,
            cleanScreenshotUploaded: result.clean_screenshot_uploaded,
            cleanScreenshotPath: result.clean_screenshot_path,
          }
        : undefined,
    };

    if (decoded.result) {
      delete (decoded.result as any).viewport_width;
      delete (decoded.result as any).viewport_height;
      delete (decoded.result as any).pixels_above;
      delete (decoded.result as any).pixels_below;
      delete (decoded.result as any).new_pages;
      delete (decoded.result as any).full_markdown;
      delete (decoded.result as any).screenshot_uploaded;
      delete (decoded.result as any).clean_screenshot_uploaded;
      delete (decoded.result as any).clean_screenshot_path;
    }

    return decoded;
  }

  if (typeof m.type === 'string') {
    return m as BionPluginMessage;
  }

  return null;
}

