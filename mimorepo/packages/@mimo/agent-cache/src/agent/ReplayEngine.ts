/**
 * Replay Engine for Agent execution
 * 参考 Stagehand AgentCache 的回放引擎
 */

import type {
    CachedAgentExecution,
    AgentReplayStep,
    AgentResult,
} from './AgentCache.js';

/**
 * Replay options
 */
export interface ReplayOptions {
    /** Timeout for waiting for selectors (ms) */
    waitTimeout?: number;
    /** Skip screenshot steps during replay */
    skipScreenshots?: boolean;
    /** Callback for each step */
    onStep?: (step: AgentReplayStep, index: number) => void | Promise<void>;
    /** Callback for errors */
    onError?: (step: AgentReplayStep, error: Error, index: number) => void | Promise<void>;
    /** Continue on error */
    continueOnError?: boolean;
}

/**
 * Page interface (abstract browser page)
 */
export interface IPage {
    /** Wait for a selector */
    waitForSelector(selector: string, options?: { state?: string; timeout?: number }): Promise<void>;
    /** Click an element */
    click(selector: string, options?: { timeout?: number }): Promise<void>;
    /** Type text into an element */
    type(selector: string, text: string, options?: { delay?: number }): Promise<void>;
    /** Get page URL */
    url(): string;
    /** Navigate to URL */
    goto(url: string, options?: { waitUntil?: string }): Promise<void>;
    /** Take screenshot */
    screenshot(options?: { encoding?: string }): Promise<string | Buffer>;
    /** Evaluate JavaScript */
    evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
    evaluate<Arg, R>(fn: (arg: Arg) => R | Promise<R>, arg: Arg): Promise<R>;
}

/**
 * Agent context for replay
 */
export interface AgentContext {
    /** Browser page */
    page?: IPage;
    /** Additional context */
    [key: string]: any;
}

/**
 * Replay Engine
 */
export class ReplayEngine {
    private defaultOptions: ReplayOptions = {
        waitTimeout: 5000,
        skipScreenshots: false,
        continueOnError: false,
    };

    /**
     * Replay a cached execution
     */
    async replay(
        cached: CachedAgentExecution,
        context: AgentContext = {},
        options?: ReplayOptions
    ): Promise<AgentResult> {
        const opts = { ...this.defaultOptions, ...options };

        // Validate environment
        if (!this.validateEnvironment(cached, context)) {
            throw new Error('Invalid replay environment');
        }

        const result: AgentResult = {
            success: true,
            actions: [],
        };

        // Replay each step
        for (let i = 0; i < cached.steps.length; i++) {
            const step = cached.steps[i];
            if (!step) continue;

            try {
                // Call onStep callback
                if (opts.onStep) {
                    await opts.onStep(step, i);
                }

                // Skip screenshots if configured
                if (opts.skipScreenshots && step.action?.type === 'screenshot') {
                    continue;
                }

                // Execute step
                const stepResult = await this.executeStep(step, context, opts);
                result.actions?.push(stepResult);
            } catch (error) {
                const err = error as Error;

                // Call onError callback
                if (opts.onError) {
                    await opts.onError(step, err, i);
                }

                if (opts.continueOnError) {
                    // Continue with next step
                    result.actions?.push({
                        type: 'error',
                        error: err.message,
                        step: i,
                    });
                } else {
                    // Fail the replay
                    result.success = false;
                    result.error = err.message;
                    return result;
                }
            }
        }

        return result;
    }

    /**
     * Execute a single replay step
     */
    private async executeStep(
        step: AgentReplayStep,
        context: AgentContext,
        options: ReplayOptions
    ): Promise<any> {
        const { action, selector } = step;
        const page = context?.page;

        // Wait for selector if present
        if (selector && page) {
            await this.waitForSelector(page, selector, options.waitTimeout ?? 5000);
        }

        // Execute based on action type
        switch (action?.type) {
            case 'click':
                if (page && selector) {
                    await page.click(selector, { timeout: options.waitTimeout });
                }
                break;

            case 'type':
            case 'fill':
                if (page && selector && action.text) {
                    await page.type(selector, action.text, { delay: 10 });
                }
                break;

            case 'goto':
                if (page && action.url) {
                    await page.goto(action.url, { waitUntil: 'networkidle' });
                }
                break;

            case 'screenshot':
                if (page) {
                    await page.screenshot({ encoding: 'base64' });
                }
                break;

            case 'evaluate':
                if (page && action.code) {
                    const code = String(action.code);
                    // Indirect eval avoids esbuild's "direct-eval" bundler warning.
                    // WARNING: This executes arbitrary JS in the page context — only replay trusted recordings.
                    return await page.evaluate((c) => (0, eval)(c), code);
                }
                break;

            case 'wait':
                if (action.duration) {
                    await new Promise(resolve => setTimeout(resolve, action.duration));
                }
                break;

            default:
                // Custom action - call from context if available
                if (context[action?.type] && typeof context[action.type] === 'function') {
                    return await context[action.type](action, selector);
                }
                break;
        }

        return step.result;
    }

    /**
     * Wait for a selector (self-healing)
     * 参考 Stagehand 的 waitForSelector 自愈功能
     */
    private async waitForSelector(
        page: IPage,
        selector: string,
        timeout: number
    ): Promise<void> {
        try {
            await page.waitForSelector(selector, {
                state: 'attached',
                timeout,
            });
        } catch (err) {
            // Log warning but continue (self-healing)
            console.warn(`waitForSelector timed out for ${selector}, proceeding anyway`);
        }
    }

    /**
     * Validate replay environment
     */
    private validateEnvironment(
        cached: CachedAgentExecution,
        context: AgentContext
    ): boolean {
        // Check if startUrl matches if page is available
        if (cached.startUrl && context?.page) {
            const currentUrl = context.page.url();
            // Allow for protocol differences and query strings
            const normalizedCached = this.normalizeUrl(cached.startUrl);
            const normalizedCurrent = this.normalizeUrl(currentUrl);
            if (!normalizedCurrent.includes(normalizedCached)) {
                console.warn(`URL mismatch: expected ${cached.startUrl}, got ${currentUrl}`);
            }
        }

        return true;
    }

    /**
     * Normalize URL for comparison
     */
    private normalizeUrl(url: string): string {
        if (!url) return '';
        const parts = url
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/');
        return (parts[0] ?? '').toLowerCase();
    }

    /**
     * Validate if a cached execution can be replayed
     */
    canReplay(cached: CachedAgentExecution, context?: AgentContext): boolean {
        if (!cached.steps || cached.steps.length === 0) {
            return false;
        }

        if (context?.page) {
            // Check if URL is accessible
            try {
                new URL(context.page.url());
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Get summary of replay steps
     */
    getStepsSummary(cached: CachedAgentExecution): {
        total: number;
        byType: Record<string, number>;
        hasScreenshots: boolean;
    } {
        const byType: Record<string, number> = {};
        let hasScreenshots = false;

        for (const step of cached.steps) {
            const type = step.action?.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;

            if (type === 'screenshot') {
                hasScreenshots = true;
            }
        }

        return {
            total: cached.steps.length,
            byType,
            hasScreenshots,
        };
    }
}

/**
 * Default replay engine instance
 */
export const defaultReplayEngine = new ReplayEngine();
