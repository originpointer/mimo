import { eventHandler, readBody } from "h3"
import { createSampleStore } from "../../../lib/sampleStore"
import { isPreflight, setCors } from "../../../lib/http"

type IngestBody = {
  sampleId?: string
  sample: any
}

function makeId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export default eventHandler(async (event) => {
  setCors(event)
  if (isPreflight(event)) return { ok: true }

  const body = (await readBody(event).catch(() => null)) as IngestBody | null
  if (!body || !body.sample) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing body.sample" }
  }

  const sampleId = String(body.sampleId || body.sample?.sampleId || makeId())
  const store = createSampleStore()
  const at = Date.now()

  await store.writeJson(`${sampleId}/sample.json`, { ...body.sample, sampleId, createdAt: body.sample?.createdAt || at })
  await store.appendJsonl(`events.jsonl`, { type: "ingest", sampleId, at })

  return { ok: true, sampleId, samplesDir: store.baseDir }
})

