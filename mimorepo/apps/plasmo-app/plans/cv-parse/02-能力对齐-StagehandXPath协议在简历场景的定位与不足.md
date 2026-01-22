# 能力对齐：StagehandXPath 协议在简历场景的定位与不足

本文对齐 `mimorepo/apps/plasmo-app/docs/StagehandXPath-协议说明.md`，明确在“简历正文根容器 XPath”任务中：

- `STAGEHAND_XPATH_SCAN` **能复用什么能力**
- **不能指望它直接解决什么**
- 需要在扩展/agent 侧补采集哪些信号，才能让服务端编排稳定落地

---

## 1. StagehandXPath 协议的定位（它擅长的）

根据协议说明，`STAGEHAND_XPATH_SCAN` 提供：

- 以 `selector` 作为候选集入口（默认偏“可交互元素”）
- 返回 **稳定的 stagehand 风格 XPath**（每段带 `[n]`），并处理主 frame + iframe（含 OOPIF）的拼接语义
- 每个 item 附带轻量信息：`tagName/id/className/textSnippet`

在简历任务里，它最适合做两件事：

- **复用跨 frame 的 XPath 前缀语义**：当正文在 iframe 内时，输出 XPath 能包含 iframe 路径前缀，便于服务端统一处理与回放。
- **作为“稳定 XPath 生成/拼接”的基线**：保证不同采集模块生成的 XPath 风格一致（减少后续回放兼容问题）。

---

## 2. StagehandXPath 协议的不足（为什么不能只靠它）

协议层返回的 `StagehandXPathItem` 字段非常轻量：

- `textSnippet` 主要来自 `aria-label/title/alt/placeholder` 等属性；**不是** 简历字段识别需要的正文文本（`innerText/textContent`）。
- `selector` 默认面向“可交互元素候选集”，而简历正文根容器通常是 `div/section/article/main` 等 **非交互容器**。
- 协议未承诺提供 `boundingRect/visible/covered/zIndex` 等几何与可见性信号（这些对“只要正文、排除遮挡/推荐”很重要）。

结论：**仅使用 `STAGEHAND_XPATH_SCAN.items` 无法稳定完成“简历正文根容器识别”**，最多只能当“候选 XPath 列表/回放基线”。

---

## 3. 需要补采集的“最小 DOM 摘要”（端侧：扩展/agent）

为了对齐《图像与 DOM 落地原则》并在服务端稳定编排，本任务需要端侧额外采集：

### 3.1 Anchors（字段锚点）

目的：提供一批可靠的“正文内散点”，用于祖先候选生成与覆盖率评分。

每个 anchor 建议字段：

- `anchorType`: `phone|email|dateRange|sectionTitle|labelValue|other`
- `text`: 命中片段（可截断）
- `xpath`: 该节点 XPath（stagehand 风格）
- `frameKey`: 区分 frame（可用 iframe 前缀或 frameId 的稳定映射）

### 3.2 Candidates（候选容器摘要）

目的：避免把整页 HTML 传回服务端；只回传 TopK 需要的摘要与统计。

每个 candidate 建议字段：

- `xpath`
- `frameKey`
- `textPreview`: 清洗后的文本预览（例如 300~800 字；可做去重/去空白）
- `stats`：
  - `textLen`
  - `anchorCount`
  - `fieldTypeCount`
  - `linkCount`
  - `interactiveCount`
  - 可选：`linkTextLen`（便于算 linkDensity）
- 可选（强烈建议）：`bbox`（CSS 像素）与 `inViewport`（配合截图核验）

> 这些信息是服务端打分与 LLM 兜底裁决所需的“最小可用集”。\n\n---

## 4. 如何与 `STAGEHAND_XPATH_SCAN` 组合使用（推荐）

推荐把 `STAGEHAND_XPATH_SCAN` 从“简历识别主路径”降级为“辅助能力”：

- **主路径**：端侧 DOM 摘要采集（anchors/candidates/stats/textPreview/xpath）→ 服务端评分 → 输出 root xpath
- **辅助路径**：
  - 当正文在 iframe 且 XPath 拼接容易出错：优先使用 Stagehand 的 iframe 前缀拼接语义对齐
  - 需要回放点击/滚动：复用 stagehand 风格 XPath 与现有回放链路

---

## 5. 与后续章节的关系

- `03` 会基于本文的“补采集最小集”，给出 anchors→candidates→score 的评分细节与阈值。
- `05` 会把 candidates 的 TopK 摘要作为 LLM 输入契约，并强制“只能在 candidates 内选择”。
- `06` 会给出“服务端编排 + 扩展/agent 回传协议”的端到端状态机，实现可控调度与重试。

