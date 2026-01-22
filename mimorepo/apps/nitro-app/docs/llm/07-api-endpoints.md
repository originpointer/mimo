# HTTP API 参考 (HTTP API Reference)

## 概述 (Overview)

本文档提供 Nitro-app 中所有 LLM 相关的 HTTP API 端点详细说明，包括请求/响应格式和错误处理。

## 基础信息 (Base Information)

| 属性 | 值 |
|------|-----|
| **基础 URL** | `http://localhost:6006` |
| **Content-Type** | `application/json` |
| **CORS 源** | `http://localhost:3000`（可通过 `CORS_ORIGIN` 配置） |

## 通用响应格式

### 成功响应

```json
{
  "ok": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "ok": false,
  "error": "错误消息",
  "issues": [
    {
      "code": "invalid_type",
      "message": "验证错误详情"
    }
  ]
}
```

## POST /api/chat - 流式聊天

### 描述

使用 Qwen/DashScope 模型进行流式聊天对话，返回 Server-Sent Events (SSE) 格式的响应。

### 请求

**URL**: `POST /api/chat`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下你自己"
    }
  ]
}
```

**参数说明**:

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `messages` | Array | ✅ | 消息数组 |
| `messages[].role` | string | ✅ | 消息角色：`system`, `user`, `assistant`, `tool` |
| `messages[].content` | string | ✅ | 消息内容 |
| `messages[].parts` | Array | ❌ | 消息部分（多模态内容） |

### 响应

**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**格式**: Server-Sent Events (SSE)

### 完整示例

```bash
curl -X POST http://localhost:6006/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "你好！" }
    ]
  }'
```

### 错误响应

| 状态码 | 错误 | 原因 | 解决方案 |
|--------|------|------|----------|
| 400 | `Invalid messages format` | 消息格式错误 | 检查 messages 数组格式 |
| 400 | `Invalid message content` | 消息内容为空 | 确保 content 不为空 |
| 500 | `DASHSCOPE_API_KEY is not configured` | API Key 未配置 | 设置环境变量 |

## GET /api/mcp/tools - 列出 MCP 工具

### 描述

列出所有可用的 MCP (Model Context Protocol) 工具及其描述。

### 请求

**URL**: `GET /api/mcp/tools`

**Headers**:
```
Content-Type: application/json
```

### 响应

```json
{
  "ok": true,
  "tools": [
    {
      "name": "readText",
      "description": "读取 Nitro uploads 目录中的文本文件内容"
    },
    {
      "name": "listTree",
      "description": "列出 uploads 目录中的文件和子目录"
    },
    {
      "name": "globFiles",
      "description": "使用 glob 模式在 uploads 目录中查找文件"
    },
    {
      "name": "grepFiles",
      "description": "在 uploads 目录的文件内容中搜索匹配的文本"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `ok` | boolean | 请求是否成功 |
| `tools` | Array | 工具列表 |
| `tools[].name` | string | 工具名称 |
| `tools[].description` | string | 工具描述 |

### 完整示例

```bash
curl http://localhost:6006/api/mcp/tools
```

## POST /api/mcp/call - 调用 MCP 工具

### 描述

执行指定的 MCP 工具并返回结果。

### 请求

**URL**: `POST /api/mcp/call`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "name": "readText",
  "args": {
    "path": "2026-01-20/upload/index.html",
    "offset": 0,
    "limit": 100
  }
}
```

**参数说明**:

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `name` | string | ✅ | 工具名称 |
| `args` | object | ✅ | 工具参数（符合工具的 inputSchema） |

### 响应

**成功响应**:
```json
{
  "ok": true,
  "result": {
    "title": "2026-01-20/upload/index.html",
    "content": [
      {
        "type": "text",
        "text": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n..."
      }
    ],
    "meta": {
      "truncated": false,
      "totalLines": 150,
      "readLines": 100
    }
  }
}
```

**字段说明**:

| 字段 | 类型 | 描述 |
|------|------|------|
| `ok` | boolean | 请求是否成功 |
| `result.title` | string | 结果标题 |
| `result.content` | Array | 内容数组 |
| `result.content[].type` | string | 内容类型：`text`, `image` |
| `result.content[].text` | string | 文本内容 |
| `result.meta` | object | 元数据 |
| `result.meta.truncated` | boolean | 是否被截断 |

### 工具参数

#### readText

```json
{
  "name": "readText",
  "args": {
    "path": "2026-01-20/upload/index.html",
    "offset": 0,
    "limit": 100
  }
}
```

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `path` | string | ✅ | 文件相对路径 |
| `offset` | number | ❌ | 起始行号（0-based） |
| `limit` | number | ❌ | 读取行数限制 |

#### listTree

```json
{
  "name": "listTree",
  "args": {
    "path": "2026-01-20",
    "limit": 50
  }
}
```

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `path` | string | ❌ | 目录相对路径（默认根目录） |
| `limit` | number | ❌ | 子项数量限制 |

#### globFiles

```json
{
  "name": "globFiles",
  "args": {
    "pattern": "**/*.html",
    "path": "2026-01-20",
    "limit": 20
  }
}
```

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `pattern` | string | ✅ | Glob 模式 |
| `path` | string | ❌ | 搜索根目录 |
| `limit` | number | ❌ | 结果数量限制 |

#### grepFiles

```json
{
  "name": "grepFiles",
  "args": {
    "pattern": "function\\s+\\w+",
    "flags": "i",
    "include": "*.ts",
    "path": "2026-01-20",
    "limit": 30
  }
}
```

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `pattern` | string | ✅ | 正则表达式模式 |
| `flags` | string | ❌ | 正则标志（如 `i`, `m`, `g`） |
| `include` | string | ❌ | 文件包含模式 |
| `path` | string | ❌ | 搜索根目录 |
| `limit` | number | ❌ | 结果数量限制 |

### 完整示例

```bash
# 读取文件
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "readText",
    "args": {
      "path": "2026-01-20/upload/index.html",
      "limit": 50
    }
  }'

# 列出目录
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "listTree",
    "args": {
      "path": "2026-01-20"
    }
  }'

