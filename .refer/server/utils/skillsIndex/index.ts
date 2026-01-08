export type {
  SkillDoc,
  SkillSearchHit,
  SkillsSearchResult,
  SkillsIndexService,
  SkillsIndex,
  SkillsSchema,
  SkillsDocument,
  SkillsSearchResults
} from "./types"

export { skillsSchema } from "./types"

export { resolveSkillsDirFromEnv } from "./config"
export { normalizePlainText, sanitizeHighlightHTML } from "./text"
export { loadSkillDocs } from "./loader"
export { buildOramaDB, highlighter } from "./orama"
export { initSkillsIndex, getSkillsIndex } from "./singleton"
export { searchSkills } from "./search"
export { createSkillsIndexService } from "./service"


