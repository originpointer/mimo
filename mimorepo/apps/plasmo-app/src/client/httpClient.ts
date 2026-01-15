export type HttpResult<T> = {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

export type HttpClientOptions = {
  baseUrl?: string
  defaultHeaders?: Record<string, string>
}

export class HttpClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(options: HttpClientOptions = {}) {
    const envBaseUrl = typeof process !== "undefined" ? process.env.PLASMO_PUBLIC_BASE_URL : undefined
    const rawBaseUrl = options.baseUrl ?? envBaseUrl ?? ""
    this.baseUrl = String(rawBaseUrl).replace(/\/+$/, "")
    this.defaultHeaders = options.defaultHeaders ?? {}

    console.log('process.env.PLASMO_PUBLIC_BASE_URL', process.env.PLASMO_PUBLIC_BASE_URL)

    console.log("HttpClient constructor", this.baseUrl)
  }

  private buildUrl(path: string) {
    if (!path) return this.baseUrl
    if (!this.baseUrl) return path
    return `${this.baseUrl}/${String(path).replace(/^\/+/, "")}`
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<HttpResult<T>> {
    const url = this.buildUrl(path)
    const headers = {
      ...this.defaultHeaders,
      ...(init.headers || {})
    }

    const res = await fetch(url, {
      ...init,
      headers
    })

    const contentType = res.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")

    let data: T | null = null
    let error: string | undefined

    if (isJson) {
      data = (await res.json().catch(() => null)) as T | null
    } else {
      const text = await res.text().catch(() => "")
      data = (text as unknown as T) || null
    }

    if (!res.ok) {
      error = typeof (data as any)?.error === "string" ? (data as any).error : `HTTP ${res.status}`
    }

    return { ok: res.ok, status: res.status, data, error }
  }

  async postJson<T>(path: string, body: unknown, init: RequestInit = {}) {
    return this.request<T>(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(init.headers || {})
      },
      body: JSON.stringify(body),
      ...init
    })
  }
}

export const nitroClient = new HttpClient()
