export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type OpenAIChatCompletionsRequest = {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  max_tokens?: number
}

export type OpenAIChatCompletionsResponse = {
  id?: string
  choices?: Array<{ index?: number; message?: { role?: string; content?: string } }>
  error?: { message?: string }
}

export type OllamaOpenAIClientOptions = {
  baseUrl: string // e.g. http://10.31.1.6:30001/v1
  apiKey: string // local ollama can be dummy
  model: string
  timeoutMs?: number
  retries?: number
}

function joinUrl(baseUrl: string, path: string): string {
  const b = baseUrl.replace(/\/+$/, "")
  const p = path.replace(/^\/+/, "")
  return `${b}/${p}`
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("aborted") || msg.includes("AbortError")) {
      throw new Error(`LLM request timed out after ${timeoutMs}ms (aborted). Consider increasing LLM_TIMEOUT_MS.`)
    }
    throw e
  } finally {
    clearTimeout(id)
  }
}

export class OllamaOpenAIClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly model: string
  private readonly timeoutMs: number
  private readonly retries: number

  constructor(opts: OllamaOpenAIClientOptions) {
    this.baseUrl = opts.baseUrl
    this.apiKey = opts.apiKey
    this.model = opts.model
    this.timeoutMs = typeof opts.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 180_000
    this.retries = typeof opts.retries === "number" && opts.retries >= 0 ? Math.floor(opts.retries) : 1
  }

  public async chat(messages: OpenAIChatMessage[], params?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const url = joinUrl(this.baseUrl, "/chat/completions")
    const payload: OpenAIChatCompletionsRequest = {
      model: this.model,
      messages,
      temperature: params?.temperature,
      max_tokens: params?.maxTokens
    }

    let lastErr: unknown = null
    for (let i = 0; i <= this.retries; i++) {
      try {
        const resp = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${this.apiKey || "sk-local"}`
            },
            body: JSON.stringify(payload)
          },
          this.timeoutMs
        )

        const json = (await resp.json().catch(() => null)) as OpenAIChatCompletionsResponse | null
        if (!resp.ok) {
          const msg = json?.error?.message || `HTTP ${resp.status}`
          throw new Error(msg)
        }
        const content = json?.choices?.[0]?.message?.content
        if (!content) throw new Error("Empty LLM response")
        return content
      } catch (e) {
        lastErr = e
      }
    }
    throw (lastErr instanceof Error ? lastErr : new Error(String(lastErr))) as Error
  }
}

export function getOllamaConfigFromEnv(): OllamaOpenAIClientOptions {
  const baseUrl = process.env.LLM_BASE_URL || "http://127.0.0.1:11434/v1"
  const apiKey = process.env.LLM_API_KEY || "sk-local"
  const model = process.env.LLM_MODEL || "qwen3"
  const timeoutMs = process.env.LLM_TIMEOUT_MS ? Number(process.env.LLM_TIMEOUT_MS) : 180_000
  const retries = process.env.LLM_RETRIES ? Number(process.env.LLM_RETRIES) : 1
  return { baseUrl, apiKey, model, timeoutMs, retries }
}

