export function getNitroBaseUrl(): string {
  const raw = String(process.env.NEXT_PUBLIC_NITRO_BASE_URL || "http://localhost:6006")
  return raw.replace(/\/+$/, "")
}

export type ExtensionListItem = {
  extensionName: string
  extensionId: string
  updatedAt: number
}

export async function fetchExtensionList(): Promise<{
  extensions: ExtensionListItem[]
  latest: ExtensionListItem | null
  error?: string
}> {
  const baseUrl = getNitroBaseUrl()
  const url = `${baseUrl}/api/extension/extension-list`
  try {
    const res = await fetch(url, { method: "GET" })
    const json = (await res.json().catch(() => null)) as any
    if (!res.ok || !json?.ok) {
      return { extensions: [], latest: null, error: json?.error || `HTTP ${res.status}` }
    }
    const extensions = Array.isArray(json.extensions) ? (json.extensions as ExtensionListItem[]) : []
    const latest = json.latest ? (json.latest as ExtensionListItem) : null
    return { extensions, latest }
  } catch (e) {
    return { extensions: [], latest: null, error: e instanceof Error ? e.message : String(e) }
  }
}

