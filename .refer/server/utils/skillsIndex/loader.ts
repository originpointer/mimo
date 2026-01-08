import { readdir, readFile } from "node:fs/promises"
import type { Dirent } from "node:fs"
import path from "node:path"
import type { SkillDoc } from "./types"
import { normalizePlainText } from "./text"

type FrontmatterData = {
  name?: unknown
  description?: unknown
}

/**
 * 解析一个 SKILL.md：读取 frontmatter（YAML）并返回 SkillDoc。
 * 注意：这里暂时用旧版 frontmatter/markdown 逻辑；后续会在 todo 中切到 gray-matter + strip-markdown。
 */
function parseFrontmatterCompat(md: string): { data: Record<string, string>; body: string } {
  // 仅支持文件开头的 YAML frontmatter：---\n...\n---\n
  if (!md.startsWith("---")) return { data: {}, body: md }
  const lines = md.split(/\r?\n/)
  if (lines.length < 3) return { data: {}, body: md }
  if (lines[0].trim() !== "---") return { data: {}, body: md }

  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i
      break
    }
  }
  if (endIdx === -1) return { data: {}, body: md }

  const fmLines = lines.slice(1, endIdx)
  const data: Record<string, string> = {}
  for (const line of fmLines) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let value = m[2] ?? ""
    value = value.replace(/^['"]|['"]$/g, "")
    data[key] = value
  }

  const body = lines.slice(endIdx + 1).join("\n")
  return { data, body }
}

function stripMarkdownCompat(md: string): string {
  let t = md
  // code fences
  t = t.replace(/```[\s\S]*?```/g, " ")
  // inline code
  t = t.replace(/`[^`]*`/g, " ")
  // images / links
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  // html tags
  t = t.replace(/<[^>]+>/g, " ")
  // markdown markers
  t = t.replace(/[#>*_~=-]+/g, " ")
  // normalize whitespace
  t = t.replace(/\s+/g, " ").trim()
  return t
}

export async function loadSkillDocs(skillsDir: string): Promise<SkillDoc[]> {
  // 只扫描一层：SKILLS_DIR/*/SKILL.md
  const entries = (await readdir(skillsDir, { withFileTypes: true })) as Dirent[]
  const dirNames = entries
    .filter((e: Dirent) => e.isDirectory())
    .map((e: Dirent) => e.name)
    .sort((a: string, b: string) => a.localeCompare(b))

  const docs: SkillDoc[] = []
  for (const skillDir of dirNames) {
    const skillPathAbs = path.join(skillsDir, skillDir, "SKILL.md")
    const skillPathRel = `${skillDir}/SKILL.md`
    try {
      const raw = await readFile(skillPathAbs, "utf8")
      const { data, body } = parseFrontmatterCompat(raw)

      const fm = data as unknown as FrontmatterData
      const name = normalizePlainText(typeof fm.name === "string" && fm.name.trim() ? fm.name : skillDir)
      const description = normalizePlainText(typeof fm.description === "string" ? fm.description : "")
      const bodyText = normalizePlainText(stripMarkdownCompat(body))

      docs.push({
        // 稳定 ID：使用目录名，避免 name 改动造成“换文档”或重复冲突
        id: skillDir,
        skillDir,
        path: skillPathRel,
        name,
        description,
        body: bodyText
      })
    } catch {
      // 没有 SKILL.md 就跳过
    }
  }

  return docs
}


