---
title: 用 BM25 检索“工具描述词”并注入给大模型（无代码版）
audience: LLM-agent-builder
corpus_scope: tool_description_only
output_format: prompt_block_or_json
related_docs:
  - mimorepo/docs/xpath/xpath-generation-tools.md
---

## 你要解决的问题是什么

当你已经把所有工具都“创建完成”（例如每个工具都有一份说明：功能/作用/参数/返回值/约束），接下来希望：

- 根据用户当前任务（query），自动从“工具描述词语料”里找出最相关的工具说明（top-k）。
- 把这些说明以 **可控、稳定、短小且可复制** 的格式提供给大模型，让模型能：
  - 知道“有哪些工具可用”
  - 知道“每个工具怎么用（关键参数、返回值含义）”
  - 避免在没看到工具说明时凭空编造工具参数/返回值

这里 BM25 的作用是：**用关键词/短语匹配的方式检索最相关的工具文档片段**，再把检索结果作为“可用工具上下文”注入到模型提示词里。

## 语料（Corpus）如何构建

### 1) 切分粒度：1 个工具 = 1 条 doc

建议每个工具说明都对应一条文档记录（doc），避免把所有工具放进一个巨大 doc 导致 BM25 召回不准。

**doc 推荐字段（概念结构）**：

- `toolName`：例如 `Read` / `ApplyPatch`
- `isRequired`：`true|false`
- `summary`：一句话概述（10-30 字）
- `details`：对参数/返回值/约束/注意事项的自然语言描述（可更长）
- `tags`：可选标签（如 `filesystem`、`search`、`write`、`verification`）
- `source`：可选（原文档路径，例如 `mimorepo/docs/xpath/xpath-generation-tools.md`）

> 本文档约束 `tool_description_only`：只使用“描述词”，不引入 schema/示例调用片段。

### 2) 字段拼接与权重（不写代码也能做的规则）

BM25 本身通常是对“一个字符串字段”算分，因此可以把多个字段拼成一个“可检索文本”，并用“重复/前置”来模拟权重：

- 高权重：`toolName`、核心功能关键词（例如“读取文件”“写入补丁”“目录列表”）
- 中权重：参数名/返回值名（例如 `path`、`target_directory`、`required_permissions`）
- 低权重：较长的背景解释/注意事项

**可执行的拼接规则（示例）**：

- `indexText = toolName + toolName + summary + paramsText + returnsText + details + tags`
  - `toolName` 重复 2 次，相当于加权

### 3) 中文分词与技术词保留（原则）

BM25 依赖 token 化。中文场景至少要保证：

- **基础 token**：按词或按字均可（实现层面可用分词器；本文只说明原则）
- **技术 token 不被切碎**：把以下内容尽量当成“整体 token”
  - `Read.path`、`ApplyPatch`
  - `/html[1]/body[1]`
  - `git_write`、`network`、`all`
  - 文件路径片段（如 `mimorepo/docs/xpath/`）

否则用户问“ApplyPatch 怎么写？”时，分词器把 `ApplyPatch` 切坏会影响召回。

## 查询（Query）如何构造

### 1) 直接用用户任务文本

例如用户 query：

- “从 HTML 里提取字段并生成 XPath 文档落盘”

### 2) 可选：做轻量 query 扩展（不依赖模型）

规则扩展关键词（避免只靠语义）：

- 与文件相关：`读取`、`写入`、`落盘`、`目录`
- 与搜索相关：`查找`、`匹配`、`检索`
- 与验证相关：`自检`、`验证`、`抽查`

扩展后的查询更容易召回 `Read/LS/ApplyPatch/Grep/Shell` 等工具。

## 检索（Retrieval）策略

### 1) top-k 选择

- 建议 `k = 5 ~ 12`
- 规则：上下文窗口越小，k 越小；工具越多，k 越大（但每条要更短）

### 2) “必需工具”优先规则（推荐）

