import { useStorage } from "nitropack/runtime"

export type PageSignature = {
  host: string
  pathPattern: string
  titleHash?: string
  domDigestHash: string
  framesSummary?: { frameCount: number; oopifCount: number }
}

export type WorkflowCacheKey = {
  host: string
  pageSignature: PageSignature
  taskSchemaVersion: string
  digestVersion: string
  promptVersion: string
  modelId: string
}

export type XPathValidationItem = {
  xpath: string
  matchedCount: number
  firstTextSnippet?: string
}

export type ValidationSummary = {
  total: number
  okCount: number
  zeroHitCount: number
  multiHitCount: number
  items: XPathValidationItem[]
}

export type JsonResumeXpath = {
  basics?: { xpath: string }
  work?: Array<{ xpath: string }>
  education?: Array<{ xpath: string }>
  projects?: Array<{ xpath: string }>
  skills?: Array<{ xpath: string }>
  summary?: { xpath: string }
}

export type WorkflowCacheEntry = {
  key: WorkflowCacheKey
  xpaths: JsonResumeXpath
  validation: ValidationSummary
  qualityScore?: number
  createdAt: number
  updatedAt: number
  history: Array<{
    at: number
    iteration: number
    action: "pick" | "validate" | "fallback" | "locate" | "stabilize" | "repair"
    note?: string
    delta?: unknown
  }>
}

const STORAGE_MOUNT = "data"

function getWorkflowCacheStorageKey(extensionId: string, cacheId: string) {
  return `workflow-cache:${extensionId}:${cacheId}`
}

export async function getWorkflowCacheEntry(input: {
  extensionId: string
  cacheId: string
}): Promise<WorkflowCacheEntry | null> {
  const key = getWorkflowCacheStorageKey(input.extensionId, input.cacheId)
  const value = await useStorage(STORAGE_MOUNT).getItem<WorkflowCacheEntry>(key)
  return value ?? null
}

export async function putWorkflowCacheEntry(input: {
  extensionId: string
  cacheId: string
  entry: WorkflowCacheEntry
}): Promise<WorkflowCacheEntry> {
  const key = getWorkflowCacheStorageKey(input.extensionId, input.cacheId)
  await useStorage(STORAGE_MOUNT).setItem(key, input.entry)
  return input.entry
}

export async function patchWorkflowCacheEntry(input: {
  extensionId: string
  cacheId: string
  patch: Partial<Pick<WorkflowCacheEntry, "xpaths" | "validation" | "qualityScore" | "updatedAt" | "history">>
}): Promise<WorkflowCacheEntry | null> {
  const storage = useStorage(STORAGE_MOUNT)
  const key = getWorkflowCacheStorageKey(input.extensionId, input.cacheId)
  const existing = await storage.getItem<WorkflowCacheEntry>(key)
  if (!existing) return null

  const next: WorkflowCacheEntry = {
    ...existing,
    ...input.patch,
    updatedAt: typeof input.patch.updatedAt === "number" ? input.patch.updatedAt : Date.now(),
    history: Array.isArray(input.patch.history) ? input.patch.history : existing.history
  }

  await storage.setItem(key, next)
  return next
}

