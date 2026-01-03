import { search } from "@orama/orama"
import type { SkillSearchHit, SkillsSearchResult, SkillsSearchResults } from "./types"
import { getSkillsIndex } from "./singleton"
import { highlighter } from "./orama"
import { sanitizeHighlightHTML } from "./text"

export async function searchSkills(q: string, limit = 10): Promise<SkillsSearchResult> {
  const { db, docsCount, builtAt, skillsDir } = await getSkillsIndex()
  const l = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10

  const result = (await search(db, {
    term: q,
    properties: ["name", "description", "body"],
    boost: {
      name: 3,
      description: 2
    },
    limit: l
  })) as SkillsSearchResults

  const hits: SkillSearchHit[] = result.hits.map((hit) => {
    const doc = hit.document
    const nameHTML = sanitizeHighlightHTML(highlighter.highlight(doc.name, q).HTML)
    const descriptionHTML = sanitizeHighlightHTML(highlighter.highlight(doc.description, q).HTML)
    const snippetHTML = sanitizeHighlightHTML(highlighter.highlight(doc.body, q).trim(80))
    return {
      id: doc.id,
      skillDir: doc.skillDir,
      path: doc.path,
      score: hit.score,
      nameHTML,
      descriptionHTML,
      snippetHTML
    }
  })

  return { hits, docsCount, builtAt, skillsDir }
}


