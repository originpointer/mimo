import { prefixXPath } from "@repo/sens/src/utils/stagehand-xpath"

type Debuggee = chrome.debugger.Debuggee & { tabId: number; sessionId?: string }

type CdpSend = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

type DomNode = {
  nodeId?: number
  backendNodeId?: number
  nodeType: number
  nodeName: string
  children?: DomNode[]
  shadowRoots?: DomNode[]
  contentDocument?: DomNode
  attributes?: string[]
  childNodeCount?: number
}

const DOM_DEPTH_ATTEMPTS = [-1, 256, 128, 64, 32, 16, 8, 4, 2, 1]
const DESCRIBE_DEPTH_ATTEMPTS = [-1, 64, 32, 16, 8, 4, 2, 1]

function isCborStackError(message: string): boolean {
  return message.includes("CBOR: stack limit exceeded")
}

function shouldExpandNode(node: DomNode): boolean {
  const declaredChildren = node.childNodeCount ?? 0
  const realizedChildren = node.children?.length ?? 0
  return declaredChildren > realizedChildren
}

function mergeDomNodes(target: DomNode, source: DomNode): void {
  target.childNodeCount = source.childNodeCount ?? target.childNodeCount
  target.children = source.children ?? target.children
  target.shadowRoots = source.shadowRoots ?? target.shadowRoots
  target.contentDocument = source.contentDocument ?? target.contentDocument
}

function collectDomTraversalTargets(node: DomNode): DomNode[] {
  const targets: DomNode[] = []
  if (node.children) targets.push(...node.children)
  if (node.shadowRoots) targets.push(...node.shadowRoots)
  if (node.contentDocument) targets.push(node.contentDocument)
  return targets
}

async function hydrateDomTree(send: CdpSend, root: DomNode, pierce: boolean): Promise<void> {
  const stack: DomNode[] = [root]
  const expandedNodeIds = new Set<number>()
  const expandedBackendIds = new Set<number>()

  while (stack.length) {
    const node = stack.pop()!
    const nodeId = typeof node.nodeId === "number" && node.nodeId > 0 ? node.nodeId : undefined
    const backendId =
      typeof node.backendNodeId === "number" && node.backendNodeId > 0 ? node.backendNodeId : undefined

    const seenByNode = nodeId ? expandedNodeIds.has(nodeId) : false
    const seenByBackend = !nodeId && backendId ? expandedBackendIds.has(backendId) : false
    if (seenByNode || seenByBackend) continue
    if (nodeId) expandedNodeIds.add(nodeId)
    else if (backendId) expandedBackendIds.add(backendId)

    const needsExpansion = shouldExpandNode(node)
    if (needsExpansion && (nodeId || backendId)) {
      const describeParamsBase = nodeId ? { nodeId } : { backendNodeId: backendId! }
      let expanded = false

      for (const depth of DESCRIBE_DEPTH_ATTEMPTS) {
        try {
          const described = await send<{ node: DomNode }>("DOM.describeNode", {
            ...describeParamsBase,
            depth,
            pierce
          })
          mergeDomNodes(node, described.node)
          if (!nodeId && described.node.nodeId && described.node.nodeId > 0) {
            node.nodeId = described.node.nodeId
            expandedNodeIds.add(described.node.nodeId)
          }
          expanded = true
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (isCborStackError(message)) continue
          throw err
        }
      }

      if (!expanded) {
        throw new Error("Unable to expand DOM node after describeNode depth retries")
      }
    }

    // 对齐 stagehand 的跨 iframe 能力：确保 iframe 节点的 contentDocument 可用。
    // 在某些 DOM.getDocument(depth fallback) 场景下，iframe 的 contentDocument 可能不会被包含，
    // 但后续我们又会在该 frame 的 document 上 querySelectorAll，这会导致 backendNodeId 无法在 absByBe 中命中，
    // 最终 xpath 退化成只返回 iframe 前缀（你看到的 `/.../iframe[1]`）。
    const nodeNameUpper = String(node.nodeName || "").toUpperCase()
    const isIFrameEl = node.nodeType === 1 && (nodeNameUpper === "IFRAME" || nodeNameUpper === "FRAME")
    if (isIFrameEl && !node.contentDocument && (nodeId || backendId)) {
      const describeParamsBase = nodeId ? { nodeId } : { backendNodeId: backendId! }
      try {
        const described = await send<{ node: DomNode }>("DOM.describeNode", {
          ...describeParamsBase,
          depth: 2,
          pierce
        })
        mergeDomNodes(node, described.node)
        if (!nodeId && described.node.nodeId && described.node.nodeId > 0) {
          node.nodeId = described.node.nodeId
          expandedNodeIds.add(described.node.nodeId)
        }
      } catch {
        // ignore: iframe contentDocument might be unavailable for OOPIF in this session
      }
    }

    for (const child of collectDomTraversalTargets(node)) stack.push(child)
  }
}

