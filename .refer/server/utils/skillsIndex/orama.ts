import { create, insertMultiple } from "@orama/orama"
import { createTokenizer } from "@orama/tokenizers/mandarin"
import { stopwords as mandarinStopwords } from "@orama/stopwords/mandarin"
import { Highlight } from "@orama/highlight"
import type { SkillDoc, SkillsDocument, SkillsIndex } from "./types"
import { skillsSchema as schema } from "./types"

export const highlighter = new Highlight()

export function buildOramaDB(docs: SkillDoc[]): SkillsIndex["db"] {
  const db = create({
    schema: schema,
    components: {
      tokenizer: createTokenizer({
        language: "mandarin",
        stopWords: mandarinStopwords
      })
    }
  })

  // 保持现状：拆分阶段先维持旧行为，后续 todo 再消除断言并让 SkillDoc 与 Orama document 完全对齐
  insertMultiple(db, docs as unknown as SkillsDocument[])
  return db
}


