import { useStorage } from "nitropack/runtime"

type ExtensionConfig = {
  extensionId: string
  extensionName: string
  updatedAt: number
}

const STORAGE_MOUNT = "data"

function getExtensionKey(extensionName: string) {
  return `extension:${extensionName}`
}

export async function setExtensionId(extensionName: string, extensionId: string) {
  const payload: ExtensionConfig = { extensionId, extensionName, updatedAt: Date.now() }
  await useStorage(STORAGE_MOUNT).setItem(getExtensionKey(extensionName), payload)
  return payload
}

export async function getExtensionIdByName(extensionName: string): Promise<ExtensionConfig | null> {
  const value = await useStorage(STORAGE_MOUNT).getItem<ExtensionConfig>(getExtensionKey(extensionName))
  return value ?? null
}

export async function listExtensions(): Promise<ExtensionConfig[]> {
  const storage = useStorage(STORAGE_MOUNT)
  const keys = await storage.getKeys()
  const extensionKeys = keys.filter((key) => key.startsWith("extension:"))
  if (!extensionKeys.length) return []
  const items = await storage.getItems<ExtensionConfig>(extensionKeys)
  return items.map((item) => item?.value).filter((item): item is ExtensionConfig => Boolean(item))
}
