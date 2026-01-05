import crypto from "node:crypto"

export type ControlCommandEnvelope = {
  type: "control.command"
  commandId: string
  traceId: string
  issuedAt: number
  ttlMs: number
  target: { extensionId: string; tabId?: number; sessionId?: string }
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
  private waiters = new Map<string, Set<(cb: ExecutionCallback) => void>>() // commandId -> resolvers

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

    const ws = this.waiters.get(cb.commandId)
    if (ws) {
      for (const resolve of ws) {
        try {
          resolve(cb)
        } catch {
          // ignore
        }
      }
      this.waiters.delete(cb.commandId)
    }
  }

  waitForCallback(commandId: string, timeoutMs: number): Promise<ExecutionCallback | null> {
    const existing = this.pending.get(commandId)
    if (existing?.lastCallback) return Promise.resolve(existing.lastCallback)

    return new Promise<ExecutionCallback | null>((resolve) => {
      const set = this.waiters.get(commandId) ?? new Set<(cb: ExecutionCallback) => void>()
      let done = false

      const cleanup = () => {
        const current = this.waiters.get(commandId)
        if (!current) return
        current.delete(resolver)
        if (current.size === 0) this.waiters.delete(commandId)
      }

      const resolver = (cb: ExecutionCallback) => {
        if (done) return
        done = true
        clearTimeout(t)
        cleanup()
        resolve(cb)
      }

      set.add(resolver)
      this.waiters.set(commandId, set)

      const t = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        resolve(null) // 超时返回 null 而不是 reject
      }, Math.max(1, timeoutMs))
    })
  }

  issueIds(): { commandId: string; traceId: string; callbackToken: string } {
    const commandId = `cmd_${crypto.randomBytes(12).toString("hex")}`
    const traceId = `tr_${crypto.randomBytes(12).toString("hex")}`
    const callbackToken = `ct_${crypto.randomBytes(18).toString("hex")}`
    return { commandId, traceId, callbackToken }
  }
}

export const controlBus = new ControlBus()


