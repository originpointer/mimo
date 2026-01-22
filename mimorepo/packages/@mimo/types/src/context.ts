/**
 * Remote Context Types
 * Types for RemotePage, RemoteLocator, and MimoContext
 */

// Re-export TabInfo from bus to avoid duplication
export type { TabInfo } from './bus.js';

/**
 * Remote response wrapper
 */
export interface RemoteResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

/**
 * Navigate options
 */
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  referer?: string;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Click options
 */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  modifiers?: {
    alt?: boolean;
    control?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}

/**
 * Fill options
 */
export interface FillOptions {
  timeout?: number;
}

/**
 * Locator options
 */
export interface LocatorOptions {
  timeout?: number;
}

/**
 * Evaluate handler type
 */
export type EvaluateHandler<T> = () => T | Promise<T>;

/**
 * Page content response
 */
export interface PageContent {
  html?: string;
  text?: string;
  title?: string;
  url?: string;
}

/**
 * Element info from observe
 */
export interface ElementInfo {
  selector: string;
  text: string;
  attributes: Record<string, string>;
  visible: boolean;
  clickable: boolean;
}

// Action is now exported from core.ts with optional selector
