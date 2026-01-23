/**
 * Mimo - Core class for browser automation
 *
 * Mimo is the main entry point for the Mimo Library.
 * It runs in the Nitro server and communicates with the frontend via MimoBus.
 */

import EventEmitter from 'eventemitter3';
import { CommandType, MimoBus, CoreEvent } from '@mimo/bus';
import { RemotePage, MimoContext } from '@mimo/context';
import { MimoAgent } from '@mimo/agent';
import { LLMProvider } from '@mimo/llm';
import type {
  MimoOptions,
  ActOptions,
  ActResult,
  NavigateOptions,
  NavigateResult,
  ExtractOptions,
  ExtractResult,
  ObserveOptions,
  Action,
  LogLine,
  HistoryEntry,
  MimoMetrics,
} from '@mimo/types';
import {
  MimoInitError,
  MimoTimeoutError,
  MimoNotConnectedError,
  MimoCommandError,
} from './index.js';

/**
 * Mimo - Main class for browser automation
 */
export class Mimo extends EventEmitter {
  private bus: MimoBus;
  private llmProvider: LLMProvider;
  private _context: MimoContext;
  private _page: RemotePage;
  private _history: HistoryEntry[] = [];
  private _metrics: MimoMetrics = {
    actPromptTokens: 0,
    actCompletionTokens: 0,
    actInferenceTimeMs: 0,
    extractPromptTokens: 0,
    extractCompletionTokens: 0,
    extractInferenceTimeMs: 0,
    observePromptTokens: 0,
    observeCompletionTokens: 0,
    observeInferenceTimeMs: 0,
    agentPromptTokens: 0,
    agentCompletionTokens: 0,
    agentInferenceTimeMs: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalInferenceTimeMs: 0,
  };
  private initialized = false;

  constructor(private opts: MimoOptions = {}) {
    super();

    // Create MimoBus
    this.bus = new MimoBus({
      url: opts.socket?.url,
      autoReconnect: opts.socket?.autoReconnect,
      reconnectInterval: opts.socket?.reconnectInterval,
      debug: (opts.verbose ?? 1) >= 2,
    });

    // Create LLM provider
    this.llmProvider = new LLMProvider();

    // Create context
    this._context = new MimoContext((command) => this.sendCommand(command));

    // Create default page
    this._page = new RemotePage(
      (command) => this.sendCommand(command),
      opts.defaultTabId
    );

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize Mimo instance
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.log('warn', 'Mimo', 'Already initialized');
      return;
    }

