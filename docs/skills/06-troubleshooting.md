# 06 排错：不触发/不加载/冲突

参考：官方说明见 [Claude Code Agent Skills 文档](https://code.claude.com/docs/en/skills)。

## 1) Skill 不触发

常见原因：`description` 太泛、没有包含用户会说的关键词。

处理建议：

- 把描述改成“具体动作 + 触发短语”，例如：
  - “当用户问‘帮我写提交信息/生成 commit message’时使用”
  - “当用户提到 hook 事件（PreToolUse/PostToolUse）时使用”
- 测试时在提问里显式包含这些短语，验证触发路径。

## 2) Skill 不加载

优先检查：

- **路径是否正确**：必须在正确目录下，且文件名必须是 `SKILL.md`（大小写敏感）。
- **YAML 是否有效**：frontmatter 必须从第 1 行 `---` 开始，结束也要有 `---`；缩进用空格不要用 tab。

## 3) Skill 有错误/行为异常

- 如果 Skill 依赖外部脚本/工具，确认脚本路径正确、权限正确（可执行）
- 避免在正文里引用不存在的文件

## 4) 多个 Skills 冲突（误触发/混淆）

- 让不同 Skill 的 `description` **更“不同”**：用更具体的领域词与触发短语，减少语义重叠。

## 5) 插件 Skills 不出现

- 确认插件目录结构正确：插件根目录必须有 `skills/`，且每个 Skill 在独立子目录内包含 `SKILL.md`。
- 需要时清理插件缓存并重装插件（官方文档给了对应命令与流程）。
