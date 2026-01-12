/**
 * nanobrowser 的 buildDomTree.js 生成的 xpath 片段（通常无 leading '/'，且同类兄弟只有 1 个时不带 [1]）
 * 这里将其转换为 Stagehand snapshot 风格的绝对 XPath：
 * - 以 '/' 开头
 * - 每一段都带 [n]（没有时补 [1]）
 * - 命名空间标签（含 ':'）转换为 *[name()='tag'][n]
 */

export function toStagehandAbsXPath(nanoXpath: string): string {
  const raw = (nanoXpath ?? "").trim()
  if (!raw) return "/"

  // nanobrowser root body 特例：/body
  if (raw === "/body" || raw === "body") {
    return "/html[1]/body[1]"
  }

  const s = raw.startsWith("/") ? raw.slice(1) : raw
  const parts = s.split("/").filter((p) => p.length > 0)
  const out: string[] = []

  for (const part of parts) {
    // Already has bracket index (e.g. div[2], text()[1], *[name()='x'][1])
    if (/\[[0-9]+\]$/.test(part)) {
      // If namespace segment looks like svg:rect[2] => *[name()='svg:rect'][2]
      const mNs = part.match(/^([^[]+):([^[]+)\[([0-9]+)\]$/)
      if (mNs) {
        out.push(`*[name()='${mNs[1]}:${mNs[2]}'][${mNs[3]}]`)
      } else {
        out.push(part)
      }
      continue
    }

    // Namespace tag: svg:rect => *[name()='svg:rect'][1]
    if (part.includes(":")) {
      out.push(`*[name()='${part}'][1]`)
      continue
    }

    // Normal tag without index => tag[1]
    out.push(`${part}[1]`)
  }

  // nanobrowser 通常会包含 html/body；如果缺少 html 但以 body 开头，补上 html[1]
  if (out[0] === "body[1]") out.unshift("html[1]")

  return "/" + out.join("/")
}

