import type { SkillsIndexService } from "./types"
import { initSkillsIndex } from "./singleton"
import { searchSkills } from "./search"

/**
 * 创建 skillsIndex service（用于挂载到 NitroApp 上）。
 *
 * 路由层应通过 `useNitroApp().skillsIndex` 获取，不再直接 import utils。
 */
export function createSkillsIndexService(): SkillsIndexService {
  const ready = initSkillsIndex().then(({ docsCount, builtAt, skillsDir }) => ({ docsCount, builtAt, skillsDir }))
  return {
    ready,
    search: (q: string, limit?: number) => searchSkills(q, limit)
  }
}


