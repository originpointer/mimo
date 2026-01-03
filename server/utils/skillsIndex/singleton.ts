import type { SkillsIndex } from "./types"
import { resolveSkillsDirFromEnv } from "./config"
import { loadSkillDocs } from "./loader"
import { buildOramaDB } from "./orama"

let indexPromise: Promise<SkillsIndex> | null = null

/**
 * 初始化 skills 索引（单例）。
 *
 * - 设计为 Nitro plugin 可调用：在启动阶段 eager 构建索引
 * - 并发安全：始终复用同一个 Promise，避免重复扫描与重复 build
 * - 缺少 SKILLS_DIR 时同步抛错（便于启动时 fail-fast）
 */
export function initSkillsIndex(): Promise<SkillsIndex> {
  if (!indexPromise) {
    const skillsDir = resolveSkillsDirFromEnv()
    indexPromise = (async () => {
      const docs = await loadSkillDocs(skillsDir)
      if (docs.length === 0) {
        throw new Error(`在 SKILLS_DIR 下未找到任何 */SKILL.md：${skillsDir}`)
      }
      const db = buildOramaDB(docs)
      return {
        skillsDir,
        db,
        docsCount: docs.length,
        builtAt: Date.now()
      }
    })()
  }
  return indexPromise
}

export async function getSkillsIndex(): Promise<SkillsIndex> {
  return initSkillsIndex()
}


