# MCP 工具集成 (MCP Tools Integration)

## 概述 (Overview)

本文档介绍 Nitro-app 中的 Model Context Protocol (MCP) 工具集成，包括工具注册、调用和执行流程。

## MCP 注册模式 (MCP Registry Pattern)

### MCP Registry 实现

```typescript
// server/lib/mcp/registry.ts
import { z } from "zod";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema | z.ZodTypeAny;
  handler: (
    args: unknown,
    context?: McpContext
  ) => Promise<McpResult>;
}

export interface McpResult {
  title: string;
  content: Array<{
    type: "text" | "image";
    text?: string;
    data?: string;  // base64 for images
  }>;
  meta?: {
    truncated?: boolean;
    [key: string]: unknown;
  };
}

export interface McpContext {
  requestId?: string;
  logger?: (message: LogLine) => void;
}

export function createMcpRegistry() {
  const tools = new Map<string, McpTool>();

  return {
    register(tool: McpTool) {
      if (tools.has(tool.name)) {
        throw new Error(`Tool already registered: ${tool.name}`);
      }
      tools.set(tool.name, tool);
      return this;
    },

    get(name: string): McpTool | undefined {
      return tools.get(name);
    },

    has(name: string): boolean {
      return tools.has(name);
    },

    list(): Array<{ name: string; description: string }> {
      return Array.from(tools.values()).map(t => ({
        name: t.name,
        description: t.description,
      }));
    },

    async call(
      name: string,
      args: unknown,
      context?: McpContext
    ): Promise<McpResult> {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // 验证输入
      const validatedArgs = tool.inputSchema.parse(args);

      // 执行工具
      return await tool.handler(validatedArgs, context);
    },
  };
}
```

### 注册工具

```typescript
// server/lib/mcp/index.ts
import { createMcpRegistry } from "./registry";
import { mcpReadTextTool } from "./tools/readText";
import { mcpListTreeTool } from "./tools/listTree";
import { mcpGlobFilesTool } from "./tools/globFiles";
import { mcpGrepFilesTool } from "./tools/grepFiles";

export const mcpRegistry = createMcpRegistry()
  .register(mcpReadTextTool)
  .register(mcpListTreeTool)
  .register(mcpGlobFilesTool)
  .register(mcpGrepFilesTool);
```

## 可用工具 (Available Tools)

### 1. readText - 读取文件

**功能**: 从 Nitro uploads 目录读取文本文件

**Schema**:
```typescript
import { z } from "zod";

export const ReadTextInputSchema = z.object({
  path: z.string().describe("文件相对路径，如 2026-01-20/upload/file.html"),
  offset: z.number().optional().describe("起始行号（0-based）"),
  limit: z.number().optional().describe("读取行数限制"),
});
```

**工具定义**:
```typescript
// server/lib/mcp/tools/readText.ts
import { McpTool } from "../registry";
import { ReadTextInputSchema } from "./schemas";
import { readTextInUploads } from "~/server/lib/tools/readText";

export const mcpReadTextTool: McpTool = {
  name: "readText",
  description: "读取 Nitro uploads 目录中的文本文件内容",
  inputSchema: ReadTextInputSchema,
  async handler(args, ctx) {
    const result = await readTextInUploads(args);
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        truncated: result.metadata.truncated,
        totalLines: result.metadata.totalLines,
        readLines: result.metadata.readLines,
      },
    };
  },
};
```

**使用示例**:
```bash
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "readText",
    "args": {
      "path": "2026-01-20/upload/index.html",
      "offset": 0,
      "limit": 100
    }
  }'
```

### 2. listTree - 列出目录

**功能**: 列出 uploads 目录的文件树结构

**Schema**:
```typescript
export const ListTreeInputSchema = z.object({
  path: z.string().optional().describe("目录相对路径，默认为根目录"),
  limit: z.number().optional().describe("子项数量限制"),
});
```

