import { randomUUID } from "node:crypto"
import { useStorage } from "nitropack/runtime"

export type ToolCallType = "viewportScreenshot"

export type ToolCallTaskStatus = "pending" | "done" | "error"

export type ToolCallTask = {
  taskId: string
  toolType: ToolCallType
  extensionId: string
  targetTabId?: number
  status: ToolCallTaskStatus
  requestedAt: number
  completedAt?: number
  error?: string
  dataUrl?: string
  base64?: string
  meta?: unknown
}

type ToolCallResultInput = {
  taskId: string
  extensionId?: string
  ok: boolean
  dataUrl?: string
  base64?: string
  meta?: unknown
  error?: string
}

const STORAGE_MOUNT = "data"

function getToolCallKey(taskId: string) {
  return `tool-call:${taskId}`
}

export async function createToolCallTask(input: {
  extensionId: string
  toolType: ToolCallType
  targetTabId?: number
}): Promise<ToolCallTask> {
  const taskId = randomUUID()
  const now = Date.now()
  const payload: ToolCallTask = {
    taskId,
    toolType: input.toolType,
    extensionId: input.extensionId,
    targetTabId: input.targetTabId,
    status: "pending",
    requestedAt: now
  }
  await useStorage(STORAGE_MOUNT).setItem(getToolCallKey(taskId), payload)
  return payload
}

export async function getToolCallTask(taskId: string): Promise<ToolCallTask | null> {
  const value = await useStorage(STORAGE_MOUNT).getItem<ToolCallTask>(getToolCallKey(taskId))
  return value ?? null
}

export async function setToolCallResult(input: ToolCallResultInput): Promise<ToolCallTask | null> {
  const storage = useStorage(STORAGE_MOUNT)
  const key = getToolCallKey(input.taskId)
  const existing = await storage.getItem<ToolCallTask>(key)
  if (!existing) return null

  const next: ToolCallTask = {
    ...existing,
    extensionId: input.extensionId || existing.extensionId,
    status: input.ok ? "done" : "error",
    completedAt: Date.now(),
    error: input.ok ? undefined : input.error || "tool-call failed",
    dataUrl: input.ok ? input.dataUrl : undefined,
    base64: input.ok ? input.base64 : undefined,
    meta: input.ok ? input.meta : undefined
  }

  await storage.setItem(key, next)
  return next
}
