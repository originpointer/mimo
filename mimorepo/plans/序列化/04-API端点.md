# Stagehand DOM 序列化 - API 端点

## POST /control/snapshot

获取页面的 Stagehand 风格 Hybrid Snapshot。

### 端点位置

`.refer/server/routes/control/snapshot.post.ts`

### 请求

#### URL

```
POST http://localhost:3000/control/snapshot
```

#### Headers

```
Content-Type: application/json
```

#### Body

| 字段 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `extensionId` | `string` | ✅ | - | Chrome 扩展 ID |
| `tabId` | `number` | ✅ | - | 目标标签页 ID |
| `replyUrl` | `string` | ❌ | `http://localhost:3000/control/callback` | CDP 回调 URL |
| `sessionId` | `string` | ❌ | - | CDP session ID |
| `fullSnapshot` | `boolean` | ❌ | `false` | 是否使用多 frame 完整快照 |
| `pierceShadow` | `boolean` | ❌ | `true` | 是否穿透 shadow DOM |
| `focusSelector` | `string` | ❌ | - | 聚焦选择器（限制范围） |
| `experimental` | `boolean` | ❌ | `false` | 是否启用实验性功能 |

### 响应

#### 成功响应

```typescript
{
  ok: true,
  result: {
    tabId: number,
    sessionId: string | null,
    combinedTree: string,           // 文本大纲
    combinedXpathMap: Record<string, string>,  // elementId → XPath
    combinedUrlMap: Record<string, string>,    // elementId → URL
    perFrame: Array<{
      frameId: string,
      outline: string,
      xpathMap: Record<string, string>,
      urlMap: Record<string, string>
    }>,
    stats: {
      elementCount: number,
      urlCount: number,
      frameCount: number,
      treeLength: number
    }
  }
}
```

#### 失败响应

```typescript
{
  ok: false,
  error: {
    message: string
  }
}
```

### 示例

#### cURL

```bash
curl -X POST http://localhost:3000/control/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "your-extension-id",
    "tabId": 829139186
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch("http://localhost:3000/control/snapshot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    extensionId: "your-extension-id",
    tabId: 829139186,
    fullSnapshot: false,
    pierceShadow: true
  })
})

const data = await response.json()

if (data.ok) {
  console.log("Tree:", data.result.combinedTree)
  console.log("XPath Map:", data.result.combinedXpathMap)
} else {
  console.error("Error:", data.error.message)
}
```

### 响应示例

```json
{
  "ok": true,
  "result": {
    "tabId": 829139186,
    "sessionId": null,
    "combinedTree": "[0-16] RootWebArea: Stagehand Test Page\n  [0-17] scrollable, html\n    [0-23] body\n      [0-29] button: Click Me\n      [0-5] textbox: Type here",
    "combinedXpathMap": {
      "0-16": "/",
      "0-17": "/html[1]",
      "0-23": "/html[1]/body[1]",
      "0-29": "/html[1]/body[1]/button[1]",
      "0-5": "/html[1]/body[1]/input[1]"
    },
    "combinedUrlMap": {
      "0-16": "http://localhost:3000/test-stagehand.html"
    },
    "perFrame": [
      {
        "frameId": "main",
        "outline": "[0-16] RootWebArea: Stagehand Test Page\n  ...",
        "xpathMap": { ... },
        "urlMap": { ... }
      }
    ],
    "stats": {
      "elementCount": 33,
      "urlCount": 1,
      "frameCount": 1,
      "treeLength": 563
    }
  }
}
```

---

## 使用流程

### 1. 获取页面快照

```javascript
const snapshot = await fetch("/control/snapshot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ extensionId, tabId })
}).then(r => r.json())
```

### 2. 将 combinedTree 发送给 LLM

```javascript
const prompt = `
以下是页面的元素结构：

${snapshot.result.combinedTree}

请找到并返回 "Click Me" 按钮的 elementId。
`

const llmResponse = await callLLM(prompt)
// LLM 返回: { elementId: "0-29" }
```

### 3. 使用 XPath 定位元素

```javascript
const elementId = llmResponse.elementId  // "0-29"
const xpath = snapshot.result.combinedXpathMap[elementId]  // "/html[1]/body[1]/button[1]"

// 使用 XPath 执行操作
await driver.clickSelector(xpath)
```

---

## 验证页面

### GET /control/verify/snapshot

提供一个交互式验证页面，用于测试快照功能。

#### 访问方式

```
http://localhost:3000/control/verify/snapshot
```

#### 功能

1. 自动创建测试标签页
2. 连接 SSE 进行命令转发
3. 导航到测试页面
4. 执行多种快照测试：
   - basic: 基础快照
   - xpath: XPath 映射验证
   - content: 内容验证
   - count: 元素计数验证

#### 测试结果格式

```json
{
  "tabId": 829139186,
  "sse": { "ok": true, "info": { "message": "SSE connected" } },
  "results": {
    "basic": { "pass": true, "snap": { ... } },
    "xpath": { "pass": true, "snap": { ... } },
    "content": { "pass": true, "snap": { ... } },
    "count": { "pass": true, "snap": { ... } }
  }
}
```

---

## 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `Missing body.extensionId` | 未提供扩展 ID | 确保请求体包含 extensionId |
| `Missing body.tabId` | 未提供标签页 ID | 确保请求体包含 tabId |
| `CBOR: stack limit exceeded` | DOM 树过深 | 内部自动处理，无需干预 |
| `Frame with the given...` | Frame 不存在 | 检查 tabId 是否正确 |

### 重试策略

API 内部实现了自动重试：

1. **DOM 深度回退**: 当遇到 CBOR 栈溢出时，自动降低 DOM 获取深度
2. **Frame 范围错误**: 当 frameId 无效时，尝试不带 frameId 重新获取

---

## 性能优化建议

1. **使用 `fullSnapshot: false`**: 单 frame 快照更快
2. **使用 `pierceShadow: true`**: 确保获取 shadow DOM 内容
3. **缓存快照结果**: 对于静态页面可缓存结果
4. **限制调用频率**: 避免频繁调用导致性能问题

---

## 与 Stagehand 原版对比

| 功能 | 原版 Stagehand | 当前实现 |
|------|---------------|---------|
| captureHybridSnapshot | ✅ | ✅ |
| focusSelector | ✅ | ⚠️ 基础支持 |
| ActCache | ✅ | ❌ |
| OOPIF 支持 | ✅ | ⚠️ 基础支持 |
| Shadow DOM | ✅ | ✅ |
