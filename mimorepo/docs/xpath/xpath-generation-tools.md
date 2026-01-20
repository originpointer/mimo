---
title: XPath 清单生成与落盘-工具集说明
audience: LLM-agent
scope: 从本地 HTML 片段读取 → 生成 XPath 列表文档 → 落盘保存（可选：自检）
examples:
  input_html: mimorepo/apps/nitro-app/.data/uploads/2026-01-20/f02d644b-4656-44dd-8846-2382a4769e05/mimo-innerhtml-h.liepin.com-829142509-20260120-114044.html
  output_doc: mimorepo/docs/xpath/liepin-829142509.md
---

## 背景与输入/输出

- **输入**：一个 HTML 文件（常见是“HTML 片段”，不是完整 `<html>...</html>` 文档）。
- **输出**：一个 Markdown 文档，按模块分组列出 XPath（本项目约束：**所有 XPath 以 `/html[1]/body[1]` 开头**），用于复制到 tools 页面验证。

> 常见约束/坑：当输入是 HTML 片段时，如果你需要“从 `/html[1]/body[1]` 开始的绝对 XPath”在解析器里可用，通常要在解析时人为包裹一层 `<html><body>...`；但“写到文档里”的 XPath 仍遵循 `/html[1]/body[1]...` 的约束。

## 流程分解（与实现语言无关）

1. **读取源 HTML**：理解 DOM 大致结构、锚点（如 `id="resume-detail-basic-info"`）与字段分布。
2. **定位/检索字段 DOM（可选）**：用字符串检索/语义检索找关键节点与稳定锚点，减少 XPath 对层级的依赖。
3. **组织 XPath 清单**：按“基本信息/工作经历/项目经历/...”分组；列表型字段提供 `...[1]...` 示例并说明可替换下标。
4. **确保目标目录存在**：例如 `mimorepo/docs/xpath/`。
5. **落盘写入文档**：生成 `*.md` 文件。
6. **抽查关键 XPath（可选）**：用脚本/解析器验证若干 XPath 是否能命中预期节点/文本。

## 工具清单（逐个说明）

下面按“**必需** / **可选但常用** / **可选（验证/自检）** / **可选（交互/规划/质量）**”分组说明工具。

---

### Read（必需）

- **功能**：读取本地文件内容（文本、图片、PDF；本任务主要用于读取 HTML/Markdown）。
- **作用**：
  - 读取源 HTML 以理解 DOM 结构、字段位置、稳定锚点（`id`、`class`）。
  - 读取已生成的 XPath 文档进行复核或增量更新。
- **参数**：
  - **`path`**（string，必填）：要读取的文件**绝对路径**。
  - **`offset`**（number，可选）：从第几行开始读（1-based 语义，由工具实现；通常用于大文件分页）。
  - **`limit`**（number，可选）：最多读多少行。
- **返回值/输出**：
  - 文本文件：按 `LINE_NUMBER|LINE_CONTENT` 形式返回（带行号便于引用与定位）。
  - 若文件不存在/为空：返回相应错误或 “File is empty.”。

---

### LS（必需）

- **功能**：列出某目录下的文件与子目录（不显示点文件/点目录）。
- **作用**：
  - 确认目标目录（如 `mimorepo/docs/xpath/`）是否存在、目录内有哪些文档。
  - 在落盘前，避免写到错误位置。
- **参数**：
  - **`target_directory`**（string，必填）：要列出的目录**绝对路径**。
  - **`ignore_globs`**（string[]，可选）：忽略的 glob 模式数组。
- **返回值/输出**：
  - 目录树（截断显示），包含文件名/子树摘要等元信息。

---

### ApplyPatch（必需）

- **功能**：以“安全补丁”的方式新增/更新文件内容（适合落盘文档、改代码）。
- **作用**：
  - 新增 `mimorepo/docs/xpath/*.md` 文档。
  - 更新已有 XPath 文档（例如补充字段 XPath 或修正写法）。
- **参数**：
  - **FREEFORM patch**（必填）：遵循工具要求的补丁语法：
    - 只能 **一次操作一个文件**。
    - 文件路径必须是**绝对路径**。
    - 新增文件用 `*** Add File: ...`，更新用 `*** Update File: ...`。
- **返回值/输出**：
  - 成功：返回 “Success” 并列出新增/更新的文件路径。
  - 失败：返回解析/应用补丁的错误信息（通常是语法或上下文不匹配）。

---

### Glob（可选但常用）

- **功能**：按 glob 模式快速查找文件路径（按修改时间排序）。
- **作用**：
  - 快速定位输入 HTML、已有 XPath 文档、或相关脚本文件。
  - 当你只知道文件名模式（例如 `mimo-innerhtml-*.html`）时非常有用。
- **参数**：
  - **`glob_pattern`**（string，必填）：glob 模式（未以 `**/` 开头会自动补全递归匹配）。
  - **`target_directory`**（string，可选）：搜索目录（默认工作区根目录）。
- **返回值/输出**：
  - 匹配到的文件路径数组（可能为空）。

---

### Grep（可选但常用）

- **功能**：在文件内容中搜索指定文本/正则（基于 ripgrep）。
- **作用**：
  - 在 HTML 中快速定位字段关键词（如“工作经历/项目职务/自我评价”）出现的位置，辅助构造 XPath。
  - 在代码/文档中搜索既有 XPath 模式与命名约定。
