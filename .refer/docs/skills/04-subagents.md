# 04 协作：与 Subagents（子代理）的关系

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## 关键点

- **Subagents 默认不继承当前会话 Skills**：如果你希望某个自定义子代理使用某些 Skills，需要在子代理定义中显式声明。
- **Skills vs Subagents**：
  - Skills：在“当前对话上下文”里添加标准/知识/流程（Claude 自动选择是否启用）。
  - Subagents：把任务委派到“独立上下文”里执行（工具/资源可不同）。

## 如何让子代理带上 Skills（概念）

在 `.claude/agents/<agent-name>/AGENT.md` 的 frontmatter 里配置 `skills` 字段（列出要加载的 Skill 名称）。

示例（概念）：

```yaml
---
name: code-reviewer
description: 按团队规范审查代码
skills: pr-review, security-check
---
```

> 结论：如果你把“规范/最佳实践”封装成 Skills，又把“重任务/需要隔离”的工作交给 Subagents，就能获得更稳定的可控行为。
