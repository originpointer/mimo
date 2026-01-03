# 05 分发：项目/个人/插件/企业与优先级

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## Skills 存放位置（决定谁能用）

- **企业（Enterprise）**：管理员统一下发（路径由企业托管设置决定）
- **个人（Personal）**：`~/.claude/skills/`（你本人、跨项目）
- **项目（Project）**：`<repo>/.claude/skills/`（仓库内共享）
- **插件（Plugin）**：随插件一起分发（插件根目录 `skills/` 下）

## 同名 Skill 的优先级

当多个位置存在同名 Skill 时，优先级是：

**Enterprise > Personal > Project > Plugin**

这意味着：

- 团队/企业可以覆盖个人偏好
- 个人配置可以覆盖项目默认
- 项目可以覆盖插件内置

## 插件中的 Skill 结构（要点）

插件 Skill 通常位于插件根目录的 `skills/<skill-name>/SKILL.md`，并可附带：

- `references/`
- `examples/`
- `scripts/`

（这样安装插件后，Skill 会被自动发现并可用。）