- **参数（常用）**：
  - **`pattern`**（string，必填）：正则/文本模式。
  - **`path`**（string，可选）：搜索范围目录/文件（默认工作区根）。
  - **`glob`**（string，可选）：限制文件名匹配（如 `*.html`）。
  - **`output_mode`**（`content | files_with_matches | count`，可选）。
  - **`-i`**（boolean，可选）：忽略大小写。
  - **`multiline`**（boolean，可选）：多行匹配。
- **返回值/输出**：
  - 默认返回命中行（带文件名与行号），或按 `output_mode` 返回文件列表/计数。

---

### Shell（可选：验证/自检/批处理）

- **功能**：运行终端命令（适合跑脚本进行 XPath 自检、生成目录、格式化等）。
- **作用**（本任务常见）：
  - **可选自检**：用 Node/Python 等解析 HTML 并执行 XPath，抽查关键字段是否命中（注意依赖是否已安装）。
  - **准备目录**：例如 `mkdir -p mimorepo/docs/xpath`（也可用其他方式，但 Shell 最直接）。
- **参数**：
  - **`command`**（string，必填）：要执行的命令。
  - **`description`**（string，可选）：5-10 字简述（推荐填）。
  - **`working_directory`**（string，可选）：工作目录（绝对路径；默认工作区根）。
  - **`timeout`**（number，可选）：超时毫秒数（默认 30000）。
  - **`is_background`**（boolean，可选）：是否后台运行。
  - **`required_permissions`**（string[]，可选）：权限请求（`network`/`git_write`/`all`）。
    - 本任务一般不需要 `network`（除非安装依赖），也不需要 `git_write`（除非要提交）。
- **返回值/输出**：
  - exit code、stdout/stderr、以及执行耗时等信息。

---

### AskQuestion（可选：交互澄清）

- **功能**：向用户发起结构化问题（单选/多选），以便明确需求与默认值。
- **作用**：
  - 确认文档落盘路径、字段范围（最小/完整）、XPath 绝对路径规则等。
- **参数（常见）**：
  - **`title`**（string）：问题标题。
  - **`questions`**（array）：问题列表，每个问题通常包含：
    - **`id`**（string）：问题标识。
    - **`prompt`**（string）：问题描述。
    - **`options`**（array，可选）：选项列表（每项包含 `id`、`label`）。
- **返回值/输出**：
  - 每个问题对应的用户选择（通常是选项 id 或文本输入）。

---

### CreatePlan（可选：结构化规划）

- **功能**：生成一份“可确认”的执行计划文件（包含目标、步骤、影响文件、todos）。
- **作用**：
  - 当需求较复杂或需要用户确认范围/步骤时，用计划降低返工。
- **参数**：
  - **`name`**（string）：计划名称。
  - **`overview`**（string）：摘要。
  - **`plan`**（string）：markdown 计划正文。
  - **`todos`**（array）：todo 列表（每项含 `id`、`content`）。
- **返回值/输出**：
  - 计划文件路径（通常在用户主目录下的 `.cursor/plans/...`）。

---

### TodoWrite（可选：任务管理）

- **功能**：创建/更新结构化 todo 列表（pending/in_progress/completed/cancelled）。
- **作用**：
  - 按步骤推进（例如“先整理 XPath → 写文档 → 自检”）。
  - 让用户看到进度与完成状态。
- **参数**：
  - **`merge`**（boolean，必填）：是否与现有 todos 合并。
  - **`todos`**（array，必填）：todo 项数组：
    - **`id`**（string）：唯一标识。
    - **`content`**（string）：描述。
    - **`status`**（`pending|in_progress|completed|cancelled`）。
- **返回值/输出**：
  - 更新后的 todo 列表摘要。

---

### ReadLints（可选：质量检查）

- **功能**：读取 linter/diagnostics。
- **作用**：
  - 仅当你修改了代码文件（如 `.ts/.tsx`）并需要确保无新增报错时使用。
  - 纯文档任务通常不需要。
- **参数**：
  - **`paths`**（string[]，可选）：要检查的文件/目录路径（可相对或绝对）。
- **返回值/输出**：
  - 对应文件的诊断信息（可能包含既有问题）。

---

### SemanticSearch（可选：语义探索）

- **功能**：按“语义/意图”检索代码/文档位置（适合不确定关键词时）。
- **作用**：
  - 当你不知道“XPath 生成逻辑/字段映射”在哪里实现时，用语义搜索快速定位相关模块。
  - 对纯 HTML 定位字段时不一定需要。
- **参数**：
  - **`query`**（string，必填）：完整问题式查询（例如“哪里生成 XPath 文档？”）。
  - **`target_directories`**（string[]，必填）：限定搜索范围（0 或 1 个目录/文件路径）。
- **返回值/输出**：
  - 相关代码片段/位置的集合（用于进一步阅读/确认）。

## 参考：一次“生成 XPath 文档”的最小工具调用序列（示意）

1. `Read(input_html)`：读 HTML，确认锚点（例如 `id="resume-detail-basic-info"`）。
2. （可选）`Grep("工作经历" in *.html)`：快速找到模块边界与字段标题。
3. `LS(target_docs_dir)`：确认 `mimorepo/docs/xpath/` 存在；不存在则（可选）用 `Shell(mkdir -p ...)` 创建。
4. `ApplyPatch(AddFile output_md)`：写入按模块分组的 XPath 清单。
5. （可选）`Shell(run_check_script)`：抽查“姓名/性别/年龄/工作年限/项目职务”等 XPath 能命中节点/文本。
