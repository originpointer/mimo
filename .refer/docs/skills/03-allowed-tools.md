# 03 安全：allowed-tools 与最小权限

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## allowed-tools 的目的

`allowed-tools` 用来做“工具白名单”：当某个 Skill（或命令）激活时，Claude 在执行该 Skill 的过程中可以直接使用被允许的工具，而无需逐次请求授权。

典型用途：

- **只读类 Skill**：限制只能 Read/Grep/Glob，避免误写文件。
- **安全敏感工作流**：只允许特定 MCP 工具（例如创建工单），避免越权。

## 写法（概念）

- 对于 Claude Code 的定制文件（Skill/Command/Agent 等），`allowed-tools` 通常写在 YAML frontmatter 中。
- 对于 MCP 工具，常见写法是显式列出工具名数组（例如 `mcp__...`）。

> 注意：如果省略 `allowed-tools`，并不代表“禁止用工具”，而是回到 Claude Code 的默认权限模型（可能会在需要时弹出确认）。

## 最佳实践：最小权限

- 先从 **Read/Grep/Glob** 开始；确认流程成熟后，再逐步放开写入/执行类工具。
- 对于“会修改仓库/外部系统”的能力（写文件、发请求、创建任务等），尽量让 Skill 先明确步骤和校验点，再调用工具。
