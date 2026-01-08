/**
 * 树格式化工具
 * 
 * 用于可访问性树的格式化输出和子树注入。
 * 参考：Stagehand v3 understudy/a11y/snapshot/treeFormatUtils.ts
 */

import type { A11yNodeInternal } from "./a11yTree"

/**
 * 清理文本中的不可见字符和私有字符
 */
export function cleanText(input: string): string {
  const PUA_START = 0xe000
  const PUA_END = 0xf8ff
  const NBSP = new Set<number>([0x00a0, 0x202f, 0x2007, 0xfeff])

  let out = ""
  let prevSpace = false
  
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    // 跳过私有使用区字符
    if (code >= PUA_START && code <= PUA_END) continue
    // 处理各种空格字符
    if (NBSP.has(code)) {
      if (!prevSpace) {
        out += " "
        prevSpace = true
      }
      continue
    }
    out += input[i]
    prevSpace = input[i] === " "
  }
  
  return out.trim()
}

/**
 * 规范化空白字符
 * 将所有连续空白折叠为单个空格
 */
export function normaliseSpaces(s: string): string {
  let out = ""
  let inWs = false
  
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    const isWs = /\s/.test(ch)
    if (isWs) {
      if (!inWs) {
        out += " "
        inWs = true
      }
    } else {
      out += ch
      inWs = false
    }
  }
  
  return out
}

/**
 * 格式化单个树节点为文本行
 * 输出格式：[encodedId] role: name
 */
export function formatTreeLine(node: A11yNodeInternal, level = 0): string {
  const indent = "  ".repeat(level)
  const labelId = node.encodedId ?? node.nodeId
  const label = `[${labelId}] ${node.role}${node.name ? `: ${cleanText(node.name)}` : ""}`
  
  const kids = node.children?.map((c) => formatTreeLine(c, level + 1)).join("\n") ?? ""
  
  return kids ? `${indent}${label}\n${kids}` : `${indent}${label}`
}

/**
 * 缩进整个文本块
 */
export function indentBlock(block: string, indent: string): string {
  if (!block) return ""
  return block
    .split("\n")
    .map((line) => (line.length ? indent + line : indent + line))
    .join("\n")
}

/**
 * 将子 frame 的大纲注入到父 frame 的 iframe 节点下
 * 
 * @param rootOutline 根 frame 的大纲文本
 * @param idToTree 子 frame 大纲映射 (encodedId -> outline)
 * @returns 合并后的大纲文本
 */
export function injectSubtrees(
  rootOutline: string,
  idToTree: Map<string, string>
): string {
  type Frame = { lines: string[]; i: number }
  const out: string[] = []
  const visited = new Set<string>()
  const stack: Frame[] = [{ lines: rootOutline.split("\n"), i: 0 }]

  while (stack.length) {
    const top = stack[stack.length - 1]!
    if (top.i >= top.lines.length) {
      stack.pop()
      continue
    }

    const raw = top.lines[top.i++]!
    out.push(raw)

    // 提取缩进
    const indent = raw.match(/^(\s*)/)?.[1] ?? ""
    const content = raw.slice(indent.length)

    // 匹配 encodedId
    const m = content.match(/^\[([^\]]+)\]/)
    if (!m) continue

    const encId = m[1]!
    const childOutline = idToTree.get(encId)
    if (!childOutline || visited.has(encId)) continue

    visited.add(encId)

    // 递归注入子树
    const fullyInjectedChild = injectSubtrees(childOutline, idToTree)
    out.push(indentBlock(fullyInjectedChild.trimEnd(), indent + "  "))
  }

  return out.join("\n")
}

/**
 * 比较两个树的差异，返回新增的行
 */
export function diffCombinedTrees(prevTree: string, nextTree: string): string {
  const prevSet = new Set(
    (prevTree || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  )

  const nextLines = (nextTree || "").split("\n")
  const added: string[] = []
  
  for (const line of nextLines) {
    const core = line.trim()
    if (!core) continue
    if (!prevSet.has(core)) added.push(line)
  }

  if (added.length === 0) return ""

  // 计算最小缩进
  let minIndent = Infinity
  for (const l of added) {
    if (!l.trim()) continue
    const m = l.match(/^\s*/)
    const indentLen = m ? m[0]!.length : 0
    if (indentLen < minIndent) minIndent = indentLen
  }
  if (!isFinite(minIndent)) minIndent = 0

  // 移除公共前缀缩进
  const out = added.map((l) =>
    l.length >= minIndent ? l.slice(minIndent) : l
  )
  
  return out.join("\n")
}
