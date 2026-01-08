/**
 * 将任意文本规范化为“安全纯文本”：去标签、去控制字符、压缩空白。
 * 用途：避免把不可信内容直接喂给 HTML 高亮输出。
 */
export function normalizePlainText(input: string): string {
  let t = String(input ?? "")
  // html tags
  t = t.replace(/<[^>]+>/g, " ")
  // control chars (keep \n for readability, then normalize)
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
  // normalize whitespace
  t = t.replace(/\s+/g, " ").trim()
  return t
}

/**
 * 轻量白名单清理：仅允许 <mark ...> 与 </mark>；其余标签全部转义为纯文本。
 * 由于我们会先把 doc 字段规范化为纯文本，这里主要是双保险。
 */
export function sanitizeHighlightHTML(html: string): string {
  const s = String(html ?? "")
  // split by tags
  return s.replace(/<\/?[^>]+>/g, (tag) => {
    const m = tag.match(/^<\/?\s*mark(\s+[^>]*)?>$/i)
    if (!m) {
      // escape
      return tag
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
    }
    // for <mark ...>, only allow class="orama-highlight" (or single quotes) and no other attrs
    if (/^<\s*\/\s*mark\s*>$/i.test(tag)) return "</mark>"
    // normalize mark open tag
    return '<mark class="orama-highlight">'
  })
}