**工具定义**:
```typescript
export const mcpListTreeTool: McpTool = {
  name: "listTree",
  description: "列出 uploads 目录中的文件和子目录",
  inputSchema: ListTreeInputSchema,
  async handler(args, ctx) {
    const result = await listTreeInUploads(args);
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        truncated: result.metadata.truncated,
        totalItems: result.metadata.totalItems,
      },
    };
  },
};
```

### 3. globFiles - 查找文件

**功能**: 使用 glob 模式查找文件

**Schema**:
```typescript
export const GlobFilesInputSchema = z.object({
  pattern: z.string().describe("Glob 模式，如 **/*.html"),
  path: z.string().optional().describe("搜索根目录"),
  limit: z.number().optional().describe("结果数量限制"),
});
```

**工具定义**:
```typescript
export const mcpGlobFilesTool: McpTool = {
  name: "globFiles",
  description: "使用 glob 模式在 uploads 目录中查找文件",
  inputSchema: GlobFilesInputSchema,
  async handler(args, ctx) {
    const result = await globFilesInUploads(args);
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        truncated: result.metadata.truncated,
        matchedFiles: result.metadata.matchedFiles,
      },
    };
  },
};
```

### 4. grepFiles - 搜索内容

**功能**: 在文件内容中搜索匹配的文本

**Schema**:
```typescript
export const GrepFilesInputSchema = z.object({
  pattern: z.string().describe("搜索模式（正则表达式）"),
  flags: z.string().optional().describe("正则标志，如 i, m, g"),
  include: z.string().optional().describe("文件包含模式，如 *.html"),
  path: z.string().optional().describe("搜索根目录"),
  limit: z.number().optional().describe("结果数量限制"),
});
```

**工具定义**:
```typescript
export const mcpGrepFilesTool: McpTool = {
  name: "grepFiles",
  description: "在 uploads 目录的文件内容中搜索匹配的文本",
  inputSchema: GrepFilesInputSchema,
  async handler(args, ctx) {
    const result = await grepFilesInUploads(args);
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        truncated: result.metadata.truncated,
        matchedFiles: result.metadata.matchedFiles,
        totalMatches: result.metadata.totalMatches,
      },
    };
  },
};
```

## HTTP API 端点 (HTTP API Endpoints)

### GET /api/mcp/tools - 列出所有工具

```typescript
// server/routes/api/mcp/tools.get.ts
export default defineEventHandler((event) => {
  const tools = mcpRegistry.list();

  return {
    ok: true,
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
    })),
  };
});
```

**响应示例**:
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

### POST /api/mcp/call - 调用工具

```typescript
// server/routes/api/mcp/call.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { name, args } = body;

    // 验证工具存在
    if (!mcpRegistry.has(name)) {
      throw createError({
        statusCode: 404,
        message: `Tool not found: ${name}`,
      });
    }

    // 调用工具
    const result = await mcpRegistry.call(name, args, {
      requestId: `mcp-${Date.now()}`,
    });

    return {
      ok: true,
      result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: "Invalid input",
        data: error.errors,
      });
    }
    throw error;
  }
});
```

**请求示例**:
```bash
curl -X POST http://localhost:6006/api/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "readText",
    "args": {
      "path": "2026-01-20/upload/index.html",
      "offset": 0,
      "limit": 50
    }
  }'
```

**响应示例**:
```json
{
  "ok": true,
  "result": {
    "title": "2026-01-20/upload/index.html",
    "content": [
      {
        "type": "text",
        "text": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>..."
      }
    ],
    "meta": {
      "truncated": false,
      "totalLines": 150,
      "readLines": 50
    }
  }
}
```

## 添加新工具 (Adding New Tools)

### 步骤 1: 创建工具处理器

