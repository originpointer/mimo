/**
 * Stagehand 风格 XPath 工具（纯算法，不依赖浏览器 DOM API）。
 *
 * 设计目标：
 * - 适配 CDP 返回的 DOM Node 树（或其最小子集）
 * - 生成稳定的“绝对 XPath 片段(step)”与拼接逻辑
 * - 兼容命名空间标签（例如 svg:rect）
 *
 * 参考实现思路：stagehand v3 `understudy/a11y/snapshot/xpathUtils.ts`
 */

/** CDP DOM Node 的最小结构（仅算法所需字段）。 */
export type CdpDomNodeLike = {
  /** Node.nodeType：1=Element, 3=Text, 8=Comment */
  nodeType: number
  /** Node.nodeName：例如 DIV / #text / svg:rect */
  nodeName: string
}

/**
 * 为同一父节点下的 children 构建每个 child 的 XPath step。
 *
 * 规则：
 * - 对 Element：`tag[n]`（命名空间标签用 `*[name()='tag'][n]`）
 * - 对 Text：`text()[n]`
 * - 对 Comment：`comment()[n]`
 *
 * 注意：计数 key 为 `${nodeType}:${tag}`，即不同 nodeType 分开计数。
 */
export function buildChildXPathSegments(kids: ReadonlyArray<CdpDomNodeLike>): string[] {
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

    // Element / other: treat as element name
    segs.push(tag.includes(":") ? `*[name()='${tag}'][${idx}]` : `${tag}[${idx}]`)
  }

  return segs
}

/**
 * 将两个 XPath 片段拼接为一个（保留 shadow-hop/descendant hop 语义）。
 *
 * 约定：
 * - `step === "//"` 表示“后代跳转/跨边界”，会把 base 变成以 `//` 结尾的形式
 * - 当 base 为根（`/`）时，`"//"` 直接返回 `"//"`
 */
export function joinXPath(base: string, step: string): string {
  if (step === "//") {
    if (!base || base === "/") return "//"
    return base.endsWith("/") ? `${base}/` : `${base}//`
  }

  if (!base || base === "/") return step ? `/${step}` : "/"
  if (base.endsWith("//")) return `${base}${step}`
  if (!step) return base
  return `${base}/${step}`
}

/**
 * Normalize an XPath:
 * - strip `xpath=` prefix
 * - ensure leading '/'
 * - remove trailing '/' (except root)
 */
export function normalizeXPath(x?: string): string {
  if (!x) return ""
  let s = x.trim().replace(/^xpath=/i, "")
  if (!s.startsWith("/")) s = "/" + s
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1)
  return s
}

/**
 * Prefix `child` XPath with an absolute iframe path `parentAbs`.
 *
 * - Treats `/` prefix as no-op.
 * - Preserves descendant hop: if `child` starts with `//`, join with `//`.
 */
export function prefixXPath(parentAbs: string, child: string): string {
  const p = parentAbs === "/" ? "" : parentAbs.replace(/\/$/, "")
  if (!child || child === "/") return p || "/"
  if (child.startsWith("//")) return p ? `${p}//${child.slice(2)}` : `//${child.slice(2)}`
  const c = child.replace(/^\//, "")
  return p ? `${p}/${c}` : `/${c}`
}

/* =============================================================================
 * 以下为浏览器环境下的 DOM XPath 工具函数
 * ============================================================================= */

/** DOM 遍历选项 */
export interface DomXPathTraversalOptions {
  /** 是否包含 Shadow DOM（默认 false） */
  includeShadow?: boolean
  /** 自定义根 XPath（默认 '/html[1]'） */
  rootXPath?: string
}

/**
 * 为单个 DOM 元素生成绝对 XPath（浏览器环境）。
 *
 * 从元素向上遍历至 document，构建完整的 XPath 路径。
 * 支持 Shadow DOM：遇到 shadow root 时会添加 '//' hop。
 *
 * @param element 目标元素
 * @param options 可选配置
 * @returns 绝对 XPath 字符串
 */
export function buildElementXPath(
  element: Element,
  options?: DomXPathTraversalOptions
): string {
  if (!element || element.nodeType !== 1) return ""

  const segments: string[] = []
  let current: Node | null = element

  while (current && current !== document && current !== document.documentElement?.parentNode) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element
      const parent = el.parentNode

      if (!parent) break

      // 检查是否在 Shadow Root 中
      if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE && (parent as ShadowRoot).host) {
        // Shadow DOM 边界，添加 '//' hop
        segments.unshift("//")
        current = (parent as ShadowRoot).host
        continue
      }

      // 计算同类型兄弟节点中的索引
      const siblings = Array.from(parent.childNodes)
      const tag = el.nodeName.toLowerCase()
      let index = 0
      let found = false

      for (const sibling of siblings) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName.toLowerCase() === tag) {
          index++
          if (sibling === el) {
            found = true
            break
          }
        }
      }

      if (!found) index = 1

      // 处理带命名空间的标签
      const step = tag.includes(":") ? `*[name()='${tag}'][${index}]` : `${tag}[${index}]`
      segments.unshift(step)
      current = parent
    } else if (current.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      // Shadow Root
      const sr = current as ShadowRoot
      if (sr.host) {
        segments.unshift("//")
        current = sr.host
      } else {
        break
      }
    } else {
      current = current.parentNode
    }
  }

  // 构建最终路径
  if (segments.length === 0) return ""

  let xpath = ""
  for (const seg of segments) {
    if (seg === "//") {
      xpath = xpath ? `${xpath}//` : "//"
    } else {
      xpath = xpath.endsWith("//") ? `${xpath}${seg}` : xpath ? `${xpath}/${seg}` : `/${seg}`
    }
  }

  return xpath
}

