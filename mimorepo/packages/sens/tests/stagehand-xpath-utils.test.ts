import { describe, it, expect } from "vitest"
import {
  buildChildXPathSegments,
  joinXPath,
  normalizeXPath,
  prefixXPath,
  parseXPathSteps,
} from "../src/utils/index.js"

describe("buildChildXPathSegments", () => {
  it("应该为 element/text/comment 分别计数并生成带索引的 step", () => {
    const kids = [
      { nodeType: 1, nodeName: "DIV" },
      { nodeType: 1, nodeName: "DIV" },
      { nodeType: 1, nodeName: "SPAN" },
      { nodeType: 3, nodeName: "#text" },
      { nodeType: 3, nodeName: "#text" },
      { nodeType: 8, nodeName: "#comment" }
    ]

    expect(buildChildXPathSegments(kids)).toEqual([
      "div[1]",
      "div[2]",
      "span[1]",
      "text()[1]",
      "text()[2]",
      "comment()[1]"
    ])
  })

  it("应该处理命名空间标签（例如 svg:rect）", () => {
    const kids = [
      { nodeType: 1, nodeName: "svg:rect" },
      { nodeType: 1, nodeName: "svg:rect" },
      { nodeType: 1, nodeName: "svg:g" }
    ]

    expect(buildChildXPathSegments(kids)).toEqual([
      "*[name()='svg:rect'][1]",
      "*[name()='svg:rect'][2]",
      "*[name()='svg:g'][1]"
    ])
  })
})

describe("joinXPath", () => {
  it("应该把根路径与普通 step 正确拼接", () => {
    expect(joinXPath("/", "html[1]")).toBe("/html[1]")
    expect(joinXPath("/html[1]", "body[1]")).toBe("/html[1]/body[1]")
  })

  it("应该支持特殊 step \"//\"（descendant/shadow hop）", () => {
    expect(joinXPath("/", "//")).toBe("//")
    expect(joinXPath("/html[1]/body[1]", "//")).toBe("/html[1]/body[1]//")
    expect(joinXPath("/html[1]/body[1]//", "slot[1]")).toBe("/html[1]/body[1]//slot[1]")
  })
})

describe("normalizeXPath", () => {
  it("应该去掉 xpath= 前缀并确保 leading '/'", () => {
    expect(normalizeXPath("xpath=div[1]")).toBe("/div[1]")
    expect(normalizeXPath("div[1]")).toBe("/div[1]")
    expect(normalizeXPath("/div[1]")).toBe("/div[1]")
  })

  it("应该去掉末尾 '/'（根路径除外）", () => {
    expect(normalizeXPath("/html[1]/")).toBe("/html[1]")
    expect(normalizeXPath("/")).toBe("/")
  })
})

describe("prefixXPath", () => {
  it("应该把 child 拼到 parentAbs 下（parentAbs='/' 视为 no-op）", () => {
    expect(prefixXPath("/", "/div[1]")).toBe("/div[1]")
    expect(prefixXPath("/html[1]/body[1]", "/div[2]")).toBe("/html[1]/body[1]/div[2]")
  })

  it("应该保留 child 以 '//' 开头的 hop 语义", () => {
    expect(prefixXPath("/html[1]/body[1]", "//slot[1]")).toBe("/html[1]/body[1]//slot[1]")
  })

  it("child 为空或 '/' 时应返回 parentAbs（或根）", () => {
    expect(prefixXPath("/html[1]/body[1]", "/")).toBe("/html[1]/body[1]")
    expect(prefixXPath("/", "/")).toBe("/")
    expect(prefixXPath("/", "")).toBe("/")
  })
})

describe("parseXPathSteps", () => {
  it("应该解析简单的绝对 XPath", () => {
    const steps = parseXPathSteps("/html[1]/body[1]/div[2]")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: 1 },
      { axis: "child", tag: "body", index: 1 },
      { axis: "child", tag: "div", index: 2 },
    ])
  })

  it("应该解析后代选择器 //", () => {
    const steps = parseXPathSteps("//div[1]//span[2]")
    expect(steps).toEqual([
      { axis: "descendant", tag: "div", index: 1 },
      { axis: "descendant", tag: "span", index: 2 },
    ])
  })

  it("应该解析混合的子/后代选择器", () => {
    const steps = parseXPathSteps("/html[1]/body[1]//div[1]/span[1]")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: 1 },
      { axis: "child", tag: "body", index: 1 },
      { axis: "descendant", tag: "div", index: 1 },
      { axis: "child", tag: "span", index: 1 },
    ])
  })

  it("应该解析带命名空间的标签", () => {
    const steps = parseXPathSteps("/html[1]/*[name()='svg:rect'][1]")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: 1 },
      { axis: "child", tag: "svg:rect", index: 1 },
    ])
  })

  it("应该解析无索引的选择器", () => {
    const steps = parseXPathSteps("/html/body/div")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: null },
      { axis: "child", tag: "body", index: null },
      { axis: "child", tag: "div", index: null },
    ])
  })

  it("应该处理 xpath= 前缀", () => {
    const steps = parseXPathSteps("xpath=/html[1]/body[1]")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: 1 },
      { axis: "child", tag: "body", index: 1 },
    ])
  })

  it("应该跳过 text() 和 comment() 节点", () => {
    const steps = parseXPathSteps("/html[1]/body[1]/text()[1]")
    expect(steps).toEqual([
      { axis: "child", tag: "html", index: 1 },
      { axis: "child", tag: "body", index: 1 },
    ])
  })

  it("空字符串应返回空数组", () => {
    expect(parseXPathSteps("")).toEqual([])
    expect(parseXPathSteps("   ")).toEqual([])
  })
})

