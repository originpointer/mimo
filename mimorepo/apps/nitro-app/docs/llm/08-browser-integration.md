# 浏览器自动化集成 (Browser Automation Integration)

## 概述 (Overview)

本文档介绍 Nitro-app 项目中的浏览器自动化模式，包括 Plasmo-app Chrome 扩展、Stagehand-app Playwright 脚本，以及它们如何与 LLM 配合使用。

## 架构概览 (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser Automation Layer                   │
│                                                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────┐   │
│  │   Plasmo-App            │    │   Stagehand-App          │   │
│  │   Chrome Extension      │    │   Playwright Scripts     │   │
│  │   - CDP API             │    │   - Full Browser Control │   │
│  │   - XPath Scanner       │    │   - DOM Manipulation     │   │
│  │   - Element Actions     │    │   - Multi-tab Support    │   │
│  └───────────┬─────────────┘    └───────────┬──────────────┘   │
│              │                              │                   │
│              │ DOM Snapshot                 │                   │
│              │ Action Execution             │                   │
└──────────────┼──────────────────────────────┼───────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       LLM Layer (Nitro-App)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AI SDK Operations                                       │  │
│  │  - generateText: Plan actions                            │  │
│  │  - generateObject: Extract structured data               │  │
│  │  - streamText: Chat responses                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Qwen/DashScope LLM                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Plasmo-App Chrome 扩展

### 架构特点

Plasmo-app 使用 Chrome DevTools Protocol (CDP) 通过 `chrome.debugger` API 控制浏览器页面。

### 核心组件

#### StagehandXPathScanner

**文件**: `apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts`

```typescript
export class StagehandXPathScanner {
  private debuggeeId: chrome.debugger.DebuggeeId;

  constructor(targetTabId: number) {
    this.debuggeeId = { tabId: targetTabId };
  }

  // 获取页面 DOM
  async getDOM(): Promise<string> {
    const result = await this.sendCommand("DOM.getDocument");
    // ... 递归获取 DOM 树
  }

  // 执行 XPath 查询
  async evaluateXPath(xpath: string): Promise<Node[]> {
    const result = await this.sendCommand("Runtime.evaluate", {
      expression: `
        document.evaluate(
          "${xpath}",
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )
      `,
    });
    // ... 处理结果
  }

  // 点击元素
  async clickElement(xpath: string): Promise<void> {
    const element = await this.getElementByXPath(xpath);
    await this.sendCommand("DOM.scrollToNode", { nodeId: element.nodeId });
    await this.sendCommand("DOM.focus", { nodeId: element.nodeId });
    await this.sendCommand("DOM.setAttributeValue", {
      nodeId: element.nodeId,
      name: "value",
      value: "click"
    });
  }

  // 输入文本
  async typeText(xpath: string, text: string): Promise<void> {
    const element = await this.getElementByXPath(xpath);
    await this.sendCommand("DOM.focus", { nodeId: element.nodeId });
    await this.sendCommand("DOM.setFileInputFiles", {
      nodeId: element.nodeId,
      files: []
    });

    // 模拟键盘输入
    for (const char of text) {
      await this.sendCommand("Input.dispatchKeyEvent", {
        type: "char",
        text: char
      });
    }
  }

  // CDP 命令封装
  private async sendCommand(
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        this.debuggeeId,
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });
  }
}
```

### 消息传递模式

```typescript
// Background script 接收来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanDOM") {
    const scanner = new StagehandXPathScanner(sender.tab.id);
    scanner.getDOM().then(dom => {
      sendResponse({ success: true, dom });
    });
    return true; // 异步响应
  }

  if (request.action === "clickElement") {
    const scanner = new StagehandXPathScanner(sender.tab.id);
    scanner.clickElement(request.xpath).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});
```

### Shadow DOM 支持

```typescript
async function traverseShadowRoot(nodeId: number): Promise<void> {
  const node = await this.sendCommand("DOM.describeNode", { nodeId });

  if (node.shadowRoots) {
    for (const shadowRoot of node.shadowRoots) {
      // 递归处理 Shadow DOM
      await this.traverseShadowRoot(shadowRoot.nodeId);
    }
  }

  const children = await this.sendCommand("DOM.getChildren", { nodeId });
  for (const child of children.children) {
    await this.traverseShadowRoot(child.nodeId);
  }
}
```

## Stagehand-app Playwright 脚本

### 架构特点

Stagehand-app 使用完整的 Playwright 库进行浏览器自动化，提供更强的控制能力。

### 基本使用

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

async function automateWithStagehand() {
  const stagehand = new Stagehand({
    model: "openai/gpt-4.1-mini",
    browserbaseSessionID: undefined, // 使用本地浏览器
  });

  await stagehand.init();

  // 导航到页面
  await stagehand.page.goto("https://example.com");

  // 执行动作
  await stagehand.act({
    instruction: "Click the login button",
  });

  // 提取数据
  const data = await stagehand.extract({
    instruction: "Extract the product information",
    schema: z.object({
      name: z.string(),
      price: z.string(),
      description: z.string(),
    }),
  });

  // 观察页面
  const observations = await stagehand.observe({
    instruction: "What actions can be performed on this page?",
  });

  await stagehand.close();
}
```

### CDP URL 附加

```typescript
import { chromium } from "playwright";