    try {
      await this.bus.connect();
      this.initialized = true;
      this.log('info', 'Mimo', 'Initialized successfully');
      this.emit(CoreEvent.Initialized);
    } catch (error) {
      throw new MimoInitError(
        `Failed to initialize Mimo: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute browser action
   */
  async act(input: string | Action, options?: ActOptions): Promise<ActResult> {
    this.ensureConnected();

    const startTime = Date.now();
    const commandId = this.generateId();

    try {
      // TODO: Implement AI-based action planning
      // For now, just send simple actions
      const action = typeof input === 'string'
        ? { description: input }
        : input;

      // Send act command
      const response = await this.bus.send({
        id: commandId,
        type: CommandType.PageAct,
        payload: {
          instruction: typeof input === 'string' ? input : input.description,
          action,
          variables: options?.variables,
        },
        options: {
          timeout: options?.timeout ?? this.opts.commandTimeout,
          tabId: options?.tabId ?? this.opts.defaultTabId,
        },
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      const result: ActResult = {
        success: response.success,
        message: response.success ? 'Action completed' : response.error?.message ?? 'Action failed',
        actionDescription: typeof input === 'string' ? input : input.description,
        actions: response.data?.actions ?? [action],
      };

      // Record history
      this.recordHistory({
        method: 'act',
        parameters: { input, options },
        result,
        timestamp: new Date().toISOString(),
        commandId,
        tabId: options?.tabId ?? this.opts.defaultTabId,
      });

      return result;
    } catch (error) {
      throw new MimoCommandError(
        error instanceof Error ? error.message : String(error),
        commandId,
        { input, options }
      );
    }
  }

  /**
   * Navigate browser to a URL
   */
  async navigate(url: string, options?: NavigateOptions): Promise<NavigateResult> {
    this.ensureConnected();

    const startTime = Date.now();
    const commandId = this.generateId();

    try {
      const response = await this.bus.send({
        id: commandId,
        type: CommandType.PageGoto,
        payload: {
          url,
          waitUntil: options?.waitUntil ?? 'load',
          referer: options?.referer,
        },
        options: {
          timeout: options?.timeout ?? this.opts.commandTimeout,
          tabId: options?.tabId ?? this.opts.defaultTabId,
        },
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      const result: NavigateResult = {
        success: response.success,
        message: response.success ? 'Navigated successfully' : response.error?.message ?? 'Navigation failed',
        url,
      };

      // Record history
      this.recordHistory({
        method: 'navigate',
        parameters: { url, options },
        result,
        timestamp: new Date().toISOString(),
        commandId,
        tabId: options?.tabId ?? this.opts.defaultTabId,
      });

      return result;
    } catch (error) {
      throw new MimoCommandError(
        error instanceof Error ? error.message : String(error),
        commandId,
        { url, options }
      );
    }
  }

  /**
   * Extract data from page
   */
  async extract<T>(
    instruction: string,
    schema?: any,
    options?: ExtractOptions
  ): Promise<ExtractResult<T>> {
    this.ensureConnected();

    const startTime = Date.now();
    const commandId = this.generateId();

    try {
      const response = await this.bus.send({
        id: commandId,
        type: CommandType.PageExtract,
        payload: {
          instruction,
          schema: schema?.toString(),
          selector: options?.selector,
        },
        options: {
          timeout: options?.timeout ?? this.opts.commandTimeout,
          tabId: options?.tabId ?? this.opts.defaultTabId,
        },
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      const result: ExtractResult<T> = {
        extraction: response.data?.extraction as T,
        success: response.success,
        message: response.error?.message,
      };

      // Record history
      this.recordHistory({
        method: 'extract',
        parameters: { instruction, schema, options },
        result,
        timestamp: new Date().toISOString(),
        commandId,
        tabId: options?.tabId ?? this.opts.defaultTabId,
      });

      return result;
    } catch (error) {
      throw new MimoCommandError(
        error instanceof Error ? error.message : String(error),
        commandId,
        { instruction, schema, options }
      );
    }
  }

  /**
   * Observe page for actions
   */
  async observe(instruction?: string, options?: ObserveOptions): Promise<Action[]> {
    this.ensureConnected();

    const startTime = Date.now();
    const commandId = this.generateId();

    try {
      const response = await this.bus.send({
        id: commandId,
        type: CommandType.DomObserve,
        payload: {
          instruction,
          selector: options?.selector,
        },
        options: {
          timeout: options?.timeout ?? this.opts.commandTimeout,
          tabId: options?.tabId ?? this.opts.defaultTabId,
        },
        timestamp: Date.now(),
      });

      const actions = response.data?.actions ?? [];

      // Record history
      this.recordHistory({
        method: 'observe',
        parameters: { instruction, options },
        result: { actions },
        timestamp: new Date().toISOString(),
        commandId,
        tabId: options?.tabId ?? this.opts.defaultTabId,
      });

      return actions;
    } catch (error) {
      throw new MimoCommandError(
        error instanceof Error ? error.message : String(error),
        commandId,
        { instruction, options }
      );
    }
  }

  /**
   * Create agent instance
   */
  agent(config?: any): MimoAgent {
    return new MimoAgent(
      this.bus,
      this.llmProvider,
      config ?? {}
    );
  }

  /**
   * Close Mimo instance
   */
  async close(options?: { force?: boolean }): Promise<void> {
    try {
      // Send close command
      if (this.initialized && !options?.force) {
        await this.bus.send({
          id: this.generateId(),
          type: CommandType.BrowserClose,
          payload: {},
          timestamp: Date.now(),
        });
      }

      this.bus.destroy();
      this.initialized = false;
      this.log('info', 'Mimo', 'Closed successfully');
      this.emit(CoreEvent.Closed);
    } catch (error) {
      if (options?.force) {
        this.bus.destroy();
        this.initialized = false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Get MimoBus instance
   */
  getBus(): MimoBus {
    return this.bus;
  }

  /**
   * Get current page
   */
  get page(): RemotePage {
    return this._page;
  }

  /**
   * Get context
   */
  get context(): MimoContext {
    return this._context;
  }

  /**
   * Get metrics
   */
  async metrics(): Promise<MimoMetrics> {
    return this._metrics;
  }

  /**
   * Get history
   */
  async history(): Promise<ReadonlyArray<HistoryEntry>> {
    return this._history;
  }

  /**
   * Get active tab
   */
  async getActiveTab(): Promise<any> {
    this.ensureConnected();
    return this._context.activeTab();
  }

  /**
   * Get all tabs
   */
  async getTabs(): Promise<any> {
    this.ensureConnected();
    return this._context.tabs();
  }

  /**
   * Switch to tab
   */
  async switchToTab(tabId: string): Promise<void> {
    this.ensureConnected();
    await this._context.switchToTab(tabId);
  }

  /**
   * Close tab
   */
  async closeTab(tabId: string): Promise<void> {
    this.ensureConnected();
    await this._context.closeTab(tabId);
  }

  /**
   * Ensure connected
   */
  private ensureConnected(): void {
    if (!this.initialized || !this.bus.isConnected()) {
      throw new MimoNotConnectedError();
    }
  }

  /**
   * Send command through bus
   */
  private async sendCommand(command: any): Promise<any> {
    this.ensureConnected();
    return this.bus.send({
      ...command,
      timestamp: Date.now(),
    });
  }

  /**
   * Setup event forwarding from bus
   */
  private setupEventForwarding(): void {
    this.bus.on(CoreEvent.Connected, () => this.emit(CoreEvent.Connected));
    this.bus.on(CoreEvent.Disconnected, (data) => this.emit(CoreEvent.Disconnected, data));
    this.bus.on(CoreEvent.CommandSent, (data) => this.emit(CoreEvent.CommandSent, data));
    this.bus.on(CoreEvent.CommandResult, (data) => this.emit(CoreEvent.CommandResult, data));
    this.bus.on(CoreEvent.Screenshot, (data) => this.emit(CoreEvent.Screenshot, data));
    this.bus.on(CoreEvent.TabChanged, (data) => this.emit(CoreEvent.TabChanged, data));
    this.bus.on(CoreEvent.TabClosed, (data) => this.emit(CoreEvent.TabClosed, data));
    this.bus.on(CoreEvent.Error, (data) => this.emit(CoreEvent.Error, data));
  }

  /**
   * Record history entry
   */
  private recordHistory(entry: HistoryEntry): void {
    this._history.push(entry);
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string): void {
    const logLine: LogLine = {
      level,
      category,
      message,
      timestamp: new Date().toISOString(),
    };

    if (this.opts.logger) {
      this.opts.logger(logLine);
    } else if ((this.opts.verbose ?? 1) >= (level === 'debug' ? 2 : 1)) {
      console.log(`[${level.toUpperCase()}] ${category}: ${message}`);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mimo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
