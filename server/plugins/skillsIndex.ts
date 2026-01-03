import { defineNitroPlugin } from "nitropack/runtime"
import { createSkillsIndexService } from "@/utils/skillsIndex"

/**
 * 启动阶段 eager 构建 skills 索引。
 *
 * 设计要点：
 * - 触发一次初始化（复用 utils 内部的单例 Promise）
 * - 若缺少 SKILLS_DIR 或索引构建失败：在启动阶段 fail-fast
 */
export default defineNitroPlugin(async (nitroApp) => {
  // 1) 挂载到 NitroApp：routes 侧通过 useNitroApp().skillsIndex 获取
  const service = createSkillsIndexService()
  nitroApp.skillsIndex = service

  // 2) eager 预热：启动阶段构建索引
  // 选择 fail-fast：索引不可用属于不可恢复的启动错误
  try {
    await service.ready
  } catch (err) {
    console.error("[skillsIndex] failed to build index at startup:", err)
    throw err
  }
})