/**
 * 遍历 DOM 树，为每个元素生成 XPath 映射。
 *
 * 使用栈进行深度优先遍历，构建 Element -> XPath 的映射。
 * 可选择性地遍历 Shadow DOM。
 *
 * @param root 遍历起始节点（默认 document.documentElement）
 * @param options 遍历选项
 * @returns Element 到 XPath 的 Map
 */
export function buildDomXPathMap(
  root?: Node,
  options?: DomXPathTraversalOptions
): Map<Element, string> {
  const map = new Map<Element, string>()
  const includeShadow = options?.includeShadow ?? false
  const rootXPath = options?.rootXPath ?? "/html[1]"

  const startNode = root ?? (typeof document !== "undefined" ? document.documentElement : null)
  if (!startNode) return map

  type StackEntry = { node: Node; xp: string }
  const stack: StackEntry[] = [{ node: startNode, xp: rootXPath }]

  while (stack.length) {
    const { node, xp } = stack.pop()!

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      map.set(el, xp)

      // 处理 Shadow DOM
      if (includeShadow) {
        const sr = (el as HTMLElement).shadowRoot
        if (sr) {
          stack.push({ node: sr, xp: joinXPath(xp, "//") })
        }
      }
    }

    // 处理子节点
    const kids = Array.from(node.childNodes || [])
    if (kids.length) {
      const segs = buildChildXPathSegments(
        kids.map((k) => ({ nodeType: k.nodeType, nodeName: k.nodeName }))
      )
      // 逆序入栈以保持 DOM 顺序遍历
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i]!
        const step = segs[i]!
        stack.push({ node: child, xp: joinXPath(xp, step) })
      }
    }
  }

  return map
}

/**
 * 遍历 DOM 树，收集匹配选择器的元素及其 XPath。
 *
 * 这是 content.ts 中扫描逻辑的通用封装版本。
 *
 * @param selector CSS 选择器，用于筛选目标元素
 * @param options 遍历选项
 * @returns 匹配元素的 XPath 信息数组
 */
