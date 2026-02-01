import { useStorage } from 'nitropack/runtime';

export type ExtensionNameRecord = {
  extensionId: string;
  extensionName: string;
  updatedAt: number;
};

export type ExtensionIdRecord = {
  extensionId: string;
  extensionName: string;
  clientId?: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
  updatedAt: number;
};

export type ExtensionRegistrationInput = {
  extensionId: string;
  extensionName: string;
  clientId?: string;
  ua?: string;
  version?: string;
  browserName?: string;
  allowOtherClient?: boolean;
};

const STORAGE_MOUNT = 'data';

function keyByName(extensionName: string) {
  return `extension:${extensionName}`;
}

function keyByExtensionId(extensionId: string) {
  return `extensionId:${extensionId}`;
}

export async function setExtensionRegistration(input: ExtensionRegistrationInput): Promise<{
  byName: ExtensionNameRecord;
  byId: ExtensionIdRecord;
}> {
  const storage = useStorage(STORAGE_MOUNT);
  const now = Date.now();

  const byName: ExtensionNameRecord = {
    extensionId: input.extensionId,
    extensionName: input.extensionName,
    updatedAt: now,
  };

  const existingById = await storage.getItem<ExtensionIdRecord>(keyByExtensionId(input.extensionId));
  const byId: ExtensionIdRecord = {
    extensionId: input.extensionId,
    extensionName: input.extensionName,
    // Merge optional meta to avoid clobbering a previously-registered clientId.
    clientId: input.clientId ?? existingById?.clientId,
    ua: input.ua ?? existingById?.ua,
    version: input.version ?? existingById?.version,
    browserName: input.browserName ?? existingById?.browserName,
    allowOtherClient: input.allowOtherClient ?? existingById?.allowOtherClient,
    updatedAt: now,
  };

  await storage.setItem(keyByName(input.extensionName), byName);
  await storage.setItem(keyByExtensionId(input.extensionId), byId);

  return { byName, byId };
}

export async function getExtensionIdByName(extensionName: string): Promise<ExtensionNameRecord | null> {
  const value = await useStorage(STORAGE_MOUNT).getItem<ExtensionNameRecord>(keyByName(extensionName));
  return value ?? null;
}

export async function getExtensionRegistrationById(extensionId: string): Promise<ExtensionIdRecord | null> {
  const value = await useStorage(STORAGE_MOUNT).getItem<ExtensionIdRecord>(keyByExtensionId(extensionId));
  return value ?? null;
}

export async function listExtensionRegistrations(): Promise<ExtensionIdRecord[]> {
  const storage = useStorage(STORAGE_MOUNT);
  const keys = await storage.getKeys();
  const idKeys = keys.filter((k) => k.startsWith('extensionId:'));
  if (!idKeys.length) return [];

  const items = await storage.getItems<ExtensionIdRecord>(idKeys);
  return items.map((it) => it?.value).filter((it): it is ExtensionIdRecord => Boolean(it));
}

