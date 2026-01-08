import { beforeEach, describe, expect, it, vi } from "vitest"

let mockQuery: Record<string, unknown> = {}
let mockNitroApp: any = {}

vi.mock("h3", () => {
  return {
    // 让 route 文件导出的 default 直接是 handler(event) => result
    eventHandler: (handler: any) => handler,
    getQuery: () => mockQuery
  }
})

vi.mock("nitropack/runtime", () => {
  return {
    useNitroApp: () => mockNitroApp
  }
})

// mocks 必须在 import 之前声明
import handler from "@/routes/api/skills/search"

describe("server/routes/api/skills/search.ts", () => {
  beforeEach(() => {
    mockQuery = {}
    mockNitroApp = {}
    vi.clearAllMocks()
  })

  it("缺少 q 时返回错误", async () => {
    mockQuery = {}
    const res = await handler({} as any)
    expect(res).toEqual({
      ok: false,
      error: "缺少查询参数 q，例如：/api/skills/search?q=最小权限&limit=10"
    })
  })

  it("q 只有空白（trim 后为空）时返回错误", async () => {
    mockQuery = { q: "   " }
    const res = await handler({} as any)
    expect(res.ok).toBe(false)
    expect((res as any).error).toContain("缺少查询参数 q")
  })

  it("skillsIndex 未挂载时返回错误", async () => {
    mockQuery = { q: "abc" }
    mockNitroApp = {}
    const res = await handler({} as any)
    expect(res).toEqual({
      ok: false,
      error: "skillsIndex 未挂载到 NitroApp：请确认 server/plugins/skillsIndex.ts 已生效"
    })
  })

  it("成功：q 会 trim，limit 默认 10，并返回 hits/元信息", async () => {
    const search = vi.fn().mockResolvedValue({
      hits: [
        {
          id: "allowed-tools-minimal",
          skillDir: "allowed-tools-minimal",
          path: "allowed-tools-minimal/SKILL.md",
          score: 1.23,
          nameHTML: "<mark>abc</mark>",
          descriptionHTML: "desc",
          snippetHTML: "snip"
        }
      ],
      docsCount: 3,
      builtAt: 1700000000,
      skillsDir: "/abs/skills"
    })
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "  abc  " }

    const res: any = await handler({} as any)
    expect(search).toHaveBeenCalledWith("abc", 10)
    expect(res.ok).toBe(true)
    expect(res.query).toBe("abc")
    expect(res.limit).toBe(10)
    expect(res.docsCount).toBe(3)
    expect(res.builtAt).toBe(1700000000)
    expect(res.skillsDir).toBe("/abs/skills")
    expect(res.hits).toHaveLength(1)
  })

  it("limit=0：响应层 clamp 到 1；并将 limitRaw(0) 传给 skillsIndex.search", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [], docsCount: 0, builtAt: 1, skillsDir: "/x" })
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "abc", limit: "0" }

    const res: any = await handler({} as any)
    expect(search).toHaveBeenCalledWith("abc", 0)
    expect(res.limit).toBe(1)
  })

  it("limit=100：响应层 clamp 到 50；并将 limitRaw(100) 传给 skillsIndex.search", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [], docsCount: 0, builtAt: 1, skillsDir: "/x" })
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "abc", limit: "100" }

    const res: any = await handler({} as any)
    expect(search).toHaveBeenCalledWith("abc", 100)
    expect(res.limit).toBe(50)
  })

  it("limit=abc：limitRaw 为 NaN，响应层回落到 10；并将 NaN 传给 skillsIndex.search", async () => {
    const search = vi.fn().mockResolvedValue({ hits: [], docsCount: 0, builtAt: 1, skillsDir: "/x" })
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "abc", limit: "abc" }

    const res: any = await handler({} as any)
    expect(search).toHaveBeenCalled()
    expect(search.mock.calls[0][0]).toBe("abc")
    expect(Number.isNaN(search.mock.calls[0][1])).toBe(true)
    expect(res.limit).toBe(10)
  })

  it("skillsIndex.search 抛 Error：返回该 error.message", async () => {
    const search = vi.fn().mockRejectedValue(new Error("boom"))
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "abc" }

    const res = await handler({} as any)
    expect(res).toEqual({ ok: false, error: "boom" })
  })

  it("skillsIndex.search 抛非 Error：返回通用错误文案", async () => {
    const search = vi.fn().mockRejectedValue("boom")
    mockNitroApp = { skillsIndex: { search } }
    mockQuery = { q: "abc" }

    const res = await handler({} as any)
    expect(res).toEqual({ ok: false, error: "索引构建/查询失败" })
  })
})