# 查找文件
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "globFiles",
    "args": {
      "pattern": "**/*.html"
    }
  }'

# 搜索内容
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "grepFiles",
    "args": {
      "pattern": "import.*from",
      "include": "*.ts"
    }
  }'
```

### 错误响应

| 状态码 | 错误 | 原因 | 解决方案 |
|--------|------|------|----------|
| 404 | `Tool not found: {name}` | 工具不存在 | 检查工具名称 |
| 400 | `Invalid input` | 参数验证失败 | 检查参数格式 |

## POST /api/tools/{toolName} - 直接调用工具

### 描述

直接调用特定的工具，无需指定工具名称。

### 工具端点

| 端点 | 工具 | 描述 |
|------|------|------|
| `POST /api/tools/read` | readText | 读取文件 |
| `POST /api/tools/list` | listTree | 列出目录 |
| `POST /api/tools/glob` | globFiles | 查找文件 |
| `POST /api/tools/grep` | grepFiles | 搜索内容 |

### 请求示例

```bash
# 读取文件
curl -X POST http://localhost:6006/api/tools/read \
  -H "Content-Type: application/json" \
  -d '{
    "path": "2026-01-20/upload/index.html",
    "limit": 100
  }'
```

## 错误处理 (Error Handling)

### 通用错误格式

```json
{
  "ok": false,
  "error": "错误消息",
  "issues": [
    {
      "code": "error_code",
      "message": "详细错误信息",
      "path": ["field", "nested"]
    }
  ]
}
```

### 常见错误

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求格式错误或参数无效 |
| 404 | Not Found | 资源或工具不存在 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | LLM 服务不可用 |

### 错误码

| 错误码 | 描述 |
|--------|------|
| `invalid_type` | 类型验证失败 |
| `too_small` | 值过小 |
| `too_big` | 值过大 |
| `invalid_enum` | 枚举值无效 |
| `unrecognized_keys` | 未识别的字段 |

## CORS 配置 (CORS Configuration)

### 默认配置

```typescript
setResponseHeaders(event, {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});
```

### 环境变量

```bash
# 设置允许的 CORS 源
export CORS_ORIGIN="http://localhost:3000"

# 或允许多个源（需要代码支持）
export CORS_ORIGIN="http://localhost:3000,https://example.com"
```

## 使用 Postman 测试

### 1. 流式聊天测试

1. 创建新请求
2. 设置方法：`POST`
3. 设置 URL：`http://localhost:6006/api/chat`
4. 设置 Headers：
   ```
   Content-Type: application/json
   ```
5. 设置 Body：
   ```json
   {
     "messages": [
       { "role": "user", "content": "你好！" }
     ]
   }
   ```

### 2. MCP 工具测试

**列出工具**：
1. 设置方法：`GET`
2. 设置 URL：`http://localhost:6006/api/mcp/tools`

**调用工具**：
1. 设置方法：`POST`
2. 设置 URL：`http://localhost:6006/api/mcp/call`
3. 设置 Body：
   ```json
   {
     "name": "readText",
     "args": {
       "path": "2026-01-20/upload/index.html"
     }
   }
   ```

## 相关文件 (Related Files)

### API 实现
- [server/routes/api/chat.post.ts](../../server/routes/api/chat.post.ts) - 聊天端点
- [server/routes/api/mcp/tools.get.ts](../../server/routes/api/mcp/tools.get.ts) - 列出工具
- [server/routes/api/mcp/call.post.ts](../../server/routes/api/mcp/call.post.ts) - 调用工具
- [server/routes/api/tools/](../../server/routes/api/tools/) - 直接工具端点

### 前端集成
- [apps/next-app/app/chat/[id]/ChatRuntime.tsx](../../../next-app/app/chat/[id]/ChatRuntime.tsx) - 聊天运行时
