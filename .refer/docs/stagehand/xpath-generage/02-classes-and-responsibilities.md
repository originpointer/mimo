## 02 插件架构需要实现/抽象的类（职责边界）

本章给出一套“可落地的模块划分”，用于实现 `04-hybrid-workflow.md` 的闭环。\n
目标是把 AI 逻辑拆成 **可测试、可替换、可观测** 的小模块，并最大化复用现有 CDP 能力。

> 说明：以下类名是建议的抽象层；实际落地可放在 `mimorepo/apps/plasmo-app/src/background/libs/`。

---

### `ResumeXpathWorkflowOrchestrator`（编排器）
- **职责**：
  - 统一编排：采集 → PickXPath → 验证 →（必要时）fallback → 稳定化 → 再验证 → 迭代/终止。
  - 控制：最大迭代次数、每轮超时、是否启用截图 fallback。
  - 汇总：最终产物、失败报告、指标上报、cache 写入。
- **输入**：
  - `tabId`
  - `taskSchema`（字段列表/JSON Resume 子集）
  - `options`（上限、是否 includeShadow、是否截图、迭代次数等）
- **输出**：
  - `result`: `{ ok, xpaths, validationSummary, iterations, debugRefs }`
- **失败处理**：
  - attach 失败 / 页面不可调试：尝试降级或直接返回可读错误（见 `07-failure-modes-playbook.md`）。

---

### `CdpDomDigestBuilder`（核心：DOM/HTML 摘要器）
- **职责**：
  - 基于 CDP DOM 树索引生成 digest（见 `03-dom-digest-spec.md`）。
  - 负责：采样、裁剪、上限控制、属性白名单、抗注入 `notes`。
- **依赖**：
  - `stagehandSnapshot.ts` 的 DOM 树与 `backendNodeId -> xpath` 映射能力（同源性关键）。
- **输入**：
  - `tabId`
  - `pierce/includeShadow`（仅 open shadow 可遍历）
  - `limits`（maxNodes/maxTextLen/maxDepth/…）
- **输出**：
  - `DomDigest`（结构化 JSON）
- **关键指标**：
  - digest 构建耗时、节点数、被裁剪比例、iframe 覆盖率。

---

### `XPathCandidateProvider`
- **职责**：输出 “LLM 允许选择的 xpath 列表”。这是 **抑制 hallucination** 的关键边界。
- **候选来源建议**：
  - **可交互候选**：来自 `StagehandXPathScanner`（强覆盖，但未必包含所有字段文本节点）。
  - **文本/标题候选**：来自 digest 的 text-bearing/heading 节点（字段定位更直接）。
  - **容器候选**：来自高文本密度容器（用于字段无法精确时的退化输出）。
- **输入**：`DomDigest` +（可选）`StagehandXPathScanner` 扫描结果
- **输出**：`candidates[]`（每项包含 xpath/textSnippet/tag/frameId/layout/signal）
- **注意**：候选量必须可控（例如 500~3000），否则 LLM 成本与稳定性下降。

---

### `LlmResumeUnderstandingClient`
统一封装 “调用 LLM 并做输出校验/重试” 的客户端。\n
建议至少提供两个方法：

#### `pickXPathFromCandidates(...)`
- **用途**：PickXPath（强约束输出）
- **输入**：`taskSchema` + `candidates[]` + `digest`（可裁剪版）
- **输出**：`jsonResumeXPath`（严格 JSON；xpath 必须在 candidates 中）
- **校验**：
  - JSON parse 成功
  - xpath 都在 candidates 中（否则判无效并要求重试/修复）

#### `generateTextAnchorsFromScreenshot(...)`
- **用途**：TextAnchors（弱约束输出，供端上定位）
- **输入**：`screenshot`（可选附 digest 精简版）
- **输出**：`anchors`（字段→短文本锚点/类型/置信度）
- **校验**：
  - JSON parse 成功
  - 每字段锚点长度/数量限制（防止输出大段复制）

---

### `TextToDomLocator`
- **职责**：把 `TextAnchors` 映射回 DOM 元素集合（尽量收敛到 1 个）。
- **输入**：`anchors` + `DomDigest`
- **输出**：`fieldMatches`（每字段若干候选元素：xpath + score + reason）
- **策略**：
  - normText（空白/全半角/大小写）后做 exact/contains/fuzzy
  - 用 digest 的 `rel/layout` 做歧义消解（同 section、邻近 heading、空间距离）

---

### `XPathStabilizer`
- **职责**：把“元素候选”转换为“更稳定的 xpath”，并为验证提供多候选方案。
- **输入**：`fieldMatches` + `DomDigest`（包含 frame/prefix 信息）
- **输出**：`proposedXpaths`（每字段 1~N 条候选 xpath，带评分与生成策略说明）
- **生成策略**：
  - `absXPath`（CDP 索引）
  - `iframePrefixedXPath`（对齐 `mergeFrameXPath/relativizeXPath`）
  - `relativeToContainerXPath`（相对 mainContainer 的局部路径，降低脆弱性）

---

### `XPathValidator`（现有能力可复用）
- **职责**：批量验证 xpath 的 `matchedCount` 与 `firstTextSnippet`。\n
  - 可直接复用现有 `ResumeXpathValidator`。
- **输入**：`xpaths[]`
- **输出**：`validationResults[]`
- **通过标准**：
  - 默认字段：`matchedCount == 1`
  - 明确标记为 container 的字段：允许 `matchedCount >= 1`（但要记录为弱通过）

---

### `WorkflowCache`
- **职责**：把一次成功的“路径”缓存下来，用于后续回放与自愈。\n
  - 语义对齐 `../v3-cache.md`：回放失败要能更新 cache entry（self-healing）。
- **输入**：`cacheKey` + `{ xpaths, validationSummary, pageSignature, versions, history }`
- **输出**：cache hit 时直接返回候选 xpaths（仍需再次验证）

---

### `MetricsCollector`
- **职责**：采集与上报指标（见 `06-metrics-and-quality.md`）。\n
  - 建议与现有 `postToolCallResult` 机制对齐（任务级、步骤级）。