如果你的流程已知必需工具集合（例如文档生成往往离不开 `Read/ApplyPatch/LS`），可以先做规则注入：

- `alwaysInclude = {必需工具}`
- `bm25TopK = top-k(可选工具)`
- 最终集合 `finalTools = alwaysInclude ∪ bm25TopK`（再去重）

这样即便 BM25 因查询词不足漏召回，也不会缺关键工具。

### 3) 去重与合并

同一 `toolName` 只保留 1 条工具记录；如果你的语料里一个工具分成多个段落（不推荐），需要在检索后合并为一条。

## 把检索结果“提供给大模型”的方式（Prompt Assembly）

核心原则：**结构化、短、可控、可追溯**。

### 1) 建议的注入位置

- 放在系统提示/开发者提示的“工具说明区块”，在任务描述之前或之后都可以，但要固定位置。
- 与任务无关的工具不要注入（减少噪音）。

### 2) 建议的输出格式（文本块模板）

把检索结果格式化成一个固定区块，模型看到后能稳定解析：

```text
## AvailableTools (retrieved)
Rules:
- Only use tools listed below.
- If required info is missing (params/returns/constraints), request more tools by searching corpus again.

Tool: Read
Required: true
WhenToUse: 读取本地 HTML/Markdown 等文件内容。
KeyParams: path(absolute), offset?, limit?
Returns: 带行号的文本内容或错误信息
Constraints: 读取前确认路径；大文件用 offset/limit 分段

Tool: ApplyPatch
Required: true
WhenToUse: 新增/更新文档落盘（一次只操作一个文件）。
KeyParams: patch(FREEFORM, absolute path)
Returns: 成功/失败信息 + 受影响文件列表
Constraints: 补丁语法必须匹配上下文；路径必须绝对
```

> 你可以把 `KeyParams` 与 `Returns` 只保留“最关键字段名”，避免长文挤占上下文。

### 3) 长度控制（必须做）

建议硬性预算：

- 每个工具不超过 \(N\) 字（例如 400-800 中文字符）
- 超长的 `details`：只保留 “WhenToUse/KeyParams/Returns/Constraints” 四段
- 允许保留 `source`：例如 “来源：mimorepo/docs/xpath/xpath-generation-tools.md”，便于追溯

### 4) 防幻觉约束（强烈建议写进系统/开发者提示）

给模型两条硬规则：

- **只能使用检索到的工具信息**（尤其是参数名、返回值字段）。
- 若需要未在上下文出现的参数/返回值/工具，必须先触发“再次检索”（即重新跑 BM25 并注入更多工具说明），而不是猜。

## 质量评估与迭代

### 1) 你应该监控哪些指标

- **召回覆盖率**：完成任务所需的关键工具是否都被注入（尤其是必需工具）。
- **错误调用率**：模型是否经常把参数名写错、漏必填字段、误解返回值。
- **上下文噪音**：注入的工具过多是否降低任务执行质量。

### 2) 常见故障与修复

- **故障：BM25 总召回不到对的工具**
  - 修复：加强 `toolName/summary` 权重；为工具补充同义词（例如“落盘=写文件=保存”）。
- **故障：中文分词导致技术词被切碎**
  - 修复：把 `ApplyPatch`、`Read.path`、`/html[1]/body[1]` 加入“保留词表”。
- **故障：注入工具太多，模型反而乱**
  - 修复：降低 k；提高每条摘要压缩；先规则注入必需工具，再 BM25 召回可选工具。

## 推荐的最小落地顺序（无代码）

1. 把每个工具说明整理成“1 工具 1 doc”（哪怕最初是手工）。
2. 明确中文 token 化策略与保留词表（至少保留工具名与关键参数名）。
3. 用 BM25 对 doc 做 top-k 检索（先用简单 query 测试）。
4. 用固定模板把结果注入模型提示词。
5. 用真实任务回放，记录错参/漏参/误解返回值，再反向补充工具描述词与同义词。

