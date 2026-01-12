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

