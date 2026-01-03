import { eventHandler, getQuery } from "h3"
import { useNitroApp } from "nitropack/runtime"

export default eventHandler(async (event) => {
  const q = getQuery(event)
  const query = typeof q.q === "string" ? q.q.trim() : ""
  const limitRaw = typeof q.limit === "string" ? Number.parseInt(q.limit, 10) : 10

  if (!query) {
    return {
      ok: false,
      error: "缺少查询参数 q，例如：/api/skills/search?q=最小权限&limit=10"
    }
  }

  try {
    const { skillsIndex } = useNitroApp()
    if (!skillsIndex) {
      throw new Error("skillsIndex 未挂载到 NitroApp：请确认 server/plugins/skillsIndex.ts 已生效")
    }
    const { hits, docsCount, builtAt, skillsDir } = await skillsIndex.search(query, limitRaw)
    return {
      ok: true,
      query,
      limit: Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10,
      docsCount,
      builtAt,
      skillsDir,
      hits
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "索引构建/查询失败"
    }
  }
})


