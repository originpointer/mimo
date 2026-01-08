import crypto from "node:crypto"
import { eventHandler, readBody } from "h3"
import { chatCompletions } from "@/utils/llm/openaiCompat"

type PlanBody = {
  goal: string
  page?: { url?: string; title?: string }
  allowActions?: string[]
}

type PlannedAction = {
  actionId: string
  action: "click.selector" | "type.selector" | "click.iframeSelector" | "type.iframeSelector"
  selector?: string
  frameSelector?: string
  text?: string
  wait?: "stable" | "domReady" | "none"
}

function rid(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
}

function stripCodeFences(s: string): string {
  const t = s.trim()
  // ```json ... ```
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return m ? m[1].trim() : t
}

function extractFirstJsonObject(s: string): string | null {
  const text = stripCodeFences(s)
  const start = text.indexOf("{")
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function isAllowedAction(a: string, allow: Set<string>): a is PlannedAction["action"] {
  return allow.has(a)
}

function validateActions(raw: any, allow: Set<string>): { ok: true; actions: PlannedAction[] } | { ok: false; error: string } {
  const actions = raw?.actions
  if (!Array.isArray(actions) || actions.length === 0) return { ok: false, error: "Missing actions[]" }
  const out: PlannedAction[] = []
  for (const item of actions) {
    const action = typeof item?.action === "string" ? item.action : ""
    if (!action || !isAllowedAction(action, allow)) return { ok: false, error: `Action not allowed: ${String(action)}` }
    const wait = item?.wait
    const actionId = typeof item?.actionId === "string" && item.actionId ? item.actionId : rid("a")
    const selector = typeof item?.selector === "string" ? item.selector : undefined
    const frameSelector = typeof item?.frameSelector === "string" ? item.frameSelector : undefined
    const text = typeof item?.text === "string" ? item.text : undefined

    if ((action === "click.selector" || action === "type.selector") && !selector) return { ok: false, error: `Missing selector for ${action}` }
    if ((action === "click.iframeSelector" || action === "type.iframeSelector") && (!selector || !frameSelector))
      return { ok: false, error: `Missing selector/frameSelector for ${action}` }
    if ((action === "type.selector" || action === "type.iframeSelector") && typeof text !== "string")
      return { ok: false, error: `Missing text for ${action}` }

    out.push({
      actionId,
      action,
      selector,
      frameSelector,
      text,
      wait: wait === "stable" || wait === "domReady" || wait === "none" ? wait : undefined
    })
  }
  return { ok: true, actions: out }
}

export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<PlanBody> | null
  const goal = typeof body?.goal === "string" ? body.goal.trim() : ""
  if (!goal) {
    event.node.res.statusCode = 400
    return { ok: false, error: { code: "BAD_REQUEST", message: "Missing body.goal" } }
  }

  const allow = new Set<string>(
    Array.isArray(body?.allowActions) && body!.allowActions!.length
      ? body!.allowActions!.map(String)
      : ["click.selector", "type.selector", "click.iframeSelector", "type.iframeSelector"]
  )

  const baseUrl = process.env.LLM_BASE_URL ?? ""
  const model = process.env.LLM_MODEL ?? ""
  const apiKey = process.env.LLM_API_KEY ?? "sk-xxx"
  if (!baseUrl || !model) {
    event.node.res.statusCode = 500
    return { ok: false, error: { code: "LLM_CONFIG", message: "Missing env LLM_BASE_URL or LLM_MODEL" } }
  }

  const taskId = rid("tsk10")
  const pageUrl = typeof body?.page?.url === "string" ? body.page.url : ""
  const pageTitle = typeof body?.page?.title === "string" ? body.page.title : ""

  const system = [
    "You are a planner that outputs ONLY strict JSON.",
    "No markdown, no code fences, no extra text.",
    "Return a single JSON object: {\"actions\":[...]}",
    "Allowed actions: click.selector, type.selector, click.iframeSelector, type.iframeSelector",
    "Each action item schema:",
    "- actionId: string (optional)",
    "- action: one of allowed actions (required)",
    "- selector: string (required for *.selector and *.iframeSelector)",
    "- frameSelector: string (required for *.iframeSelector)",
    "- text: string (required for type.*)",
    "- wait: one of stable|domReady|none (optional)",
    "Do not include secrets (cookies/tokens/passwords)."
  ].join("\n")

  const user = [
    `Goal: ${goal}`,
    pageUrl ? `PageURL: ${pageUrl}` : "",
    pageTitle ? `PageTitle: ${pageTitle}` : "",
    "Target page is a deterministic test page with:",
    "- Button selector: #btn",
    "- Input selector: #input",
    "Prefer click #btn first, then type into #input."
  ]
    .filter(Boolean)
    .join("\n")

  const llm = await chatCompletions({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0,
    timeoutMs: 60_000
  })

  if (!llm.ok) {
    event.node.res.statusCode = 502
    return { ok: false, error: { code: llm.code, message: llm.message }, taskId }
  }

  const jsonText = extractFirstJsonObject(llm.content) ?? stripCodeFences(llm.content)
  let parsed: any = null
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    event.node.res.statusCode = 502
    return {
      ok: false,
      taskId,
      error: { code: "LLM_BAD_OUTPUT", message: "LLM output is not valid JSON" },
      raw: { content: llm.content.slice(0, 2000) }
    }
  }

  const v = validateActions(parsed, allow)
  if (!v.ok) {
    event.node.res.statusCode = 502
    return {
      ok: false,
      taskId,
      error: { code: "LLM_BAD_OUTPUT", message: v.error },
      raw: { content: llm.content.slice(0, 2000), parsed }
    }
  }

  return { ok: true, taskId, actions: v.actions }
})