export function scanDomForXPaths(
  selector: string,
  options?: DomXPathTraversalOptions & {
    /** 最大返回数量（默认 200） */
    maxItems?: number
    /** 可见性过滤函数 */
    isVisible?: (el: Element) => boolean
  }
): Array<{
  xpath: string
  element: Element
  tagName: string
  id?: string
  className?: string
}> {
  const includeShadow = options?.includeShadow ?? false
  const rootXPath = options?.rootXPath ?? "/html[1]"
  const maxItems = options?.maxItems ?? 200
  const isVisible = options?.isVisible ?? (() => true)

  if (typeof document === "undefined") return []

  const root = document.documentElement
  if (!root) return []

  // 收集符合选择器的候选元素
  const candidates = Array.from(document.querySelectorAll(selector)).filter(isVisible)
  const candidateSet = new Set<Element>(candidates)

  const items: Array<{
    xpath: string
    element: Element
    tagName: string
    id?: string
    className?: string
  }> = []

  type StackEntry = { node: Node; xp: string }
  const stack: StackEntry[] = [{ node: root, xp: rootXPath }]

  while (stack.length) {
    const { node, xp } = stack.pop()!

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element

      if (candidateSet.has(el)) {
        items.push({
          xpath: xp,
          element: el,
          tagName: el.tagName.toLowerCase(),
          id: (el as HTMLElement).id || undefined,
          className: (el as HTMLElement).className ? String((el as HTMLElement).className) : undefined,
        })
        if (items.length >= maxItems) break
      }

      if (includeShadow) {
        const sr = (el as HTMLElement).shadowRoot
        if (sr) {
          stack.push({ node: sr, xp: joinXPath(xp, "//") })
        }
      }
    }

    const kids = Array.from(node.childNodes || [])
    if (kids.length) {
      const segs = buildChildXPathSegments(
        kids.map((k) => ({ nodeType: k.nodeType, nodeName: k.nodeName }))
      )
      for (let i = kids.length - 1; i >= 0; i--) {
        const child = kids[i]!
        const step = segs[i]!
        stack.push({ node: child, xp: joinXPath(xp, step) })
      }
    }
  }

  return items
}

/* =============================================================================
 * XPath 到 DOM 逆向查询（浏览器环境）
 * ============================================================================= */

/**
 * 解析 XPath 字符串为步骤数组。
 *
 * 支持：
 * - 普通路径：/html[1]/body[1]/div[2]
 * - 后代选择：//div[1]
 * - 命名空间：*[name()='svg:rect'][1]
 *
 * @param xpath XPath 字符串
 * @returns 解析后的步骤数组
 */
export function parseXPathSteps(xpath: string): Array<{
  axis: "child" | "descendant"
  tag: string
  index: number | null
}> {
  const path = normalizeXPath(xpath)
  if (!path) return []

  const steps: Array<{
    axis: "child" | "descendant"
    tag: string
    index: number | null
  }> = []

  let i = 0
  while (i < path.length) {
    let axis: "child" | "descendant" = "child"

    // 检查轴类型
    if (path.startsWith("//", i)) {
      axis = "descendant"
      i += 2
    } else if (path[i] === "/") {
      axis = "child"
      i += 1
    }

    // 提取步骤内容
    const start = i
    while (i < path.length && path[i] !== "/") i++
    const rawStep = path.slice(start, i).trim()
    if (!rawStep) continue

    // 解析标签名和索引
    // 匹配 tag[n] 或 *[name()='tag'][n] 格式
    const nsMatch = rawStep.match(/^\*\[name\(\)='([^']+)'\](?:\[(\d+)\])?$/u)
    if (nsMatch) {
      const tag = nsMatch[1]!.toLowerCase()
      const index = nsMatch[2] ? Math.max(1, Number(nsMatch[2])) : null
      steps.push({ axis, tag, index })
      continue
    }

    // 普通格式：tag[n] 或 tag
    const match = rawStep.match(/^([^\[]+)(?:\[(\d+)\])?$/u)
    const base = (match?.[1] ?? rawStep).trim().toLowerCase()
    const index = match?.[2] ? Math.max(1, Number(match[2])) : null

    // 跳过 text() 和 comment() 节点
    if (base === "text()" || base === "comment()") continue

    const tag = base === "" ? "*" : base
    steps.push({ axis, tag, index })
  }

  return steps
}

/**
 * 根据 XPath 查找 DOM 元素（支持 Shadow DOM）。
 *
 * 优先使用原生 document.evaluate()，对于包含 Shadow DOM hop 的 XPath
 * 则使用自定义遍历逻辑。
 *
 * @param xpath XPath 字符串
 * @param root 查询根节点（默认 document）
 * @param targetIndex 目标索引，用于多个匹配时选择第 n 个（默认 0）
 * @returns 匹配的元素或 null
 */
export function getElementByXPath(
  xpath: string,
  root?: Node,
  targetIndex = 0
): Element | null {
  const xp = normalizeXPath(xpath)
  if (!xp) return null

  if (typeof document === "undefined") return null

  const contextNode = root ?? document

  // 检查是否包含 Shadow DOM hop（连续的 //）
  // 如果不包含，优先使用原生 XPath
  const hasShadowHop = /\/\/\//.test(xp) || xp.includes("////")

  if (!hasShadowHop && targetIndex === 0) {
    try {
      const result = document.evaluate(
        xp,
        contextNode,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )
      const node = result.singleNodeValue
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        return node as Element
      }
    } catch {
      // XPath 语法错误或不支持，回退到自定义遍历
    }
  }

  // 使用自定义遍历解析
  const elements = getElementsByXPathTraversal(xp, contextNode, targetIndex + 1)
  return elements[targetIndex] ?? null
}