async function getDomTreeWithFallback(send: CdpSend, pierce: boolean): Promise<DomNode> {
  let lastCborMessage = ""

  for (const depth of DOM_DEPTH_ATTEMPTS) {
    try {
      const { root } = await send<{ root: DomNode }>("DOM.getDocument", { depth, pierce })
      // 对齐 stagehand：索引必须与后续基于 CDP 的查询结果同源且可映射。
      // 实测某些页面即便 depth=-1 也可能返回截断/缺失（尤其是 iframe.contentDocument 或深层 children），
      // 导致 backendNodeId -> absXPath 映射缺失，最终 xpath 退化成只返回 iframe 前缀。
      // 因此这里无条件做一次“按需扩展”的 hydrate（只在 childNodeCount > children.length 时触发 describeNode）。
      await hydrateDomTree(send, root, pierce)
      return root
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isCborStackError(message)) {
        lastCborMessage = message
        continue
      }
      throw err
    }
  }

  throw new Error(
    lastCborMessage
      ? `CDP DOM.getDocument failed after adaptive depth retries: ${lastCborMessage}`
      : "CDP DOM.getDocument failed after adaptive depth retries."
  )
}

async function ensureIFrameContentDocuments(send: CdpSend, root: DomNode, pierce: boolean): Promise<void> {
  // 注意：即便 DOM.getDocument(depth=-1) 成功，也可能缺失 iframe.contentDocument。
  // 为了对齐 stagehand 的“同进程 iframe 走同 session DOM 树”的假设，这里无条件补全。
  const stack: DomNode[] = [root]
  const seen = new Set<number>()

  while (stack.length) {
    const node = stack.pop()!
    const nodeId = typeof node.nodeId === "number" && node.nodeId > 0 ? node.nodeId : undefined
    if (nodeId) {
      if (seen.has(nodeId)) continue
      seen.add(nodeId)
    }

    const nodeNameUpper = String(node.nodeName || "").toUpperCase()
    const isIFrameEl = node.nodeType === 1 && (nodeNameUpper === "IFRAME" || nodeNameUpper === "FRAME")
    if (isIFrameEl && !node.contentDocument && nodeId) {
      try {
        const described = await send<{ node: DomNode }>("DOM.describeNode", { nodeId, depth: 2, pierce })
        mergeDomNodes(node, described.node)
      } catch {
        // ignore: OOPIF iframe in this session has no contentDocument
      }
    }

    if (node.children) for (const c of node.children) stack.push(c)
    if (node.shadowRoots) for (const s of node.shadowRoots) stack.push(s)
    if (node.contentDocument) stack.push(node.contentDocument)
  }
}

function buildChildXPathSegmentsFromDomNodes(kids: ReadonlyArray<DomNode>): string[] {
  // stagehand/sens 规则：按 nodeType+nodeName 分桶计数，1-based
  const segs: string[] = []
  const ctr: Record<string, number> = {}

  for (const child of kids) {
    const tag = String(child?.nodeName ?? "").toLowerCase()
    const key = `${child?.nodeType}:${tag}`
    const idx = (ctr[key] = (ctr[key] ?? 0) + 1)

    if (child?.nodeType === 3) {
      segs.push(`text()[${idx}]`)
      continue
    }
    if (child?.nodeType === 8) {
      segs.push(`comment()[${idx}]`)
      continue
    }

    segs.push(tag.includes(":") ? `*[name()='${tag}'][${idx}]` : `${tag}[${idx}]`)
  }

  return segs
}

function joinXPath(base: string, step: string): string {
  if (step === "//") {
    if (!base || base === "/") return "//"
    return base.endsWith("/") ? `${base}/` : `${base}//`
  }
  if (!base || base === "/") return step ? `/${step}` : "/"
  if (base.endsWith("//")) return `${base}${step}`
  if (!step) return base
  return `${base}/${step}`
}

function normalizeXPath(x?: string): string {
  if (!x) return ""
  let s = x.trim().replace(/^xpath=/i, "")
  if (!s.startsWith("/")) s = "/" + s
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1)
  return s
}

export function relativizeXPath(baseAbs: string, nodeAbs: string): string {
  const base = normalizeXPath(baseAbs)
  const abs = normalizeXPath(nodeAbs)
  if (abs === base) return "/"
  if (abs.startsWith(base)) {
    const tail = abs.slice(base.length)
    if (!tail) return "/"
    return tail.startsWith("/") || tail.startsWith("//") ? tail : `/${tail}`
  }
  if (base === "/") return abs
  return abs
}

