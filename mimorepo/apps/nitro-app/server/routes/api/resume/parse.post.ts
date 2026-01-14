import { eventHandler, readBody } from "h3"
import { OllamaOpenAIClient, getOllamaConfigFromEnv } from "../../../lib/ollamaOpenAIClient"
import { createSampleStore } from "../../../lib/sampleStore"
import { buildJsonResumeXpathPrompt, type ResumeSample } from "../../../lib/prompts/jsonresume_xpath"
import { isPreflight, setCors } from "../../../lib/http"

type ParseBody = {
  sample: ResumeSample
}

function extractJson(text: string): any {
  // 允许模型偶尔带 codefence；尽量剥离
  const raw = String(text || "").trim()
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i) || raw.match(/```\s*([\s\S]*?)\s*```/i)
  const content = fenced ? fenced[1] : raw
  return JSON.parse(content)
}

export default eventHandler(async (event) => {
  setCors(event)
  if (isPreflight(event)) return { ok: true }

  const body = (await readBody(event).catch(() => null)) as ParseBody | null
  if (!body?.sample) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing body.sample" }
  }

  const sample = body.sample
  const sampleId = String(sample.sampleId || `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`)
  const store = createSampleStore()
  const at = Date.now()

  // 落盘输入样本
  await store.writeJson(`${sampleId}/sample.json`, { ...sample, sampleId, createdAt: at })

  const { system, user } = buildJsonResumeXpathPrompt({ ...sample, sampleId })
  const client = new OllamaOpenAIClient(getOllamaConfigFromEnv())

  const started = Date.now()
  const llmText = await client.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    { temperature: 0.1 }
  )

  let parsed: any
  try {
    parsed = extractJson(llmText)
  } catch (e) {
    await store.writeJson(`${sampleId}/llm.raw.txt`, llmText)
    await store.appendJsonl(`events.jsonl`, {
      type: "parse_failed",
      sampleId,
      at,
      error: e instanceof Error ? e.message : String(e)
    })
    event.node.res.statusCode = 500
    return { ok: false, error: "LLM output is not valid JSON", sampleId }
  }

  const durationMs = Date.now() - started

  const out = {
    ok: true,
    sampleId,
    jsonResumeXPath: parsed,
    meta: {
      durationMs,
      model: getOllamaConfigFromEnv().model
    }
  }

  await store.writeJson(`${sampleId}/parse.json`, { ...out, raw: llmText })
  await store.appendJsonl(`events.jsonl`, { type: "parse_ok", sampleId, at, durationMs })

  return out
})

