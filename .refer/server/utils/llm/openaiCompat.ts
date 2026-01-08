export type OpenAICompatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type ChatCompletionsRequest = {
  baseUrl: string
  apiKey: string
  model: string
  messages: OpenAICompatMessage[]
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export type ChatCompletionsResult =
  | { ok: true; content: string; raw: unknown }
  | { ok: false; code: string; message: string; raw?: unknown }

function normalizeBaseUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, "")
  return b
}

function joinUrl(baseUrl: string, path: string): string {
  const b = normalizeBaseUrl(baseUrl)
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}

export async function chatCompletions(req: ChatCompletionsRequest): Promise<ChatCompletionsResult> {
  const baseUrl = normalizeBaseUrl(req.baseUrl)
  if (!baseUrl) return { ok: false, code: "LLM_CONFIG", message: "Missing baseUrl" }
  if (!req.model) return { ok: false, code: "LLM_CONFIG", message: "Missing model" }

  // baseUrl is expected to be .../v1
  const url = baseUrl.endsWith("/v1") ? joinUrl(baseUrl, "chat/completions") : joinUrl(baseUrl, "v1/chat/completions")

  const controller = new AbortController()
  const timeoutMs = typeof req.timeoutMs === "number" ? req.timeoutMs : 60_000
  const t = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${req.apiKey || "sk-xxx"}`
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: typeof req.temperature === "number" ? req.temperature : 0,
        max_tokens: typeof req.maxTokens === "number" ? req.maxTokens : undefined,
        stream: false
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let json: any = null
    try {
      json = rawText ? JSON.parse(rawText) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const msg = (json?.error?.message as string) || rawText || `HTTP ${res.status}`
      return { ok: false, code: "LLM_HTTP", message: msg, raw: json ?? rawText }
    }

    const content = json?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, code: "LLM_EMPTY", message: "Empty LLM response content", raw: json }
    }

    return { ok: true, content, raw: json }
  } catch (e) {
    const aborted = (e as any)?.name === "AbortError"
    return { ok: false, code: aborted ? "LLM_TIMEOUT" : "LLM_FETCH", message: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(t)
  }
}