/**
 * 根据 XPath 查找所有匹配的 DOM 元素。
 *
 * @param xpath XPath 字符串
 * @param root 查询根节点（默认 document）
 * @param limit 最大返回数量（默认无限制）
 * @returns 匹配的元素数组
 */
export function getElementsByXPath(
  xpath: string,
  root?: Node,
  limit?: number
): Element[] {
  const xp = normalizeXPath(xpath)
  if (!xp) return []

  if (typeof document === "undefined") return []

  const contextNode = root ?? document
  const maxResults = limit ?? Number.MAX_SAFE_INTEGER

  // 检查是否包含 Shadow DOM hop
  const hasShadowHop = /\/\/\//.test(xp) || xp.includes("////")

  if (!hasShadowHop) {
    try {
      const result = document.evaluate(
        xp,
        contextNode,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      )
      const elements: Element[] = []
      for (let i = 0; i < result.snapshotLength && elements.length < maxResults; i++) {
        const node = result.snapshotItem(i)
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          elements.push(node as Element)
        }
      }
      return elements
    } catch {
      // 回退到自定义遍历
    }
  }

  return getElementsByXPathTraversal(xp, contextNode, maxResults)
}

/**
 * 使用自定义遍历查找 XPath 匹配的元素。
 *
 * 支持跨 Shadow DOM 边界的查询。
 *
 * @internal
 */
function getElementsByXPathTraversal(
  xpath: string,
  contextNode: Node,
  limit: number
): Element[] {
  const steps = parseXPathSteps(xpath)
  if (!steps.length) return []

  /**
   * 获取节点的组合子元素（包括 Shadow DOM）
   */
  const getComposedChildren = (node: Node): Element[] => {
    const out: Element[] = []

    if (node instanceof Document) {
      if (node.documentElement) out.push(node.documentElement)
      return out
    }

    if (node instanceof DocumentFragment) {
      out.push(...Array.from((node as DocumentFragment).children ?? []))
      return out
    }

    if (node instanceof Element) {
      out.push(...Array.from(node.children ?? []))
      // 添加 Shadow Root 的子元素
      const sr = (node as HTMLElement).shadowRoot
      if (sr) out.push(...Array.from(sr.children ?? []))
      return out
    }

    return out
  }

  /**
   * 获取节点的所有后代元素（包括 Shadow DOM）
   */
  const getComposedDescendants = (node: Node): Element[] => {
    const out: Element[] = []
    const seen = new Set<Element>()
    const queue = [...getComposedChildren(node)]

    while (queue.length) {
      const next = queue.shift()
      if (!next || seen.has(next)) continue
      seen.add(next)
      out.push(next)
      queue.push(...getComposedChildren(next))
    }

    return out
  }

  // 开始遍历
  let current: Array<Document | Element | DocumentFragment> = [
    contextNode instanceof Document ? contextNode : document
  ]

  for (const step of steps) {
    const next: Element[] = []
    const seen = new Set<Element>()

    for (const root of current) {
      if (!root) continue

      const pool = step.axis === "child"
        ? getComposedChildren(root)
        : getComposedDescendants(root)

      if (!pool.length) continue

      // 按标签名过滤
      const matches = pool.filter((candidate) => {
        if (!(candidate instanceof Element)) return false
        if (step.tag === "*") return true
        return candidate.localName === step.tag || candidate.tagName.toLowerCase() === step.tag
      })

      if (step.index != null) {
        // 有索引，选择第 n 个
        const idx = step.index - 1
        const chosen = idx >= 0 && idx < matches.length ? matches[idx] : null
        if (chosen && !seen.has(chosen)) {
          seen.add(chosen)
          next.push(chosen)
        }
      } else {
        // 无索引，选择所有匹配
        for (const candidate of matches) {
          if (!seen.has(candidate)) {
            seen.add(candidate)
            next.push(candidate)
          }
        }
      }
    }

    if (!next.length) return []
    current = next
  }

  return (current as Element[]).slice(0, limit)
}
