export type ResumeSampleCandidate = {
  id: string
  xpath: string
  text: string
  tag?: string
}

export type ResumeSample = {
  sampleId: string
  page: { url: string; title: string; viewport?: any }
  mainContainer?: { xpath: string }
  candidates: ResumeSampleCandidate[]
}

/**
 * 约束：只允许输出严格 JSON（不带 markdown codefence）。
 * 输出结构：JSON Resume（字段值为 xpath 字符串），缺失字段不输出 key。
 *
 * 说明：v0 不要求你把 work/education/projects/skills 拆成精确条目；
 * 你可以先输出容器级 xpath（例如整段“工作经历”容器），后续会通过端上验证与迭代补细。
 */
export function buildJsonResumeXpathPrompt(sample: ResumeSample) {
  const system = [
    "你是一个网页简历解析与定位助手。",
    "你的任务：从给定候选节点列表中，为 JSON Resume 各字段选择最合适的 XPath。",
    "严格要求：",
    "1) 只能使用 candidates 中出现的 xpath；不要凭空编造 xpath。",
    "2) 输出必须是严格 JSON（不要包含 markdown code block、不要输出解释文字）。",
    "3) 只输出你有把握的字段；缺失字段不要输出 key。",
    "4) JSON Resume 结构：basics/work/education/projects/skills/awards/certificates/publications/volunteer/languages/interests/references（按需输出）。",
    "5) work/education/projects/skills 可以输出数组，数组元素是对象；对象内字段的值为 xpath 字符串。",
    "6) 优先选择文本更精确、内容更短更像字段值的节点 xpath（如姓名、邮箱、手机号、学校、公司名）。",
    "7) 如果无法精确到字段节点，允许退化为容器 xpath（例如整段工作经历容器）。",
    "",
    "输出示例（仅示意，字段可更少或更多）：",
    '{ "basics": { "name": "/html/.../span[1]", "email": "/html/.../a[2]" }, "work": [ { "company": "/html/.../div[4]" } ] }'
  ].join("\n")

  const user = {
    page: sample.page,
    mainContainer: sample.mainContainer,
    candidates: sample.candidates.slice(0, 400) // 防止 token 过大；后续可按需调参
  }

  return {
    system,
    user: JSON.stringify(user)
  }
}

