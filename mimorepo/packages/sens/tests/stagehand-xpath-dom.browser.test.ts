/**
 * DOM XPath 工具函数浏览器测试
 *
 * 这些测试在真实浏览器环境中运行，测试 DOM 相关的 XPath 工具函数。
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  buildElementXPath,
  buildDomXPathMap,
  scanDomForXPaths,
  getElementByXPath,
  getElementsByXPath,
} from "../src/utils/stagehand-xpath.js"

describe("buildElementXPath", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    container.id = "test-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it("应该为简单元素生成正确的 XPath", () => {
    container.innerHTML = `<div id="target"></div>`
    const target = container.querySelector("#target")!
    const xpath = buildElementXPath(target)

    // 验证路径格式正确
    expect(xpath).toMatch(/^\/html\[1\]/)
    expect(xpath).toContain("div")

    // 验证可以通过 XPath 找回元素
    const found = getElementByXPath(xpath)
    expect(found).toBe(target)
  })

  it("应该正确处理嵌套元素", () => {
    container.innerHTML = `
      <div>
        <span>
          <button id="nested-btn">Click</button>
        </span>
      </div>
    `
    const btn = container.querySelector("#nested-btn")!
    const xpath = buildElementXPath(btn)

    expect(xpath).toContain("button")
    const found = getElementByXPath(xpath)
    expect(found).toBe(btn)
  })

  it("应该正确计算同类型兄弟节点索引", () => {
    container.innerHTML = `
      <div></div>
      <div id="second"></div>
      <div></div>
    `
    const second = container.querySelector("#second")!
    const xpath = buildElementXPath(second)

    // 第二个 div 应该有 [2] 索引
    expect(xpath).toMatch(/div\[2\]/)
    const found = getElementByXPath(xpath)
    expect(found).toBe(second)
  })
})

describe("buildDomXPathMap", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    container.id = "map-test-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it("应该为所有元素生成 XPath 映射", () => {
    container.innerHTML = `
      <div id="a">
        <span id="b"></span>
        <span id="c"></span>
      </div>
    `

    const map = buildDomXPathMap(container, { rootXPath: "/test[1]" })

    expect(map.size).toBeGreaterThan(0)
    expect(map.has(container)).toBe(true)

    const divA = container.querySelector("#a")!
    const spanB = container.querySelector("#b")!
    const spanC = container.querySelector("#c")!

    expect(map.has(divA)).toBe(true)
    expect(map.has(spanB)).toBe(true)
    expect(map.has(spanC)).toBe(true)
  })
})

describe("scanDomForXPaths", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    container.id = "scan-test-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it("应该扫描匹配选择器的元素", () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <a href="#" id="link1">Link 1</a>
      <div>Not a match</div>
      <button id="btn2">Button 2</button>
    `

    const results = scanDomForXPaths("button, a")

    // 应该找到 button 和 a 元素
    const tagNames = results.map((r) => r.tagName)
    expect(tagNames).toContain("button")
    expect(tagNames).toContain("a")
  })

  it("应该尊重 maxItems 限制", () => {
    container.innerHTML = `
      <button>1</button>
      <button>2</button>
      <button>3</button>
      <button>4</button>
      <button>5</button>
    `

    const results = scanDomForXPaths("button", { maxItems: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it("应该应用可见性过滤", () => {
    container.innerHTML = `
      <button id="visible">Visible</button>
      <button id="hidden" style="display: none;">Hidden</button>
    `

    const isVisible = (el: Element): boolean => {
      const style = window.getComputedStyle(el)
      return style.display !== "none"
    }

    const results = scanDomForXPaths("button", { isVisible })
    const ids = results.map((r) => r.id).filter(Boolean)

    expect(ids).toContain("visible")
    expect(ids).not.toContain("hidden")
  })
})

describe("getElementByXPath", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    container.id = "xpath-query-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it("应该通过 XPath 找到元素", () => {
    container.innerHTML = `<div id="findme"></div>`
    const target = container.querySelector("#findme")!

    // 构建 XPath 并查询
    const xpath = buildElementXPath(target)
    const found = getElementByXPath(xpath)

    expect(found).toBe(target)
  })

  it("应该返回 null 如果没有匹配", () => {
    const found = getElementByXPath("/html[1]/body[1]/nonexistent[99]")
    expect(found).toBeNull()
  })

  it("应该处理 xpath= 前缀", () => {
    container.innerHTML = `<span id="prefixed"></span>`
    const target = container.querySelector("#prefixed")!
    const xpath = buildElementXPath(target)

    const found = getElementByXPath(`xpath=${xpath}`)
    expect(found).toBe(target)
  })
})

describe("getElementsByXPath", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    container.id = "multi-query-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it("应该返回所有匹配的元素", () => {
    container.innerHTML = `
      <span class="match">1</span>
      <span class="match">2</span>
      <span class="match">3</span>
    `

    // 使用后代选择器查找所有 span
    const containerXPath = buildElementXPath(container)
    const results = getElementsByXPath(`${containerXPath}//span`)

    expect(results.length).toBe(3)
    results.forEach((el) => {
      expect(el.tagName.toLowerCase()).toBe("span")
    })
  })

  it("应该尊重 limit 参数", () => {
    container.innerHTML = `
      <div>1</div>
      <div>2</div>
      <div>3</div>
      <div>4</div>
      <div>5</div>
    `

    const containerXPath = buildElementXPath(container)
    const results = getElementsByXPath(`${containerXPath}//div`, undefined, 2)

    expect(results.length).toBeLessThanOrEqual(2)
  })

  it("应该返回空数组如果没有匹配", () => {
    const results = getElementsByXPath("/html[1]/body[1]/nonexistent")
    expect(results).toEqual([])
  })
})
