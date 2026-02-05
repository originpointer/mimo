import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { join } from "node:path";

export type ExtensionRecord = {
  clientId: string;
  extensionId: string;
  extensionName: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
  socketConnected: boolean;
  lastSeenAt: number;
};

const STORAGE_BASE = join(process.cwd(), ".data", "kv");

// Create a singleton storage instance
let storageInstance: ReturnType<typeof createStorage> | null = null;

async function getStorage() {
  if (!storageInstance) {
    storageInstance = createStorage({
      driver: fsDriver({
        base: STORAGE_BASE,
      }),
    });
  }
  return storageInstance;
}

function keyByClientId(clientId: string) {
  return `extension:client:${clientId}`;
}

export async function saveExtensionRecord(record: ExtensionRecord): Promise<void> {
  const storage = await getStorage();
  await storage.setItem(keyByClientId(record.clientId), record);
}

export async function getExtensionRecord(clientId: string): Promise<ExtensionRecord | null> {
  const storage = await getStorage();
  const value = await storage.getItem<ExtensionRecord>(keyByClientId(clientId));
  return value ?? null;
}

export async function listExtensionRecords(): Promise<ExtensionRecord[]> {
  const storage = await getStorage();
  const keys = await storage.getKeys();
  const extKeys = keys.filter((k: string) => k.startsWith("extension:client:"));
  if (!extKeys.length) return [];
  const items = await storage.getItems<ExtensionRecord>(extKeys);
  return items.map((it: any) => it?.value).filter((it: any): it is ExtensionRecord => Boolean(it));
}
