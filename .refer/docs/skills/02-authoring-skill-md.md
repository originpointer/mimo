# 02 编写：SKILL.md 结构与触发设计

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## Skill 放在哪里

Skill 的本体是一个目录，目录里必须有 `SKILL.md`（大小写敏感）。常见两种：

- **个人 Skill**：`~/.claude/skills/<skill-name>/SKILL.md`（对你所有项目生效）
- **项目 Skill**：`<repo>/.claude/skills/<skill-name>/SKILL.md`（随仓库共享）

（插件 Skill 的结构见后续“分发”章节。）

## SKILL.md 必备结构

`SKILL.md` 由两部分组成：

1. 文件开头的 **YAML frontmatter**（`---` 包裹）
2. 后续的 **Markdown 指令正文**（告诉 Claude 具体如何做）

最小示例：

```markdown
---
name: explaining-code
description: 解释代码时使用图示与类比。用于“解释代码如何工作/讲解代码库/用户问怎么工作”等场景。
---

## 指令

- 先给类比
- 再画 ASCII 图
- 按步骤讲清流程
- 最后提醒一个常见坑
```

## description 写法：决定是否触发

因为启动时只加载 `name+description`，所以 `description` 实际上承担“触发器”角色。

建议：

- **写具体动作**：例如“生成提交信息”“审查 PR”“把 PDF 提取成结构化表格”。
- **写用户会说的触发短语**：例如“帮我创建一个 hook”“为什么这段代码这么慢”。
- **避免泛泛而谈**：像“帮助处理文档”太宽，会导致不触发或误触发。

## 支持多文件（渐进披露）

当 Skill 复杂时，推荐把细节拆到同目录的其他文件：

- `references/`：参考资料
- `examples/`：示例输入输出
- `scripts/`：工具脚本（如需要）

主 `SKILL.md` 保持“入口简洁 + 指向详细文件”。