```typescript
// server/lib/tools/myTool.ts
export interface MyToolArgs {
  param1: string;
  param2?: number;
}

export interface MyToolResult {
  output: string;
  metadata: {
    [key: string]: unknown;
  };
}

export async function myToolInUploads(
  args: MyToolArgs
): Promise<MyToolResult> {
  // 实现工具逻辑
  const result = processSomething(args.param1, args.param2);

  return {
    output: result,
    metadata: {
      processed: true,
      timestamp: Date.now(),
    },
  };
}
```

### 步骤 2: 创建 MCP 包装器

```typescript
// server/lib/mcp/tools/myTool.ts
import { z } from "zod";
import { McpTool } from "../registry";
import { myToolInUploads } from "~/server/lib/tools/myTool";

export const MyToolInputSchema = z.object({
  param1: z.string().describe("参数 1 描述"),
  param2: z.number().optional().describe("参数 2 描述"),
});

export const mcpMyTool: McpTool = {
  name: "myTool",
  description: "工具功能描述",
  inputSchema: MyToolInputSchema,
  async handler(args, ctx) {
    const result = await myToolInUploads(args);
    return {
      title: "MyTool Result",
      content: [{ type: "text", text: result.output }],
      meta: result.metadata,
    };
  },
};
```

### 步骤 3: 注册工具

```typescript
// server/lib/mcp/index.ts
import { mcpMyTool } from "./tools/myTool";

export const mcpRegistry = createMcpRegistry()
  .register(mcpReadTextTool)
  .register(mcpListTreeTool)
  .register(mcpGlobFilesTool)
  .register(mcpGrepFilesTool)
  .register(mcpMyTool);  // 新增工具
```

## 工具上下文与执行流程 (Tool Context & Execution Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Request                                                 │
│  POST /api/mcp/call                                            │
│  { "name": "readText", "args": { "path": "..." } }              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Handler (mcp/call.post.ts)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Parse request body                                   │  │
│  │  2. Check tool exists                                    │  │
│  │  3. Call mcpRegistry.call()                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MCP Registry                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Get tool by name                                     │  │
│  │  2. Validate input with Zod schema                       │  │
│  │  3. Execute tool.handler()                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Tool Handler (tools/readText.ts)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Execute core logic (readTextInUploads)               │  │
│  │  2. Format output as MCP result                          │  │
│  │  3. Return with metadata                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response                                                       │
│  {                                                              │
│    "ok": true,                                                  │
│    "result": {                                                  │
│      "title": "...",                                            │
│      "content": [{ "type": "text", "text": "..." }],            │
│      "meta": { ... }                                            │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## LLM 工具调用集成 (LLM Tool Calling Integration)

### 定义 LLM 工具

```typescript
import { generateText } from "ai";

const result = await generateText({
  model: provider.chat("qwen-max"),
  messages: [{
    role: "user",
    content: "Read the file at uploads/2026-01-20/index.html and tell me what's in it"
  }],
  tools: {
    readText: {
      description: "Read a text file from the uploads directory",
      parameters: z.object({
        path: z.string().describe("File path relative to uploads"),
        offset: z.number().optional().describe("Starting line number"),
        limit: z.number().optional().describe("Number of lines to read"),
      }),
      execute: async (args) => {
        // 调用 MCP 工具
        const result = await mcpRegistry.call("readText", args);
        return result;
      },
    },
  },
});

// 检查工具调用
if (result.toolCalls?.length > 0) {
  for (const toolCall of result.toolCalls) {
    console.log(`Tool: ${toolCall.toolName}`);
    console.log(`Args:`, toolCall.args);
    console.log(`Result:`, toolCall.result);
  }
}
```

## 相关文件 (Related Files)

### Nitro-App 实现
- [server/lib/mcp/registry.ts](../../server/lib/mcp/registry.ts) - MCP 注册表
- [server/lib/mcp/tools/](../../server/lib/mcp/tools/) - 工具实现
- [server/lib/tools/](../../server/lib/tools/) - 核心工具逻辑
- [server/routes/api/mcp/](../../server/routes/api/mcp/) - HTTP API 端点
