import type { ResumeBlock, ResumeBlocksExtractResponse, ResumePageMeta } from "../types/plasmo"

export type PageKind = "detail" | "list" | "unknown"

export type JsonResumeXpath = {
  basics?: { xpath: string }
  work?: Array<{ xpath: string }>
  education?: Array<{ xpath: string }>
  projects?: Array<{ xpath: string }>
  skills?: Array<{ xpath: string }>
  summary?: { xpath: string }
}

export type JsonResumeXpathParseResult =
  | { ok: true; pageKind: PageKind; page: ResumePageMeta; resume?: JsonResumeXpath; reason?: string; debug?: any }
  | { ok: false; error: string }

function countMatches(text: string, re: RegExp): number {
  if (!text) return 0
  const m = text.match(re)
  return m ? m.length : 0
}

function normText(s: string | undefined): string {
  return String(s || "").replace(/\s+/g, " ").trim()
}

function isNoiseBlock(text: string): boolean {
  const t = text
  if (!t) return true
  const hard = [
    /声明：该人选信息仅供公司招聘使用/,
    /立即沟通|超级聊聊|金领券|猎币/,
    /收藏|转发|举报|不合适|打印|存至本地/,
    /TA当前在线回复快/,
    /代理招聘专用|watermark/i
  ]
  if (hard.some((r) => r.test(t))) return true
  const seg = t.slice(0, 80)
  if (seg && t.split(seg).length >= 4) return true
  return false
}

function detectPageKind(page: ResumePageMeta, blocks: ResumeBlock[]): { pageKind: PageKind; reason?: string; debug?: any } {
  const url = String(page?.url || "")
  const t = normText(blocks.map((b) => b.text).join(" "))

  const actionWordHits = countMatches(t, /电话沟通|打招呼|继续聊聊/g)
  const nameHits = countMatches(t, /[\u4e00-\u9fa5]{1,4}(先生|女士)/g)
  const activeHits = countMatches(t, /今日活跃|本周活跃|本月活跃|昨日活跃/g)
  const workExpHits = countMatches(t, /工作经验/g)
  const expectHits = countMatches(t, /期望：/g)

  if (actionWordHits >= 3) {
    return { pageKind: "list", reason: "detected_list:actionWords>=3", debug: { actionWordHits, nameHits, activeHits } }
  }
  if (nameHits >= 2) {
    return { pageKind: "list", reason: "detected_list:multiName", debug: { actionWordHits, nameHits, activeHits } }
  }
  if (blocks.length === 1 && activeHits >= 2) {
    return { pageKind: "list", reason: "detected_list:singleBlock+activeHits", debug: { actionWordHits, nameHits, activeHits } }
  }
  if (workExpHits >= 2 && expectHits >= 2) {
    return { pageKind: "list", reason: "detected_list:repeatedCardPatterns", debug: { workExpHits, expectHits } }
  }

  if (/resume|showcv|showresumedetail|resumeNumber/i.test(url)) {
    return { pageKind: "detail" }
  }
  const headingText = blocks.map((b) => normText(b.heading)).join(" ")
  if (/工作经历|教育经历|项目经历|项目经验|自我评价|技能/i.test(headingText)) return { pageKind: "detail" }

  return { pageKind: "unknown" }
}

type Section = "basics" | "work" | "education" | "projects" | "skills" | "summary" | "other"

