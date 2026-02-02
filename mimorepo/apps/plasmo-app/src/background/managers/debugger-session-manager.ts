export type DebuggerSessionInfo = {
  tabId: number;
  sessionId: string;
  requestId?: string;
  groupId?: number;
  title?: string;
  attachedAt: number;
};

export class DebuggerSessionManager {
  private readonly protocolVersion = '1.3';
  private sessionsByTabId = new Map<number, DebuggerSessionInfo>();

  getSessionByTabId(tabId: number): DebuggerSessionInfo | null {
    return this.sessionsByTabId.get(tabId) ?? null;
  }

  updateSessionInfo(tabId: number, patch: Partial<DebuggerSessionInfo>): void {
    const existing = this.sessionsByTabId.get(tabId);
    if (!existing) return;
    this.sessionsByTabId.set(tabId, { ...existing, ...patch });
  }

  findTabIdBySessionId(sessionId: string): number | null {
    for (const [tabId, info] of this.sessionsByTabId.entries()) {
      if (info.sessionId === sessionId) return tabId;
    }
    return null;
  }

  async attach(params: {
    tabId: number;
    sessionId: string;
    requestId?: string;
    groupId?: number;
    title?: string;
  }): Promise<void> {
    const existing = this.sessionsByTabId.get(params.tabId);
    if (existing) return;

    await chrome.debugger.attach({ tabId: params.tabId }, this.protocolVersion);
    this.sessionsByTabId.set(params.tabId, {
      tabId: params.tabId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      groupId: params.groupId,
      title: params.title,
      attachedAt: Date.now(),
    });

    // Best-effort: enable Page domain to reduce flakiness for later commands.
    try {
      await chrome.debugger.sendCommand({ tabId: params.tabId }, 'Page.enable');
    } catch {
      // Ignore; some commands will still work without it.
    }
  }

  async detach(tabId: number): Promise<void> {
    const existing = this.sessionsByTabId.get(tabId);
    if (!existing) return;

    try {
      await chrome.debugger.detach({ tabId });
    } finally {
      this.sessionsByTabId.delete(tabId);
    }
  }
}

