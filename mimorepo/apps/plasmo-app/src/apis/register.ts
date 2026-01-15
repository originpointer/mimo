import client from "@/client"

export function registerExtensionId(extensionId: string, extensionName: string) {
  return client.postJson("/api/extension/extension-id", { extensionId, extensionName })
}
