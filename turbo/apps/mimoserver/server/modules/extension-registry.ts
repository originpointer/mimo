import type { Socket } from "socket.io";
import { saveExtensionRecord, type ExtensionRecord, listExtensionRecords, getExtensionRecord } from "@/stores/extensionStore";

export type ExtensionRegistrationInput = {
  extensionId: string;
  extensionName: string;
  clientId: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
};

export class ExtensionRegistry {
  private readonly sockets = new Map<string, Socket>();
  private readonly taskSelection = new Map<string, string>();

  async register(input: ExtensionRegistrationInput, socket?: Socket): Promise<ExtensionRecord> {
    const record: ExtensionRecord = {
      clientId: input.clientId,
      extensionId: input.extensionId,
      extensionName: input.extensionName,
      ua: input.ua,
      version: input.version,
      browserName: input.browserName,
      allowOtherClient: input.allowOtherClient,
      socketConnected: Boolean(socket),
      lastSeenAt: Date.now(),
    };

    if (socket) this.sockets.set(input.clientId, socket);
    await saveExtensionRecord(record);
    return record;
  }

  async markOfflineBySocket(socketId: string): Promise<void> {
    for (const [clientId, socket] of this.sockets.entries()) {
      if (socket.id !== socketId) continue;
      this.sockets.delete(clientId);
      const existing = await getExtensionRecord(clientId);
      if (existing) {
        await saveExtensionRecord({ ...existing, socketConnected: false, lastSeenAt: Date.now() });
      }
    }
  }

  getSocket(clientId: string): Socket | undefined {
    return this.sockets.get(clientId);
  }

  async listExtensions(): Promise<ExtensionRecord[]> {
    const items = await listExtensionRecords();
    return items.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  selectClientForTask(taskId: string, clientId: string) {
    this.taskSelection.set(taskId, clientId);
  }

  getSelectedClient(taskId: string): string | null {
    return this.taskSelection.get(taskId) ?? null;
  }

  getAutoSelectedClient(): string | null {
    for (const [clientId] of this.sockets.entries()) {
      return clientId;
    }
    return null;
  }
}
