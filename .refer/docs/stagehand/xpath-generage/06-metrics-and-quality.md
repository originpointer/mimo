## 06 指标与质量（可观测、可回归）

本章定义“结果质量/稳定性/成本/性能”的指标体系，并给出建议采集点。\n
原则：所有指标都应能定位到某一轮迭代、某一个字段、某一个 CDP/LLM 步骤。

---

## 1) 核心质量指标（字段级）

### 1.1 FieldUniqueMatchRate（字段唯一命中率）
- **定义**：所有字段中 `matchedCount == 1` 的比例。\n
  - 仅对 `scalar` 字段强要求；container 字段可单独统计。
- **采集**：`XPathValidator` 输出的 `matchedCount`。
- **建议阈值**：\n
  - 详情页：>= 0.85（首轮） / >= 0.95（自愈后）\n

### 1.2 AmbiguityRate（歧义率）
- **定义**：字段 `matchedCount > 1` 的比例，以及平均歧义数量：\n
  - `AvgAmbiguity = mean(matchedCount | matchedCount>1)`
- **意义**：反映 contains/候选污染/布局信息缺失。

### 1.3 ZeroHitRate（0 命中率）
- **定义**：字段 `matchedCount == 0` 的比例。
- **意义**：反映候选覆盖不足、页面不可访问、iframe 覆盖不足、xpath 退化等问题。

### 1.4 Coverage（字段覆盖）
- **定义**：输出中包含的字段数 / schema 字段总数。\n
  - 区分：PickXPath 覆盖、TextAnchors 覆盖、最终覆盖。

---

## 2) 稳定性指标（回归与线上）

### 2.1 RefreshStability（刷新稳定性）
- **定义**：同一 URL 刷新后，缓存 xpaths 再验证仍通过的比例。

### 2.2 ViewportStability（视口变化稳定性）
- **定义**：改变 viewport（或缩放）后仍唯一命中的比例。\n
  - 目标：XPath 应尽量不依赖像素，但歧义消解可能依赖 bbox；需区分“生成阶段依赖 bbox”与“运行阶段是否依赖 bbox”。

### 2.3 PageChangeTolerance（页面小改动容忍）
- **定义**：DOM 小变更（插入一个 banner/AB 测试）后，是否仍能自愈恢复通过。
- **采集**：自愈迭代日志（见 `04-hybrid-workflow.md` Step 8）。

---

## 3) 成本与效率指标

### 3.1 PickXPathSuccessRate（首选路径成功率）
- **定义**：不进入 screenshot fallback，直接 PickXPath + 验证通过的比例。
- **意义**：越高说明 candidates/digest 质量越好，整体成本越低。

### 3.2 FallbackTriggerRate（fallback 触发率）
- **定义**：进入 screenshot→TextAnchors→TextToDom→Stabilize 的比例。

### 3.3 AvgLLMCalls / Tokens（LLM 调用与 token）
- **定义**：每次任务平均 LLM 调用次数与 token 消耗（若可得）。\n
  - 最好拆成 PickXPath 与 TextAnchors 两类。

### 3.4 CacheHitRatio（缓存命中率）
- **定义**：WorkflowCache 命中后无需 LLM 的比例（仍需验证）。\n
  - 对齐 `../v3-cache.md`：命中越高越接近“可回放工作流”。

---

## 4) 性能指标（时延分解）

建议统一记录 `durationMs` 并带 `step` 标签：
- `domIndexMs`：buildSessionDomIndex / hydrate（CDP DOM）
- `digestMs`：digest 构建
- `candidatesMs`：候选生成
- `screenshotMs`：截图
- `llmPickMs`：PickXPath
- `llmAnchorsMs`：TextAnchors
- `locateMs`：TextToDomLocator
- `stabilizeMs`：XPathStabilizer
- `validateMs`：XPathValidator（Runtime.evaluate）
- `totalMs`：端到端

---

## 5) PageSignature（页面签名，用于缓存与回归）

目的：避免“不同页面/不同状态误复用 cache”。\n
建议 PageSignature 包含：
- `host`
- `pathPattern`（可粗粒度，如去 query/fragment）
- `titleHash`（可选）
- `domDigestHash`（digest 的节点/tag/文本摘要哈希）
- `framesSummary`（frame 数、OOPIF 数）

---

## 6) 采集点建议（与现有代码对齐）
- Background：`StagehandXPathManager` 类似入口层（`mimorepo/apps/plasmo-app/src/background/index.ts`）\n
  - 每个 tool-like 动作（scan/screenshot/validate）都已有 `durationMs` 风格；建议统一汇聚到 `MetricsCollector`。\n
- Nitro：`parse.post.ts/feedback.post.ts` 已有落盘；建议把 validation summary 回传用于离线评估与 prompt 迭代。\n

