type ChromeRuntimeLite = {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
  lastError?: { message?: string }
}

export function getExtensionId(): string {
  return String(process.env.NEXT_PUBLIC_PLASMO_EXTENSION_ID || "").trim()
}

function getRuntime(): ChromeRuntimeLite | null {
  const runtime = (globalThis as any)?.chrome?.runtime as ChromeRuntimeLite | undefined
  return runtime && typeof runtime.sendMessage === "function" ? runtime : null
}

export async function sendToExtension<T>(message: unknown, extensionIdOverride?: string): Promise<T> {
  const extensionId = String(extensionIdOverride || getExtensionId() || "").trim()
  if (!extensionId) {
    throw new Error("extensionId 为空，无法连接扩展")
  }
  const runtime = getRuntime()
  if (!runtime) {
    throw new Error("chrome.runtime 不可用：请确认扩展已安装且允许外部消息")
  }

  return await new Promise<T>((resolve, reject) => {
    runtime.sendMessage(extensionId, message, (response: unknown) => {
      const err = runtime.lastError
      if (err?.message) {
        reject(new Error(err.message))
        return
      }
      resolve(response as T)
    })
  })
}

