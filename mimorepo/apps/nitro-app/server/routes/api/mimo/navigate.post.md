# Mimo Navigate API 使用文档

## 概述

`/api/mimo/navigate` 是一个 POST API 路由，用于将浏览器导航到指定的 URL。该 API 通过 Mimo 实例与浏览器进行通信，支持多种导航选项。

## 文件位置

```
@/mimorepo/apps/nitro-app/server/routes/api/mimo/navigate.post.ts
```

## 端点信息

- **方法**: `POST`
- **路径**: `/api/mimo/navigate`
- **Content-Type**: `application/json`

## 请求参数

### 请求体 (JSON)

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `url` | `string` | 是 | 要导航的目标 URL |
| `options` | `NavigateOptions` | 否 | 导航选项（详见下表） |

### NavigateOptions 可选参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `waitUntil` | `'load' \| 'domcontentloaded' \| 'networkidle'` | `'load'` | 等待导航完成的时机 |
| `timeout` | `number` | Mimo 默认超时 | 导航超时时间（毫秒） |
| `referer` | `string` | - | HTTP Referer 头部值 |
| `tabId` | `string` | Mimo 默认标签页 | 目标浏览器标签页 ID |

### waitUntil 参数详解

| 值 | 描述 |
|----|------|
| `load` | 等待 `load` 事件触发（页面完全加载） |
| `domcontentloaded` | 等待 `DOMContentLoaded` 事件触发（DOM 加载完成） |
| `networkidle` | 等待网络至少 500ms 处于空闲状态 |

## 请求示例

### 基本导航

```bash
curl -X POST http://localhost:3000/api/mimo/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

### 带选项的导航

```bash
curl -X POST http://localhost:3000/api/mimo/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "waitUntil": "networkidle",
      "timeout": 30000,
      "referer": "https://google.com"
    }
  }'
```

### JavaScript/TypeScript 示例

```typescript
const response = await fetch('/api/mimo/navigate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      waitUntil: 'networkidle',
      timeout: 30000,
    },
  }),
});

const result = await response.json();
console.log(result);
```

## 响应格式

### 成功响应

**HTTP 状态码**: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Navigated successfully",
    "url": "https://example.com"
  }
}
```

### 错误响应

**HTTP 状态码**: `400 Bad Request` (参数错误) 或 `500 Internal Server Error` (服务器错误)

```json
{
  "statusCode": 400,
  "message": "Missing or invalid \"url\" parameter"
}
```

或

```json
{
  "statusCode": 500,
  "message": "Failed to navigate",
  "data": {
    "code": "NAVIGATION_ERROR",
    "stack": "Error: Navigation timeout\n    at ..."
  }
}
```

**注意**: 堆栈信息 (`stack`) 仅在开发环境 (`NODE_ENV=development`) 中返回。

## 响应字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `success` | `boolean` | API 调用是否成功 |
| `data` | `NavigateResult` | 导航结果详情 |
| `data.success` | `boolean` | 导航操作是否成功 |
| `data.message` | `string` | 结果消息描述 |
| `data.url` | `string` | 导航的目标 URL |

## 错误码

| HTTP 状态码 | 错误描述 |
|-------------|----------|
| `400` | URL 参数缺失或无效 |
| `500` | 导航失败（可能原因：超时、网络错误、Mimo 未连接等） |

## 常见错误场景

### 1. URL 参数缺失

```json
{
  "statusCode": 400,
  "message": "Missing or invalid \"url\" parameter"
}
```

**解决方案**: 确保请求体包含有效的 `url` 字符串。

### 2. 导航超时

```json
{
  "statusCode": 500,
  "message": "Navigation timeout",
  "data": {
    "code": "TIMEOUT"
  }
}
```

**解决方案**: 增加 `options.timeout` 值或检查网络连接。

### 3. Mimo 未连接

```json
{
  "statusCode": 500,
  "message": "Mimo not connected",
  "data": {
    "code": "NOT_CONNECTED"
  }
}
```

**解决方案**: 确保 Mimo 实例已正确初始化并连接。

## 实现细节

### 底层流程

```
客户端请求
    ↓
navigate.post.ts (验证参数)
    ↓
getMimoInstance() (获取 Mimo 实例)
    ↓
mimo.navigate(url, options) (执行导航)
    ↓
MimoBus.send() (通过 WebSocket 发送命令)
    ↓
浏览器执行导航
    ↓
返回结果
```

### 相关类型定义

```typescript
// packages/@mimo/types/src/context.ts
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  referer?: string;
  tabId?: string;
}

// packages/@mimo/types/src/core.ts
export interface NavigateResult {
  success: boolean;
  message: string;
  url: string;
}
```

## 最佳实践

1. **设置合理的超时时间**: 根据页面加载速度调整 `timeout` 值
2. **选择合适的 waitUntil 策略**:
   - 简单页面使用 `'domcontentloaded'` 可加快响应
   - 复杂 SPA 应用使用 `'networkidle'` 确保加载完成
3. **错误处理**: 始终检查响应中的 `success` 字段
4. **Tab 管理**: 使用 `tabId` 参数指定目标标签页，避免在错误的标签页中导航

## 相关文件

- [navigate.post.ts](navigate.post.ts) - API 路由实现
- [mimo.ts](../../../../../packages/@mimo/core/src/mimo.ts) - Mimo 核心类
- [context.ts](../../../../../packages/@mimo/types/src/context.ts) - 类型定义
- [instance.ts](../lib/mimo/instance.ts) - Mimo 实例管理
