import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"

type ExtractBody = {
  extensionId: string
  tabId?: number
  // 提取方式
  mode: "expression" | "selector" | "all"
  // expression 模式
  expression?: string
  // selector 模式
  selector?: string
  attribute?: string
  // common options
  replyUrl?: string
  sessionId?: string
}

/**
 * POST /control/extract
 * 从页面中提取数据（extract 的最小实现）
 * 
 * 这是 Stagehand extract() 的简化版本，用于验证基础能力。
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<ExtractBody> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }

  if (!body.mode) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.mode" })
  }

  const replyUrl = body.replyUrl || `http://localhost:3000/control/callback`
  
  const driver = createDriverAdapter({
    extensionId: body.extensionId,
    replyUrl,
    defaultTabId: body.tabId,
    keepAttached: true
  })

  try {
    let result: unknown

    switch (body.mode) {
      case "expression":
        if (typeof body.expression !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing expression for expression mode" })
        }
        result = await driver.evaluate(body.expression, { sessionId: body.sessionId })
        break

      case "selector": {
        if (typeof body.selector !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing selector for selector mode" })
        }
        const attr = body.attribute || "textContent"
        const expr = `document.querySelector(${JSON.stringify(body.selector)})?.${attr}`
        result = await driver.evaluate(expr, { sessionId: body.sessionId })
        break
      }

      case "all": {
        // 提取页面基础信息
        const [title, url, html] = await Promise.all([
          driver.evaluate("document.title", { sessionId: body.sessionId }),
          driver.evaluate("location.href", { sessionId: body.sessionId }),
          driver.evaluate("document.documentElement.outerHTML.slice(0, 5000)", { sessionId: body.sessionId })
        ])
        result = { title, url, htmlPreview: html }
        break
      }

      default:
        throw createError({ statusCode: 400, statusMessage: `Unknown mode: ${body.mode}` })
    }

    return { ok: true, mode: body.mode, result }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, mode: body.mode, error: { message } }
  }
})