function scoreSection(block: ResumeBlock): Record<Section, number> {
  const t = normText(block.text)
  const h = normText(block.heading)
  const scores: Record<Section, number> = {
    basics: 0,
    work: 0,
    education: 0,
    projects: 0,
    skills: 0,
    summary: 0,
    other: 0
  }

  if (/工作经历/.test(h)) scores.work += 120
  if (/教育经历/.test(h)) scores.education += 120
  if (/项目经历|项目经验/.test(h)) scores.projects += 120
  if (/技能|技能特长/.test(h)) scores.skills += 120
  if (/自我评价|个人优势/.test(h)) scores.summary += 120

  const addIf = (sec: Section, re: RegExp, w: number) => {
    if (re.test(t)) scores[sec] += w
  }

  addIf("work", /工作经历|任职|职责|业绩|工作描述|所在部门|工作地点|汇报对象|下属人数|离职原因|work experience/i, 40)
  addIf("education", /教育经历|学校|专业|学历|学位|本科|硕士|博士|mba|统招|education/i, 40)
  addIf("projects", /项目经验|项目经历|项目描述|责任描述|project/i, 45)
  addIf("skills", /技能特长|技能\/语言|语言能力|证书|培训经历|精通|熟练|良好|一般|了解|skills|certification/i, 45)
  addIf("summary", /自我评价|个人优势|总结|summary/i, 45)

  addIf("basics", /男|女|岁|现居|户口|工作\d+年|本科|硕士|博士|电话|邮箱|查看大图|在线|在职/i, 25)

  const dateHits = block.signals?.dateHits ?? 0
  if (dateHits >= 5) {
    scores.work += 20
    scores.education += 15
    scores.projects += 15
  }

  if (/^\d{4}[./-]\d{1,2}\s*-\s*(至今|\d{4}[./-]\d{1,2})/.test(t)) scores.work += 35
  if (/^项目经验/.test(t)) scores.projects += 60
  if (/^技能特长/.test(t)) scores.skills += 60
  if (/^自我评价/.test(t)) scores.summary += 60

  if (/(打电话|打招呼|收藏|转给同事|打印|举报|不合适|存至本地)/.test(t)) {
    scores.work -= 20
    scores.education -= 20
    scores.projects -= 20
    scores.skills -= 20
    scores.summary -= 20
    scores.basics -= 10
  }

  if ((block.signals?.textLen ?? t.length) < 60) scores.other += 30

  return scores
}

function pickTopSections(blocks: ResumeBlock[]): { section: Section; block: ResumeBlock; score: number }[] {
  const out: { section: Section; block: ResumeBlock; score: number }[] = []
  for (const b of blocks) {
    const scores = scoreSection(b)
    let best: Section = "other"
    let bestScore = -1e9
    for (const k of Object.keys(scores) as Section[]) {
      if (scores[k] > bestScore) {
        bestScore = scores[k]
        best = k
      }
    }
    out.push({ section: bestScore >= 40 ? best : "other", block: b, score: bestScore })
  }
  return out
}

function uniqByXpath(items: ResumeBlock[]): ResumeBlock[] {
  const seen = new Set<string>()
  const out: ResumeBlock[] = []
  for (const b of items) {
    const xp = String(b.locator?.xpath || "")
    if (!xp || seen.has(xp)) continue
    seen.add(xp)
    out.push(b)
  }
  return out
}

export function parseBlocksToJsonResumeXpath(input: Extract<ResumeBlocksExtractResponse, { ok: true }>): JsonResumeXpathParseResult {
  try {
    const page = input.page
    const blocks = Array.isArray(input.blocks) ? input.blocks : []
    const kind = detectPageKind(page, blocks)
    if (kind.pageKind === "list") {
      return { ok: true, pageKind: "list", page, reason: kind.reason, debug: kind.debug }
    }

    const clean = blocks
      .map((b) => ({ ...b, text: normText(b.text) }))
      .filter((b) => b.text)
      .filter((b) => !isNoiseBlock(b.text))

    const classified = pickTopSections(clean)
    const bySection = (sec: Section) => classified.filter((x) => x.section === sec).sort((a, b) => b.score - a.score).map((x) => x.block)

    const basicsBlocks = bySection("basics")
    const workBlocks = bySection("work")
    const eduBlocks = bySection("education")
    const projBlocks = bySection("projects")
    const skillBlocks = bySection("skills")
    const summaryBlocks = bySection("summary")

    const resume: JsonResumeXpath = {}

    if (basicsBlocks.length) resume.basics = { xpath: basicsBlocks[0]!.locator.xpath }
    if (workBlocks.length) resume.work = uniqByXpath(workBlocks).map((b) => ({ xpath: b.locator.xpath }))
    if (eduBlocks.length) resume.education = uniqByXpath(eduBlocks).map((b) => ({ xpath: b.locator.xpath }))
    if (projBlocks.length) resume.projects = uniqByXpath(projBlocks).map((b) => ({ xpath: b.locator.xpath }))
    if (skillBlocks.length) resume.skills = uniqByXpath(skillBlocks).map((b) => ({ xpath: b.locator.xpath }))
    if (summaryBlocks.length) resume.summary = { xpath: summaryBlocks[0]!.locator.xpath }

    const hasAny = Object.keys(resume).length > 0

    return {
      ok: true,
      pageKind: kind.pageKind,
      page,
      ...(hasAny ? { resume } : {}),
      debug: {
        ...kind.debug,
        counts: {
          inputBlocks: blocks.length,
          cleanBlocks: clean.length,
          basics: basicsBlocks.length,
          work: workBlocks.length,
          education: eduBlocks.length,
          projects: projBlocks.length,
          skills: skillBlocks.length,
          summary: summaryBlocks.length
        }
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