// 附加到现有的 Chrome 实例
async function attachToCDP() {
  const browser = await chromium.connectOverCDP(
    "http://localhost:9222"
  );

  const context = browser.contexts()[0];
  const page = context.pages()[0];

  // 使用页面
  await page.goto("https://example.com");

  await browser.close();
}
```

## 与 LLM 配合使用

### 完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Capture DOM State                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Plasmo-app: StagehandXPathScanner.getDOM()             │  │
│  │  Returns: HTML string or structured DOM tree            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Build Prompt with Context                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  const prompt = `                                         │  │
│  │    DOM Structure: ${domSnapshot}                          │  │
│  │    User Goal: ${instruction}                              │  │
│  │    Page Context: ${pageUrl}, ${pageTitle}                 │  │
│  │  `;                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Generate Action via LLM                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  const result = await generateObject({                   │  │
│  │    model: provider.chat("qwen-max"),                     │  │
│  │    messages: [{ role: "user", content: prompt }],        │  │
│  │    schema: ActionSchema                                   │  │
│  │  });                                                      │  │
│  │                                                             │  │
│  │  // Result: { xpath: "//button...", action: "click" }     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Execute Action                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Plasmo-app: scanner.clickElement(result.xpath)          │  │
│  │  or                                                       │  │
│  │  Stagehand-app: await stagehand.act(instruction)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Verify Result                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Capture new DOM state                                   │  │
│  │  Compare with expected result                            │  │
│  │  Retry if needed                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Action Schema

```typescript
import { z } from "zod";

export const ActionSchema = z.object({
  xpath: z.string().describe("目标元素的 XPath 选择器"),
  action: z.enum([
    "click",
    "type",
    "hover",
    "scroll",
    "wait",
    "select"
  ]).describe("要执行的动作"),
  value: z.string().optional().describe("输入值或选择值"),
  waitForSelector: z.boolean().optional().default(true),
  timeout: z.number().optional().default(5000),
  reason: z.string().describe("选择此动作的原因"),
  confidence: z.number().min(0).max(1).describe("置信度 0-1"),
});

export type Action = z.infer<typeof ActionSchema>;
```

### 完整示例

```typescript
// Nitro-app 后端
import { generateObject } from "ai";
import { ActionSchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { domSnapshot, instruction, pageContext } = body;

  const provider = createOpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL,
  });

  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "system",
      content: `You are a browser automation expert. Analyze the DOM and generate appropriate actions.`
    }, {
      role: "user",
      content: `
Page URL: ${pageContext.url}
Page Title: ${pageContext.title}

DOM Structure:
${domSnapshot}

User Instruction:
${instruction}

Generate an action to accomplish the user's goal.
      `
    }],
    schema: ActionSchema,
  });

  return {
    ok: true,
    action: result.object,
  };
});
```

```typescript
// Plasmo-app 前端
async function executeWithLLM(instruction: string) {
  // 1. 捕获 DOM
  const scanner = new StagehandXPathScanner(currentTabId);
  const domSnapshot = await scanner.getDOM();

  // 2. 调用 Nitro-app LLM
  const response = await fetch("http://localhost:6006/api/browser/generate-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domSnapshot,
      instruction,
      pageContext: {
        url: await getCurrentUrl(),
        title: await getCurrentTitle(),
      },
    }),
  });

  const { action } = await response.json();

  // 3. 执行动作
  switch (action.action) {
    case "click":
      await scanner.clickElement(action.xpath);
      break;
    case "type":
      await scanner.typeText(action.xpath, action.value);
      break;
    case "hover":
      await scanner.hoverElement(action.xpath);
      break;
  }
}
```

## XPath 操作模式

### 元素定位策略

```typescript
// 优先级顺序
const XPATH_STRATEGIES = [
  // 1. ID 选择器（最稳定）
  `//*[@id="${id}"]`,

  // 2. Name 属性
  `//*[@name="${name}"]`,

  // 3. 特定属性（data-testid, aria-label）
  `//*[@data-testid="${testId}"]`,
  `//*[@aria-label="${ariaLabel}"]`,

  // 4. 文本内容
  `//button[text()="${text}"]`,
  `//a[contains(text(), "${text}")]`,

  // 5. 类名组合
  `//${tag}[contains(@class, "${className}")]`,

  // 6. 层级结构（最脆弱）
  `//div[@class="container"]/div[2]/button`,
];
```

### 多候选 XPath

```typescript
interface ElementWithCandidates {
  primary: string;
  alternatives: string[];
  confidence: number;
}

async function findElementWithFallback(
  description: string
): Promise<ElementWithCandidates> {
  const result = await generateObject({
    model: provider.chat("qwen-max"),
    messages: [{
      role: "user",
      content: `Generate XPath selectors for: ${description}`
    }],
    schema: z.object({
      primary: z.string(),
      alternatives: z.array(z.string()),
      reason: z.string(),
    }),
  });

  return {
    primary: result.object.primary,
    alternatives: result.object.alternatives,
    confidence: calculateConfidence(result.object),
  };
}

async function clickWithFallback(
  scanner: StagehandXPathScanner,
  element: ElementWithCandidates
): Promise<boolean> {
  // 尝试主选择器
  try {
    await scanner.clickElement(element.primary);
    return true;
  } catch (error) {
    console.log(`Primary failed: ${error.message}`);
  }

  // 尝试备选选择器
  for (const xpath of element.alternatives) {
    try {
      await scanner.clickElement(xpath);
      return true;
    } catch (error) {
      console.log(`Alternative ${xpath} failed: ${error.message}`);
    }
  }

  return false;
}
```

## 相关文件 (Related Files)

### Plasmo-App
- [apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts](../../../plasmo-app/src/background/libs/StagehandXPathScanner.ts)
- [apps/plasmo-app/src/background/scripts/](../../../plasmo-app/src/background/scripts/)

### Stagehand-App
- [apps/stagehand-app/src/capture-zhipin.ts](../../../stagehand-app/src/capture-zhipin.ts)

### Stagehand 参考
- [.refer/.sources/stagehand/packages/core/lib/v3/](../../../../.refer/.sources/stagehand/packages/core/lib/v3/)
