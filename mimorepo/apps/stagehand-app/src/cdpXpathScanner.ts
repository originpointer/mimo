export type ScanOptions = {
  maxItems: number
  selector: string
  includeShadow: boolean
}

export type XPathItem = {
  xpath: string
  tagName: string
  id?: string
  className?: string
  textSnippet?: string
}

export type XPathScanResult = {
  ok: true
  items: XPathItem[]
  meta: {
    url?: string
    framesScanned: number
    durationMs: number
  }
}

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

      if (!expanded) throw new Error("Unable to expand DOM node after describeNode depth retries")
    }

    for (const child of collectDomTraversalTargets(node)) stack.push(child)
  }
}

async function getDomTreeWithFallback(send: CdpSend, pierce: boolean): Promise<DomNode> {
  let lastCborMessage = ""

  for (const depth of DOM_DEPTH_ATTEMPTS) {
    try {
      const { root } = await send<{ root: DomNode }>("DOM.getDocument", { depth, pierce })
      // 与扩展侧对齐：无条件 hydrate，确保索引覆盖 iframe/contentDocument 的深层节点
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
        // ignore: OOPIF iframe has no contentDocument in this session
      }
    }

    if (node.children) for (const c of node.children) stack.push(c)
    if (node.shadowRoots) for (const s of node.shadowRoots) stack.push(s)
    if (node.contentDocument) stack.push(node.contentDocument)
  }
}

function buildChildXPathSegments(kids: ReadonlyArray<DomNode>): string[] {
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

function relativizeXPath(baseAbs: string, nodeAbs: string): string {
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

function prefixXPath(parentAbs: string, child: string): string {
  const p = parentAbs === "/" ? "" : parentAbs.replace(/\/$/, "")
  if (!child || child === "/") return p || "/"
  if (child.startsWith("//")) return p ? `${p}//${child.slice(2)}` : `//${child.slice(2)}`
  const c = child.replace(/^\//, "")
  return p ? `${p}/${c}` : `/${c}`
}

type SessionDomIndex = {
  rootNodeId: number
  absByBe: Map<number, string>
  nodeIdByBe: Map<number, number>
  contentDocRootByIframeBe: Map<number, number>
}

async function buildSessionDomIndex(send: CdpSend, pierce: boolean): Promise<SessionDomIndex> {
  await send("DOM.enable").catch(() => {})
  const root = await getDomTreeWithFallback(send, pierce)
  await ensureIFrameContentDocuments(send, root, pierce)

  const absByBe = new Map<number, string>()
  const nodeIdByBe = new Map<number, number>()
  const contentDocRootByIframeBe = new Map<number, number>()

  if (typeof root.nodeId !== "number" || typeof root.backendNodeId !== "number") {
    throw new Error("DOM.getDocument returned missing nodeId/backendNodeId")
  }

  type Entry = { node: DomNode; xp: string }
  const stack: Entry[] = [{ node: root, xp: "/" }]

  while (stack.length) {
    const { node, xp } = stack.pop()!
    if (typeof node.backendNodeId === "number") {
      absByBe.set(node.backendNodeId, xp || "/")
      if (typeof node.nodeId === "number") nodeIdByBe.set(node.backendNodeId, node.nodeId)
    }

    const kids = node.children ?? []
    if (kids.length) {
      const segs = buildChildXPathSegments(kids)
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
      if (typeof node.backendNodeId === "number") contentDocRootByIframeBe.set(node.backendNodeId, cd.backendNodeId)
      // 关键：contentDocument 继承 iframe 宿主 xp（与 stagehand 一致）
      stack.push({ node: cd, xp })
    }
  }

  return { rootNodeId: root.nodeId, absByBe, nodeIdByBe, contentDocRootByIframeBe }
}

async function queryBodyAbsXPath(send: CdpSend, docNodeId: number, idx: SessionDomIndex): Promise<string> {
  const hit = await send<{ nodeId?: number }>("DOM.querySelector", { nodeId: docNodeId, selector: "body" })
  const bodyNodeId = hit?.nodeId
  if (typeof bodyNodeId !== "number" || bodyNodeId <= 0) return "/html[1]/body[1]"
  const described = await send<{ node: DomNode }>("DOM.describeNode", { nodeId: bodyNodeId, depth: 0 })
  const be = described?.node?.backendNodeId
  if (typeof be !== "number") return "/html[1]/body[1]"
  return idx.absByBe.get(be) || "/html[1]/body[1]"
}

function attrOf(node: DomNode, k: string): string | undefined {
  const attrs = Array.isArray(node.attributes) ? node.attributes : []
  const key = k.toLowerCase()
  for (let i = 0; i + 1 < attrs.length; i += 2) {
    if (String(attrs[i]).toLowerCase() === key) return String(attrs[i + 1])
  }
  return undefined
}

export async function scanXpathsViaCdp(
  send: CdpSend,
  url: string | undefined,
  options: ScanOptions
): Promise<XPathScanResult> {
  const started = Date.now()
  const pierce = Boolean(options.includeShadow)

  const idx = await buildSessionDomIndex(send, pierce)

  type DocToScan = { docNodeId: number; iframePrefixAbs: string }
  const docs: DocToScan[] = [{ docNodeId: idx.rootNodeId, iframePrefixAbs: "" }]

  // 发现同进程 iframe 的 contentDocument，并作为独立 doc 扫描（前缀为 iframe 宿主 xpath）
  for (const [iframeBe, docBe] of idx.contentDocRootByIframeBe.entries()) {
    const docNodeId = idx.nodeIdByBe.get(docBe)
    if (typeof docNodeId !== "number") continue
    const iframeAbs = idx.absByBe.get(iframeBe)
    if (!iframeAbs) continue
    docs.push({ docNodeId, iframePrefixAbs: iframeAbs })
  }

  const items: XPathItem[] = []

  for (const { docNodeId, iframePrefixAbs } of docs) {
    if (items.length >= options.maxItems) break

    const bodyAbs = iframePrefixAbs ? await queryBodyAbsXPath(send, docNodeId, idx) : "/html[1]/body[1]"
    const res = await send<{ nodeIds?: number[] }>("DOM.querySelectorAll", { nodeId: docNodeId, selector: options.selector })
    const nodeIds = (res?.nodeIds || []).filter((x) => typeof x === "number" && x > 0)

    for (const nodeId of nodeIds) {
      if (items.length >= options.maxItems) break
      const described = await send<{ node: DomNode }>("DOM.describeNode", { nodeId, depth: 0 })
      const node = described?.node
      const be = node?.backendNodeId
      if (typeof be !== "number") continue

      const nodeAbs = idx.absByBe.get(be) || "/"
      const xpath = iframePrefixAbs
        ? prefixXPath(iframePrefixAbs, relativizeXPath(bodyAbs, nodeAbs))
        : nodeAbs

      const tagName = String(node.nodeName || "").toLowerCase()
      const id = attrOf(node, "id") || undefined
      const className = attrOf(node, "class") || undefined
      const textSnippet =
        attrOf(node, "aria-label") ||
        attrOf(node, "title") ||
        attrOf(node, "alt") ||
        attrOf(node, "placeholder") ||
        undefined

      items.push({ xpath, tagName, id, className, textSnippet })
    }
  }

  return {
    ok: true,
    items,
    meta: {
      url,
      framesScanned: docs.length,
      durationMs: Date.now() - started
    }
  }
}

