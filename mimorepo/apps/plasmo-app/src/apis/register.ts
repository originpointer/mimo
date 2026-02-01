import client from "@/client"

export type RegisterExtensionMeta = {
  clientId?: string
  ua?: string
  version?: string
  browserName?: string
  allowOtherClient?: boolean
}

export function registerExtensionId(extensionId: string, extensionName: string, meta: RegisterExtensionMeta = {}) {
  return client.postJson("/api/extension/extension-id", { extensionId, extensionName, ...meta })
}
