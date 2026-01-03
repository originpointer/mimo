import type { AnySchema, Orama, Results, TypedDocument } from "@orama/orama"

export const skillsSchema = {
  id: "string",
  skillDir: "string",
  path: "string",
  name: "string",
  description: "string",
  body: "string"
} as const satisfies AnySchema

export type SkillsSchema = typeof skillsSchema

export type SkillDoc = {
  id: string
  skillDir: string
  /** 相对路径：${skillDir}/SKILL.md（对外展示用，避免泄露绝对路径） */
  path: string
  name: string
  description: string
  /** 纯文本（从 markdown 提取），用于检索与高亮 */
  body: string
}

export type SkillSearchHit = {
  id: string
  skillDir: string
  path: string
  score: number
  nameHTML: string
  descriptionHTML: string
  snippetHTML: string
}

export type SkillsSearchResult = {
  hits: SkillSearchHit[]
  docsCount: number
  builtAt: number
  skillsDir: string
}

export type SkillsIndex = {
  skillsDir: string
  db: Orama<SkillsSchema>
  docsCount: number
  builtAt: number
}

export type SkillsDocument = TypedDocument<Orama<SkillsSchema>>
export type SkillsSearchResults = Results<SkillsDocument>

export type SkillsIndexService = {
  /** 索引构建的就绪 Promise（可用于启动预热/健康检查） */
  ready: Promise<{ docsCount: number; builtAt: number; skillsDir: string }>
  /** 搜索（返回结构与现有 API 保持一致） */
  search: (q: string, limit?: number) => Promise<SkillsSearchResult>
}


