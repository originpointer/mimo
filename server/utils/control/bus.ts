import crypto from "node:crypto"

export type ControlCommandEnvelope = {
  type: "control.command"
  commandId: string
  traceId: string
  issuedAt: number
  ttlMs: number
  target: { extensionId: string; tabId?: number }
  jws: string
}

export type ExecutionCallback = {
  type: "control.callback"
  commandId: string
  traceId: string
  at: number
  status: "ok" | "error"
  result?: unknown
  error?: { message: string; name?: string }
  telemetry?: Record<string, unknown>
}

type PendingCommand = {
  commandId: string
  traceId: string
  expiresAt: number
  callbackToken: string
  state: "pending" | "done"
  lastCallback?: ExecutionCallback
}

type Subscriber = (cmd: ControlCommandEnvelope) => void

class ControlBus {
  private subscribers = new Map<string, Set<Subscriber>>() // extensionId -> subs
  private pending = new Map<string, PendingCommand>() // commandId -> pending

  subscribe(extensionId: string, fn: Subscriber): () => void {
    const set = this.subscribers.get(extensionId) ?? new Set<Subscriber>()
    set.add(fn)
    this.subscribers.set(extensionId, set)
    return () => {
      const current = this.subscribers.get(extensionId)
      if (!current) return
      current.delete(fn)
      if (current.size === 0) this.subscribers.delete(extensionId)
    }
  }

  publish(cmd: ControlCommandEnvelope, pending: Omit<PendingCommand, "state">): void {
    this.pending.set(cmd.commandId, { ...pending, state: "pending" })
    const subs = this.subscribers.get(cmd.target.extensionId)
    if (!subs) return
    for (const fn of subs) {
      try {
        fn(cmd)
      } catch {
        // ignore subscriber errors
      }
    }
  }

  getPending(commandId: string): PendingCommand | null {
    return this.pending.get(commandId) ?? null
  }

  verifyCallbackToken(commandId: string, token: string): { ok: true; pending: PendingCommand } | { ok: false; error: string } {
    const p = this.pending.get(commandId)
    if (!p) return { ok: false, error: "Unknown commandId" }
    if (Date.now() > p.expiresAt) return { ok: false, error: "Command expired" }
    if (p.callbackToken !== token) return { ok: false, error: "Invalid callback token" }
    return { ok: true, pending: p }
  }

  markCallback(cb: ExecutionCallback): void {
    const p = this.pending.get(cb.commandId)
    if (!p) return
    p.state = "done"
    p.lastCallback = cb
    this.pending.set(cb.commandId, p)
  }

  issueIds(): { commandId: string; traceId: string; callbackToken: string } {
    const commandId = `cmd_${crypto.randomBytes(12).toString("hex")}`
    const traceId = `tr_${crypto.randomBytes(12).toString("hex")}`
    const callbackToken = `ct_${crypto.randomBytes(18).toString("hex")}`
    return { commandId, traceId, callbackToken }
  }
}

export const controlBus = new ControlBus()


