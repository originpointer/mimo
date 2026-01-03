# 01 概览：Claude Code Skills（Agent Skills）是什么

Skills（也叫 Agent Skills）是 Claude Code 的一种“自动触发”的能力扩展方式：你用一个 `SKILL.md` 讲清楚“什么时候用、怎么用”，Claude 会根据你的请求语义自动决定是否启用该 Skill。

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## 核心特性

- **自动触发（model-invoked）**：你不用显式调用；Claude 会根据请求与 Skill `description` 的语义相似度决定是否使用。
- **渐进加载（progressive disclosure）**：启动时只加载 Skill 的“名称+描述”，当匹配时再加载完整 `SKILL.md` 内容（因此 `description` 的写法很关键）。
- **可组织/可共享**：Skill 可以是个人级、项目级，也可以随插件分发（企业级可统一下发）。

## 什么时候用 Skills（对比其他自定义方式）

官方文档把它和以下机制区分得很清楚：

- **Skills**：给 Claude 提供“专门知识/流程规范”，并让它在合适时机自动使用。
- **Slash commands**：可复用的命令模板，需要你显式输入 `/xxx` 才运行。
- **CLAUDE.md（Memory/项目指令）**：每次对话都加载的项目级常驻规则。
- **Subagents（子代理）**：在隔离上下文里跑的代理，用于委派任务；默认不会继承当前会话的 Skills（需显式配置）。
- **Hooks**：在特定事件触发时运行脚本/动作（例如工具调用前后）。
- **MCP servers**：提供“外部工具/数据连接”；Skill 更像“教你怎么用工具”，MCP 是“提供工具本身”。

## Skills 的工作流程（心智模型）

- **Discovery**：启动时只读每个 Skill 的 `name` 与 `description`。
- **Activation**：当请求与描述匹配时，Claude 会提示启用该 Skill（通过确认后再加载全文）。
- **Execution**：Claude 按 Skill 中的步骤、示例与约束执行。

> 实务建议：把 `description` 写成“用户会怎么问”的关键词/短语集合，触发率与准确率会显著提升。