export type SessionDomIndex = {
  rootNodeId: number
  rootBackendId: number
  absByBe: Map<number, string>
  nodeIdByBe: Map<number, number>
  tagByBe: Map<number, string>
  contentDocRootByIframeBe: Map<number, number>
}

export async function buildSessionDomIndex(send: CdpSend, pierce: boolean): Promise<SessionDomIndex> {
  await send("DOM.enable").catch(() => {})
  const root = await getDomTreeWithFallback(send, pierce)
  await ensureIFrameContentDocuments(send, root, pierce)

  const absByBe = new Map<number, string>()
  const nodeIdByBe = new Map<number, number>()
  const tagByBe = new Map<number, string>()
  const contentDocRootByIframeBe = new Map<number, number>()

  const rootBackendId = root.backendNodeId
  const rootNodeId = root.nodeId
  if (typeof rootBackendId !== "number" || typeof rootNodeId !== "number") {
    throw new Error("DOM.getDocument returned missing nodeId/backendNodeId")
  }

  type Entry = { node: DomNode; xp: string }
  const stack: Entry[] = [{ node: root, xp: "/" }]

  while (stack.length) {
    const { node, xp } = stack.pop()!
    if (typeof node.backendNodeId === "number") {
      absByBe.set(node.backendNodeId, xp || "/")
      if (typeof node.nodeId === "number") nodeIdByBe.set(node.backendNodeId, node.nodeId)
      tagByBe.set(node.backendNodeId, String(node.nodeName).toLowerCase())
    }

    const kids = node.children ?? []
    if (kids.length) {
      const segs = buildChildXPathSegmentsFromDomNodes(kids)
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i]!
        const step = segs[i]!
        stack.push({ node: child, xp: joinXPath(xp, step) })
      }
    }

    for (const sr of node.shadowRoots ?? []) {
      stack.push({ node: sr, xp: joinXPath(xp, "//") })
    }

    const cd = node.contentDocument
    if (cd && typeof cd.backendNodeId === "number") {
      // contentDocument 的 xpath 继承 iframe 宿主 xpath（对齐 stagehand 的 buildSessionDomIndex）
      if (typeof node.backendNodeId === "number") contentDocRootByIframeBe.set(node.backendNodeId, cd.backendNodeId)
      stack.push({ node: cd, xp })
    }
  }

  return { rootNodeId, rootBackendId, absByBe, nodeIdByBe, tagByBe, contentDocRootByIframeBe }
}

export async function queryBodyAbsXPath(send: CdpSend, docNodeId: number, idx: SessionDomIndex): Promise<string> {
  const hit = await send<{ nodeId?: number }>("DOM.querySelector", { nodeId: docNodeId, selector: "body" })
  const bodyNodeId = hit?.nodeId
  if (typeof bodyNodeId !== "number" || bodyNodeId <= 0) return "/html[1]/body[1]"
  const described = await send<{ node: DomNode }>("DOM.describeNode", { nodeId: bodyNodeId, depth: 0 })
  const be = described?.node?.backendNodeId
  if (typeof be !== "number") return "/html[1]/body[1]"
  return idx.absByBe.get(be) || "/html[1]/body[1]"
}

export async function querySelectorAllBackendIds(
  send: CdpSend,
  docNodeId: number,
  selector: string,
  max: number
): Promise<{ backendNodeId: number; node: DomNode }[]> {
  const out: { backendNodeId: number; node: DomNode }[] = []
  const res = await send<{ nodeIds?: number[] }>("DOM.querySelectorAll", { nodeId: docNodeId, selector })
  const nodeIds = (res?.nodeIds || []).filter((n) => typeof n === "number" && n > 0)

  for (const nodeId of nodeIds) {
    if (out.length >= max) break
    const described = await send<{ node: DomNode }>("DOM.describeNode", { nodeId, depth: 0 })
    const be = described?.node?.backendNodeId
    if (typeof be === "number") out.push({ backendNodeId: be, node: described.node })
  }

  return out
}

export function toDebuggee(tabId: number, sessionId?: string): Debuggee {
  return sessionId ? ({ tabId, sessionId } as Debuggee) : ({ tabId } as Debuggee)
}

export function ensureAbsPrefix(prefix: string | undefined): string {
  const p = String(prefix || "")
  return p === "/" ? "" : p
}

export function mergeFrameXPath(absPrefix: string, localXPath: string): string {
  const p = ensureAbsPrefix(absPrefix)
  if (!p) return localXPath
  return prefixXPath(p, localXPath)
}

