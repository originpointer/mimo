# Next-App 到 Plasmo-App 通信协议文档

## 概述

本文档描述了 Next-App（Web 应用）与 Plasmo-App（Chrome 扩展）之间的通信机制。通信方向为 **Next-App → Plasmo-App**，使用 Chrome Extension 的 `chrome.runtime.sendMessage` API 实现。

> 相关官方文档：[chrome.runtime.sendMessage](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage)
> 相关官方文档：[Cross-origin messaging](https://developer.chrome.com/docs/extensions/mv3/messaging#external)

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Next-App (Web 应用)                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  app/tools/page.tsx                                                     │ │
│  │  - 用户交互界面                                                          │ │
│  │  - 调用 sendToExtension() 发送消息                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  lib/extension-bridge.ts                                                │ │
│  │  - sendToExtension<T>() 函数                                            │ │
│  │  - 使用 chrome.runtime.sendMessage(extensionId, message, callback)     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ chrome.runtime.sendMessage()
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Plasmo-App (Chrome 扩展)                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  src/background/index.ts                                               │ │
│  │  - chrome.runtime.onMessageExternal.addListener()                      │ │
│  │  - 消息路由分发                                                         │ │
│  │  - 返回响应                                                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心代码解析

### 1. Next-App 端：发送消息

#### 文件：`lib/extension-bridge.ts`

```typescript
type ChromeRuntimeLite = {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
  lastError?: { message?: string }
}

export function getExtensionId(): string {
  return String(process.env.NEXT_PUBLIC_PLASMO_EXTENSION_ID || "").trim()
}

function getRuntime(): ChromeRuntimeLite | null {
  const runtime = (globalThis as any)?.chrome?.runtime as ChromeRuntimeLite | undefined
  return runtime && typeof runtime.sendMessage === "function" ? runtime : null
}

export async function sendToExtension<T>(message: unknown, extensionIdOverride?: string): Promise<T> {
  const extensionId = String(extensionIdOverride || getExtensionId() || "").trim()
  if (!extensionId) {
    throw new Error("extensionId 为空，无法连接扩展")
  }
  const runtime = getRuntime()
  if (!runtime) {
    throw new Error("chrome.runtime 不可用：请确认扩展已安装且允许外部消息")
  }

  return await new Promise<T>((resolve, reject) => {
    runtime.sendMessage(extensionId, message, (response: unknown) => {
      const err = runtime.lastError
      if (err?.message) {
        reject(new Error(err.message))
        return
      }
      resolve(response as T)
    })
  })
}
```

**关键点：**
- Extension ID 从环境变量 `NEXT_PUBLIC_PLASMO_EXTENSION_ID` 获取
- 使用 `chrome.runtime.sendMessage()` API 发送消息
- 返回 Promise 包装的响应，支持异步等待

#### 文件：`app/tools/page.tsx` (使用示例)

```typescript
import { sendToExtension } from "@/lib/extension-bridge"
import { STAGEHAND_XPATH_SCAN, type StagehandXPathScanResponse } from "@/types/plasmo"

const runXPath = async () => {
  const payload: StagehandXPathScanPayload = {
    maxItems: 200,
    selector: "a,button,input",
    includeShadow: false,
    targetTabId: 123456  // 可选：指定目标 Tab ID
  }

  try {
    const response = await sendToExtension<StagehandXPathScanResponse>({
      type: STAGEHAND_XPATH_SCAN,
      payload
    }, extensionId)

    if (response && response.ok) {
      console.log("扫描成功:", response.items)
    } else {
      console.error("扫描失败:", response?.error)
    }
  } catch (e) {
    console.error("通信错误:", e)
  }
}
```

### 2. Plasmo-App 端：接收消息

#### 文件：`src/background/index.ts`

```typescript
class StagehandXPathManager {
  private setupMessageListeners() {
    // 监听来自扩展内部的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleRuntimeMessage(message, sendResponse)
    })

    // 监听来自外部（如 Next-App）的消息
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      return this.handleRuntimeMessage(message, sendResponse)
    })
  }

  private handleRuntimeMessage(message: any, sendResponse: (resp: any) => void): boolean {
    const { type, payload } = message

    // 消息路由
    if (type === STAGEHAND_XPATH_SCAN) {
      // 处理 XPath 扫描请求
      // ...
      return true  // 返回 true 表示异步响应
    }

    if (type === LIST_TABS) {
      // 处理列表 Tab 请求
      // ...
      return true
    }

    // ... 其他消息类型处理

    return false  // 未识别的消息类型
  }
}

// 初始化
const stagehandXPathManager = new StagehandXPathManager()
```

**关键点：**
- 使用 `chrome.runtime.onMessageExternal.addListener()` 监听外部消息
- 消息处理器返回 `true` 表示将异步发送响应
- 每个消息类型都有对应的处理器函数

## 消息协议

### 通用消息格式

```typescript
// 请求格式
{
  type: string,      // 消息类型常量
  payload: any       // 消息负载（根据类型不同而不同）
}

// 响应格式（成功）
{
  ok: true,
  ...fields         // 根据类型不同而不同
}

// 响应格式（失败）
{
  ok: false,
  error: string     // 错误信息
}
```

### 支持的消息类型

| 消息类型常量 | 描述 | Payload 类型 | 响应类型 |
|-------------|------|-------------|---------|
| `LIST_TABS` | 获取浏览器标签页列表 | `ListTabsPayload` | `ListTabsResponse` |
| `STAGEHAND_XPATH_SCAN` | 扫描页面元素生成 XPath | `StagehandXPathScanPayload` | `StagehandXPathScanResponse` |
| `STAGEHAND_VIEWPORT_SCREENSHOT` | 截取视口截图 | `StagehandViewportScreenshotPayload` | `StagehandViewportScreenshotResponse` |
| `RESUME_BLOCKS_EXTRACT` | 提取简历内容块 | `ResumeBlocksExtractPayload` | `ResumeBlocksExtractResponse` |
| `RESUME_XPATH_VALIDATE` | 验证 XPath 是否有效 | `ResumeXpathValidatePayload` | `ResumeXpathValidateResponse` |
| `JSON_COMMON_XPATH_FIND` | 查找 JSON 对应的公共祖先 XPath | `JsonCommonXpathFindPayload` | `JsonCommonXpathFindResponse` |
| `XPATH_MARK_ELEMENTS` | 标记/清除 XPath 对应的页面元素 | `XPathMarkElementsPayload` | `XPathMarkElementsResponse` |
| `XPATH_GET_HTML` | 获取 XPath 对应元素的 innerHTML | `XPathGetHtmlPayload` | `XPathGetHtmlResponse` |
| `CREATE_TAB_GROUP` | 创建标签页组 | `CreateTabGroupPayload` | `TabGroupResponse` |
| `UPDATE_TAB_GROUP` | 更新标签页组 | `UpdateTabGroupPayload` | `TabGroupResponse` |
| `DELETE_TAB_GROUP` | 删除标签页组 | `DeleteTabGroupPayload` | `TabGroupResponse` |
| `QUERY_TAB_GROUPS` | 查询标签页组 | `QueryTabGroupsPayload` | `QueryTabGroupsResponse` |
| `ADD_TABS_TO_GROUP` | 添加标签页到组 | `AddTabsToGroupPayload` | `TabGroupResponse` |

### 类型定义文件

所有类型定义在 `apps/next-app/types/plasmo.ts` 中共享：

```typescript
// 列出标签页
export const LIST_TABS = "LIST_TABS" as const

export type ListTabsPayload = {
  includeAllWindows?: boolean
}

export type ListTabsItem = {
  id: number
  url?: string
  title?: string
  windowId?: number
  active?: boolean
}

export type ListTabsResponse =
  | { ok: true; tabs: ListTabsItem[] }
  | { ok: false; error: string }

// XPath 扫描
export const STAGEHAND_XPATH_SCAN = "STAGEHAND_XPATH_SCAN" as const

export type StagehandXPathScanOptions = {
  maxItems: number
  selector: string
  includeShadow: boolean
}

export type StagehandXPathScanPayload = StagehandXPathScanOptions & {
  targetTabId?: number
}

export type StagehandXPathItem = {
  xpath: string
  tagName: string
  id?: string
  className?: string
  textSnippet?: string
}

export type StagehandXPathScanResponse =
  | { ok: true; items: StagehandXPathItem[]; meta?: { ... } }
  | { ok: false; error: string }
```

## 配置要求

### 1. 环境变量

在 Next-App 的 `.env` 或 `.env.local` 中配置：

```bash
# Plasmo 扩展的 ID（在扩展安装后从 chrome://extensions 获取）
NEXT_PUBLIC_PLASMO_EXTENSION_ID=your_extension_id_here
```

### 2. 扩展清单配置

在 Plasmo-App 中需要配置允许接收外部消息：

> 官方文档：[externally_connectable](https://developer.chrome.com/docs/extensions/mv3/manifest/externally_connectable)

```json
// package.json (Plasmo) 或 manifest.json
{
  "manifest": {
    "externally_connectable": {
      "matches": ["http://localhost:*/*", "https://your-domain.com/*"]
    }
  }
}
```

### 3. 权限要求

扩展需要以下权限：

```json
{
  "permissions": [
    "tabs",
    "debugger",
    "tabGroups"
  ]
}
```

> 官方文档：
> - [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)
> - [debugger](https://developer.chrome.com/docs/extensions/reference/api/debugger)
> - [tabGroups](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)

## 错误处理

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `extensionId 为空` | 环境变量未配置 | 检查 `NEXT_PUBLIC_PLASMO_EXTENSION_ID` |
| `chrome.runtime 不可用` | 扩展未安装或页面不支持 | 确认扩展已安装并在 HTTP/HTTPS 页面运行 |
| `Could not establish connection` | 扩展未运行或 ID 不匹配 | 检查扩展 ID 是否正确 |
| `目标 Tab 不可扫描` | 尝试访问 chrome:// 等受限页面 | 仅支持 http/https 页面 |

### 错误处理示例

```typescript
try {
  const response = await sendToExtension<ResponseType>(message, extensionId)

  if (!response) {
    console.error("未收到响应（可能扩展未就绪或权限不足）")
    return
  }

  if (response.ok === false) {
    console.error("操作失败:", response.error)
    return
  }

  // 处理成功响应
  console.log("操作成功:", response)

} catch (e) {
  const error = e instanceof Error ? e.message : String(e)

  if (error.includes("extensionId")) {
    console.error("扩展 ID 配置错误，请检查环境变量")
  } else if (error.includes("chrome.runtime")) {
    console.error("Chrome 扩展 API 不可用，请确认扩展已安装")
  } else {
    console.error("未知错误:", error)
  }
}
```

## 最佳实践

### 1. 扩展 ID 管理

```typescript
// lib/extension-bridge.ts
export function getExtensionId(): string {
  return String(process.env.NEXT_PUBLIC_PLASMO_EXTENSION_ID || "").trim()
}

// 使用时允许覆盖（方便测试）
await sendToExtension(message, specificExtensionId)
```

### 2. 响应超时处理

```typescript
export async function sendToExtensionWithTimeout<T>(
  message: unknown,
  extensionId: string,
  timeout = 30000
): Promise<T> {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const result = await sendToExtension<T>(message, extensionId)
    clearTimeout(timeoutId)
    return result
  } catch (e) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      throw new Error("请求超时")
    }
    throw e
  }
}
```

### 3. 消息验证

```typescript
// 在扩展端验证消息格式
function isValidMessage(message: any): message is { type: string; payload: any } {
  return (
    message &&
    typeof message === "object" &&
    typeof message.type === "string" &&
    "payload" in message
  )
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isValidMessage(message)) {
    sendResponse({ ok: false, error: "Invalid message format" })
    return true
  }

  // 验证发送方来源（可选）
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || []
  if (sender.origin && !allowedOrigins.includes(sender.origin)) {
    sendResponse({ ok: false, error: "Unauthorized origin" })
    return true
  }

  // 处理消息...
})
```

## 调试技巧

### 1. 开发者工具

在 Next-App 端：
```javascript
console.log("Extension ID:", getExtensionId())
console.log("Chrome runtime available:", !!getRuntime())
```

在 Plasmo-App 端（Background Service Worker）：
```javascript
chrome.runtime.onMessageExternal.addListener((message, sender) => {
  console.log("Received message:", message)
  console.log("Sender:", sender)
})
```

### 2. 消息监控

使用 Chrome DevTools 的 Background 页面监控消息：

1. 打开 `chrome://extensions`
2. 开启"开发者模式"
3. 点击扩展的"service worker"链接
4. 在 Console 中查看日志

### 3. 权限检查

```javascript
// 检查扩展是否安装
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.sendMessage(extensionId, { type: "PING" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("扩展未响应:", chrome.runtime.lastError.message)
    } else {
      console.log("扩展正常:", response)
    }
  })
}
```

## 参考文档

### Chrome Extension 官方文档

| 主题 | 链接 |
|-----|------|
| Message Passing | https://developer.chrome.com/docs/extensions/mv3/messaging |
| chrome.runtime.sendMessage | https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage |
| externally_connectable | https://developer.chrome.com/docs/extensions/mv3/manifest/externally_connectable |
| tabs API | https://developer.chrome.com/docs/extensions/reference/api/tabs |
| debugger API | https://developer.chrome.com/docs/extensions/reference/api/debugger |
| tabGroups API | https://developer.chrome.com/docs/extensions/reference/api/tabGroups |

### 相关项目文档

| 文档 | 路径 |
|-----|------|
| StagehandXPath 协议说明 | `apps/plasmo-app/docs/StagehandXPath-协议说明.md` |
| JsonCommonXpath 协议说明 | `apps/plasmo-app/docs/JsonCommonXpath-协议说明.md` |
| Chrome TabGroups API 文档 | `apps/plasmo-app/docs/Chrome-TabGroups-API-文档.md` |

## 更新日志

| 日期 | 版本 | 更新内容 |
|-----|------|---------|
| 2025-01-26 | 1.0.0 | 初始版本，完整描述 Next-App 到 Plasmo-App 的通信协议 |
