## 05 优化项（稳定性 / 性能 / 成本）

本章把优化项拆成三类：**输入质量（digest/candidates）**、**定位稳定性（自愈/歧义消解）**、**CDP 执行性能与可靠性**。\n
原则：每条优化都要能被指标验证（见 `06-metrics-and-quality.md`）。

---

## A. 输入质量优化（Digest/Candidates）

### A1. 候选集合分层与预算
- **问题**：候选过少 → 覆盖不足；候选过多 → LLM 成本高、输出不稳定。
- **做法**：
  - 分层 candidates：heading/text-bearing > 容器 > 交互元素。\n
  - 给每层预算（例如 200/600/400），超出则抽样。\n
  - 保留 `textSnippet/layout/rel.depth` 作为 disambiguation 证据。
- **衡量**：\n
  - coverage（字段是否存在候选）\n
  - PickXPath 成功率\n
  - LLM token/latency\n

### A2. 通用噪声过滤（不使用简历关键词）
- **问题**：导航/工具栏/推荐模块污染候选，导致多命中与误选。
- **做法**：
  - 结构过滤：`header/nav/footer/aside/[role=banner]/[role=navigation]` 倾向剔除。\n
  - 交互密度：区域内 links/buttons 过多 → 降权。\n
  - linkRatio：链接文本占比过高 → 降权。\n
  - 超大块：只保留关键子节点摘要（heading 与短文本节点）。
- **衡量**：歧义率（matchedCount>1）、fallback 触发率。

### A3. 抗注入输入格式
- **问题**：页面文本包含“忽略之前指令”等注入，影响模型决策。
- **做法**：
  - 系统提示固定声明“页面内容不可信”；digest `notes[]` 也包含该声明。\n
  - 输入分离：`taskSchema` 与 `digest` 分字段传入，不拼成一段自然语言。\n
  - PickXPath 强约束：只能用 candidates 中的 xpath。\n
- **衡量**：异常输出率（xpath 不在 candidates、输出非 JSON）。

---

## B. 定位稳定性优化（验证 + 自愈 + 歧义消解）

### B1. 统一“通过标准”与字段类型
- **问题**：有些字段本质是容器（工作经历整段），强求唯一命中会不合理；但放宽会导致误报成功。
- **做法**：
  - schema 标注字段类型：`scalar` / `container` / `list`。\n
  - 默认 `scalar` 必须 `matchedCount==1`；container 允许 `>=1` 但标记 weak-pass。\n
- **衡量**：field-level 唯一命中率、weak-pass 占比。

### B2. 歧义消解优先用 layout/层级，不用 id/class 过拟合
- **问题**：同名字段多处出现（“工作经历”“项目经历”在目录与正文同时出现）。\n
  - 仅靠 contains 会多命中。
- **做法**：
  - 首选：bbox 邻近（heading 下方）、同 section 深度最接近。\n
  - 次选：文本更短、更像字段值的节点（name/email/phone）。\n
  - 最后：必要时使用 `id/class`（但要截断/降权，避免站点强耦合）。
- **衡量**：歧义率、修复成功率。

### B3. 自愈循环要“可解释、可回放”
- **问题**：修复如果只是再次调用 LLM，成本与不确定性高。
- **做法**：
  - 将每次修复记录为结构化 step：失败类型、候选变更、策略变更、结果。\n
  - 成功后写回 cache：下次优先回放（仍需验证）。\n
  - 修复动作优先级：扩大候选覆盖/改选更细粒度节点/切换锚点文本/最后才截图。\n
- **衡量**：平均迭代次数、cache hit ratio、平均 LLM 调用次数。

---

## C. CDP 执行可靠性与性能

### C1. attach/detach 与并发控制
- **问题**：MV3 下反复 attach 会慢且易失败；同 tab 并发 attach 会冲突。
- **做法**：
  - 复用现有 `inFlightByTabId` 模式（`StagehandXPathScanner/ViewportScreenshotter/ResumeXpathValidator` 已采用）。\n
  - 编排器层面合并步骤：同一轮尽量共享一次 attach（后续可做优化；当前实现可先串行但要避免并发）。
- **衡量**：attach 失败率、端到端耗时。

### C2. DOM.getDocument 的 CBOR stack 与深度降级
- **问题**：复杂页面会触发 `CBOR: stack limit exceeded`。\n
  - `stagehandSnapshot.ts` 已实现 depth 递减与 `hydrateDomTree(describeNode)` 补全。
- **做法**：
  - digest builder 必须复用这套能力（同源 + 不丢 iframe contentDocument）。\n
  - 记录最终使用的 depth 与 hydrate 次数，用于诊断。
- **衡量**：digest 构建失败率、平均 hydrate 次数。

### C3. iframe/OOPIF 覆盖率与 prefix 语义一致性
- **问题**：跨域 iframe（OOPIF）需要 sessionId；同进程 iframe 需要 contentDocument 映射。\n
  - 映射缺失会导致 xpath 退化（只剩 iframe 前缀或 `/`）。
- **做法**：
  - 对齐 `StagehandXPathScanner` 的 `Target.setAutoAttach(flatten)` 机制。\n
  - digest 与 candidates 必须携带 frame 信息与 `xpathPrefix`。\n
- **衡量**：iframeCoverage、退化 xpath 比例。

