import { eventHandler, readBody } from "h3"
import { createSampleStore } from "../../../lib/sampleStore"

type FeedbackBody = {
  sampleId: string
  feedback: any
}

export default eventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as FeedbackBody | null
  if (!body?.sampleId || !body?.feedback) {
    event.node.res.statusCode = 400
    return { ok: false, error: "missing sampleId/feedback" }
  }

  const sampleId = String(body.sampleId)
  const store = createSampleStore()
  const at = Date.now()

  await store.writeJson(`${sampleId}/feedback-${at}.json`, body.feedback)
  await store.appendJsonl(`events.jsonl`, { type: "feedback", sampleId, at })

  return { ok: true, sampleId }
})

