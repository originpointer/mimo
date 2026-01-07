import { eventHandler, readBody, createError } from "h3"
import { createDriverAdapter } from "@/utils/control/driverAdapter"

type ActBody = {
  extensionId: string
  tabId?: number
  action: "click" | "type" | "press" | "navigate" | "evaluate"
  // click params
  x?: number
  y?: number
  // type/press params
  text?: string
  key?: string
  // navigate params
  url?: string
  // evaluate params
  expression?: string
  // common options
  replyUrl?: string
  waitForLoad?: boolean
}

/**
 * POST /control/act
 * 执行简单的浏览器操作（act 的最小实现）
 * 
 * 这是 Stagehand act() 的简化版本，用于验证基础能力。
 */
export default eventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<ActBody> | null

  if (!body || typeof body.extensionId !== "string" || !body.extensionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.extensionId" })
  }

  if (!body.action) {
    throw createError({ statusCode: 400, statusMessage: "Missing body.action" })
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

    switch (body.action) {
      case "click":
        if (typeof body.x !== "number" || typeof body.y !== "number") {
          throw createError({ statusCode: 400, statusMessage: "Missing x/y for click action" })
        }
        await driver.clickAt(body.x, body.y)
        result = { clicked: true, x: body.x, y: body.y }
        break

      case "type":
        if (typeof body.text !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing text for type action" })
        }
        await driver.type(body.text)
        result = { typed: true, text: body.text }
        break

      case "press":
        if (typeof body.key !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing key for press action" })
        }
        await driver.press(body.key)
        result = { pressed: true, key: body.key }
        break

      case "navigate":
        if (typeof body.url !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing url for navigate action" })
        }
        await driver.navigate(body.url, { waitForLoad: body.waitForLoad ?? true })
        result = { navigated: true, url: body.url }
        break

      case "evaluate":
        if (typeof body.expression !== "string") {
          throw createError({ statusCode: 400, statusMessage: "Missing expression for evaluate action" })
        }
        const evalResult = await driver.evaluate(body.expression)
        result = { evaluated: true, result: evalResult }
        break

      default:
        throw createError({ statusCode: 400, statusMessage: `Unknown action: ${body.action}` })
    }

    return { ok: true, action: body.action, result }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, action: body.action, error: { message } }
  }
})



