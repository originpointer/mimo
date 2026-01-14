export const RESUME_XPATH_VALIDATE = "RESUME_XPATH_VALIDATE" as const

export type ResumeXpathValidatePayload = {
  targetTabId?: number
  xpaths: string[]
}

export type ResumeXpathValidateResult = {
  xpath: string
  matchedCount: number
  firstTextSnippet?: string
}

export type ResumeXpathValidateResponse =
  | { ok: true; results: ResumeXpathValidateResult[]; meta?: { durationMs?: number; tabId?: number } }
  | { ok: false; error: string }

