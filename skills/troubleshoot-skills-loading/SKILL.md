---
name: troubleshoot-skills-loading
description: 当用户提到“skills 不触发/不加载/冲突/优先级/分发”时，按步骤给出排查清单，并输出可复现的最小诊断信息收集指引。
---

## 指令

- 先要求用户提供最小诊断信息（如果上下文缺失）：
  - skills 目录位置（例如 SKILLS_DIR 或 ~/.claude/skills）
  - 目标 skill 的目录名与 SKILL.md 路径
  - 是否存在多个来源（项目/个人/插件/企业）
  - 最近是否改过文件名大小写（SKILL.md 大小写敏感）
- 按从易到难的顺序排查：
  - 路径与权限：目录存在、可读、没有软链/权限问题
  - 结构：是否满足 <skill-name>/SKILL.md
  - frontmatter：是否以 --- 开头并正确闭合；name/description 是否为空
  - 触发：description 是否具体（包含用户可能说出的短语/动作）
  - 冲突：是否有同名 skill 或优先级覆盖
- 给出修复建议：
  - 如何重命名/拆分 description
  - 如何避免误触发/不触发

## 输出格式

- 现象：...
- 诊断信息（待补充清单）：
  - skillsDir: ...
  - skillPath: ...
  - sources: ...
- 排查步骤（逐条可打勾）：
  - [ ] 路径与权限
  - [ ] 目录结构
  - [ ] frontmatter
  - [ ] description 触发器
  - [ ] 冲突与优先级
- 可能原因（按概率排序）：...
- 建议修复：...

## 常见坑

- `SKILL.md` 文件名大小写不一致（导致加载不到）。
- frontmatter 没有闭合 `---`，后续正文都被当成元数据。
- description 太泛或太短，既可能不触发也可能误触发。
- 同名 skills 在不同来源中被覆盖，误以为“没加载”。
