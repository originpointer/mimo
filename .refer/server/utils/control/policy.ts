export type Risk = "low" | "medium" | "high"

export type Act2PolicyInput = {
  action: string
  selector?: string
  frameSelector?: string
  text?: string
  page?: { url?: string; title?: string }
}

export type Act2PolicyOutput = {
  risk: Risk
  requiresConfirmation: boolean
  reason: string
}

const riskRank: Record<Risk, number> = { low: 1, medium: 2, high: 3 }

export function maxRisk(a: Risk, b: Risk): Risk {
  return riskRank[a] >= riskRank[b] ? a : b
}

function includesAny(haystack: string, needles: string[]): boolean {
  const s = haystack.toLowerCase()
  return needles.some((n) => s.includes(n))
}

export function evaluateAct2Policy(input: Act2PolicyInput): Act2PolicyOutput {
  const action = String(input.action || "")
  const selector = String(input.selector || "")
  const frameSelector = String(input.frameSelector || "")
  const text = typeof input.text === "string" ? input.text : ""

  // Base risk by action type
  let risk: Risk = "low"
  let requiresConfirmation = false
  const reasons: string[] = []

  if (action.startsWith("type.")) {
    risk = "high"
    requiresConfirmation = true
    reasons.push("输入可能产生不可逆副作用（默认高风险）")
  } else if (action.startsWith("click.")) {
    risk = "medium"
    requiresConfirmation = false
    reasons.push("点击可能触发状态变化（默认中风险）")
  }

  // Keyword heuristics (MVP): escalate to high for obvious destructive/commit actions.
  const combined = [selector, frameSelector].filter(Boolean).join(" ")
  if (combined) {
    const highWords = [
      "submit",
      "pay",
      "purchase",
      "buy",
      "checkout",
      "delete",
      "remove",
      "destroy",
      "confirm",
      "ok",
      "accept",
      "agree",
      "commit",
      "save",
      "apply",
      "withdraw",
      "transfer",
      "logout",
      "signout",
      "signin",
      "login"
    ]
    if (includesAny(combined, highWords)) {
      risk = "high"
      requiresConfirmation = true
      reasons.push("目标选择器疑似提交/支付/删除/确认等高风险操作")
    }
  }

  if (text && text.length > 0) {
    // typing any text is risky; we already set type.* as high. Keep a clear reason.
    reasons.push("包含文本写入")
  }

  return { risk, requiresConfirmation, reason: reasons.join("；") || "默认策略" }
}


