import client from "@/client"

export type ToolCallResultPayload = {
  taskId: string
  extensionId: string
  toolType: "viewportScreenshot"
  ok: boolean
  dataUrl?: string
  base64?: string
  meta?: unknown
  error?: string
}

export type ToolCallResultResponse = { ok: true; taskId: string } | { ok: false; error: string }

export async function postToolCallResult(payload: ToolCallResultPayload) {
  return client.postJson<ToolCallResultResponse>("/api/tool-call/result", payload)
}
