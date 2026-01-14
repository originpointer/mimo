## 扩展：Plugins 与 MCP

### 这篇讲什么
解释 OpenCode 如何接入插件（Plugin hooks）与 MCP（Model Context Protocol）工具，并将其融入“工具调用 + 权限”体系。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/plugin/index.ts`
- `.refer/.sources/opencode/packages/opencode/src/mcp/index.ts`
- `.refer/.sources/opencode/packages/opencode/src/session/prompt.ts`（MCP tools 注入与权限）

## Plugins
### 插件加载
`Plugin.state` 会：
- 创建 opencode SDK client（指向本地 server fetch）
- 构造 `PluginInput`（project/worktree/directory/serverUrl/$ 等）
- 加载内置插件（internal plugins）
- 从 `config.plugin` + 默认 BUILTIN 列表加载外部插件（必要时通过 Bun 安装）

### 插件触发点（hooks）
常用触发点：
- `tool.execute.before` / `tool.execute.after`：所有工具执行前后
- `experimental.chat.messages.transform`：消息预处理（可用于注入提示、清洗）
- `experimental.text.complete`：文本输出完成后处理
- `permission.ask`：旧版 Permission（非 PermissionNext）相关

> 注意：当前“新权限系统”主要走 `PermissionNext`；旧 `Permission` 仍存在但定位不同。

## MCP
### MCP 的定位
MCP 提供“外部工具/资源”的标准协议：OpenCode 将 MCP server 的 tools/prompts/resources 拉进来，让模型像调用内置工具一样调用它们。

### MCP server 类型
- `remote`：HTTP(S) 远程服务，支持 StreamableHTTP 或 SSE，默认启用 OAuth（可关闭）
- `local`：本地进程（stdio transport）

### OAuth 认证要点（remote）
- 遇到 `UnauthorizedError`：状态变为 `needs_auth` 或 `needs_client_registration`
- 提供 `startAuth/authenticate/finishAuth/removeAuth` 管理 OAuth 流程
- 使用 callback server 等待授权回调（实现细节在 MCP 目录内的 auth/callback/provider）

### 暴露 MCP tools 给模型
`MCP.tools()` 会：
- 对每个连接成功的 server：`listTools()`
- 将每个 MCP tool 转为 AI SDK `dynamicTool({ inputSchema, execute })`
- key 命名：`<server>_<toolName>`（字符清洗）

### 统一权限
在 `SessionPrompt.resolveTools` 注入 MCP tools 时，OpenCode 会在真正调用 MCP tool 前先做：
- `ctx.ask({ permission: key, patterns:["*"], always:["*"] })`

因此 MCP 使用也遵循同一授权体系。

### 流程图
```mermaid
flowchart TD
  Config[Config.mcp/plugins] --> PluginLoad[Plugin.state_load]
  Config --> McpInit[MCP.state_connect]

  McpInit --> McpTools[MCP.tools]
  PluginLoad --> Hooks[Plugin.trigger]

  McpTools --> Resolve[SessionPrompt.resolveTools]
  Hooks --> Resolve

  Resolve --> Model[LLM]
  Model --> Call[MCP_tool_call]
  Call --> Perm[ctx.ask(permission=server_tool)]
  Perm --> Exec[MCP_client.callTool]
  Exec --> Result[tool_result]
```
