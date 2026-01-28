/**
 * Reconnection Manager - Exponential backoff reconnection logic
 *
 * Manages reconnection attempts with increasing delays
 * to avoid overwhelming the server during outages.
 */

import type { Socket } from 'socket.io-client';

export interface ReconnectionConfig {
  /** Enable auto-reconnection */
  enabled?: boolean;
  /** Maximum reconnection attempts (0 = infinite) */
  maxAttempts?: number;
  /** Initial reconnection delay in milliseconds */
  initialDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier (default: 1.5) */
  backoffMultiplier?: number;
  /** Callback on reconnection attempt */
  onAttempt?: (attempt: number, delay: number) => void;
  /** Callback on reconnection success */
  onSuccess?: () => void;
  /** Callback on reconnection failure (max attempts reached) */
  onFailure?: (error: Error) => void;
}

/**
 * Reconnection Manager with exponential backoff
 */
export class ReconnectionManager {
  private config: Required<ReconnectionConfig>;
  private attempts = 0;
  private currentDelay: number;
  private timer?: NodeJS.Timeout;
  private socket: Socket;

  constructor(socket: Socket, config: ReconnectionConfig = {}) {
    this.socket = socket;
    this.currentDelay = config.initialDelay ?? 1000;

    this.config = {
      enabled: config.enabled ?? true,
      maxAttempts: config.maxAttempts ?? 0, // 0 = infinite
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 1.5,
      onAttempt: config.onAttempt ?? (() => {}),
      onSuccess: config.onSuccess ?? (() => {}),
      onFailure: config.onFailure ?? (() => {}),
    };
  }

  /**
   * Schedule reconnection attempt
   */
  schedule(): void {
    if (!this.config.enabled) {
      return;
    }

    // Check max attempts (0 = infinite)
    if (this.config.maxAttempts > 0 && this.attempts >= this.config.maxAttempts) {
      const error = new Error(`Max reconnection attempts (${this.config.maxAttempts}) reached`);
      this.config.onFailure(error);
      return;
    }

    this.attempts++;
    this.config.onAttempt(this.attempts, this.currentDelay);

    this.timer = setTimeout(() => {
      this.socket.connect();
    }, this.currentDelay);

    // Exponential backoff
    this.currentDelay = Math.min(
      this.currentDelay * this.config.backoffMultiplier,
      this.config.maxDelay
    );
  }

  /**
   * Reset reconnection state (called on successful connection)
   */
  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.attempts = 0;
    this.currentDelay = this.config.initialDelay;
    this.config.onSuccess();
  }

  /**
   * Cancel pending reconnection
   */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Get current attempt count
   */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * Get current delay
   */
  getCurrentDelay(): number {
    return this.currentDelay;
  }

  /**
   * Check if reconnection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
