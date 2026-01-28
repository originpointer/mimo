/**
 * URL Validator Utility
 *
 * Centralizes URL validation logic for determining if a URL is scannable.
 * Extension/internal pages are blocked as they don't allow debugger attach.
 */

export class UrlValidator {
  /**
   * Check if a URL is scannable (allows CDP debugger attachment).
   *
   * Blocked URL patterns:
   * - chrome://, edge:// - Internal browser pages
   * - about: - Internal pages
   * - devtools:// - DevTools pages
   * - chrome-extension://, moz-extension:// - Extension pages
   * - view-source: - Source view pages
   * - file:// - Local file system
   *
   * @param url - The URL to validate
   * @returns true if the URL is scannable, false otherwise
   */
  static isScannableUrl(url: string | undefined): boolean {
    const u = String(url || '');
    if (!u) return false;

    const blockedPrefixes = [
      'chrome://',
      'edge://',
      'about:',
      'devtools://',
      'chrome-extension://',
      'moz-extension://',
      'view-source:',
      'file://',
    ];

    return !blockedPrefixes.some((prefix) => u.startsWith(prefix));
  }

  /**
   * Check if a URL is an HTTP/HTTPS URL.
   *
   * @param url - The URL to validate
   * @returns true if the URL is HTTP or HTTPS, false otherwise
   */
  static isHttpUrl(url: string | undefined): boolean {
    const u = String(url || '').toLowerCase();
    return u.startsWith('http://') || u.startsWith('https://');
  }

  /**
   * Validate URL and return a descriptive error message if invalid.
   *
   * @param url - The URL to validate
   * @returns Object with isValid flag and optional error message
   */
  static validate(url: string | undefined): { isValid: boolean; error?: string } {
    if (!url) {
      return { isValid: false, error: 'URL is empty' };
    }

    if (!UrlValidator.isScannableUrl(url)) {
      return {
        isValid: false,
        error: `URL is not scannable (url=${url}). Please use http/https pages.`,
      };
    }

    return { isValid: true };
  }
}
