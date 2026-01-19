# 04 由浅入深的执行步骤（MVP-0 → MVP-2）

本篇把“怎么跑起来、怎么评估、怎么迭代到可回放自愈”写成清晰的执行步骤（不涉及编码）。

## 0) 你当前已经具备的能力（MVP-0 雏形）
在 `mimorepo` 里，以下链路已经存在且可用于人工/半自动评估：
- next 工具页能调用插件：`mimorepo/apps/next-app/app/tools/page.tsx`
- 插件能执行 CDP 工具：scan/extract/validate/screenshot（`mimorepo/apps/plasmo-app/src/background/index.ts`）
- Nitro 能 LLM parse 与落盘：`/api/resume/parse`、`/api/resume/feedback`
- Nitro 已有 WorkflowCache：`/api/workflow-cache/get|put|patch`（类型在 `workflowCacheStore.ts`）

## 1) MVP-0：把“可评估闭环”跑顺（目标：可复盘 + 可回归）
### 1.1 操作步骤（工具页视角）
1) 打开 next-app `Tools` 页面，选择可用扩展与目标 Tab（必须是 http/https）。\n
2) 点击 `Extract Blocks`：获得 `page/blocks/candidates/mainContainer/meta`。\n
3) 点击 `Send to Nitro + LLM Parse + Download`：获得 `jsonResumeXPath + sampleId`。\n
4) 点击 `Validate XPaths + Feedback`：得到字段级 `matchedCount/snippet` 并回传到 Nitro。\n

### 1.2 评估产物（必须沉淀）
- Nitro 侧样本目录：\n
  - `sample.json`：输入\n
  - `parse.json`：LLM 输出 + raw\n
  - `feedback-*.json`：验证反馈\n
  - `events.jsonl`：事件流（用于统计）\n
- 导出的 json 文件：用于人工 spot-check 与离线指标计算。\n

### 1.3 验收指标（来自 `06-metrics-and-quality.md`）
至少统计：
- `FieldUniqueMatchRate`（matchedCount==1）\n
- `ZeroHitRate`（matchedCount==0）\n
- `AmbiguityRate`（matchedCount>1）\n
- `PickXPathSuccessRate`（不进入 fallback 的成功率：MVP-0 先定义为“parse→validate 一次过”）\n

## 2) MVP-1：引入“候选边界 + digest 规范”（目标：稳定性与成本可控）
> 对齐 `.refer/docs/stagehand/xpath-generage/03-dom-digest-spec.md` 与 `02-classes-and-responsibilities.md`。

### 2.1 为什么要从 blocks 升级到 digest
blocks 属于“经验型切块”，在站点变化/iframe/shadow 场景容易失真。\n
digest 的价值：把 DOM 信息变成 **可控体积、结构化、可采样裁剪** 的输入，从源头降低 hallucination 与候选污染。

### 2.2 执行步骤（文档产物要求）
1) 固化 digest 规范（字段、裁剪策略、上限参数、抗注入 notes）。\n
2) 规定 candidates 的组成：\n
   - 可交互候选（scanner）\n
   - text/heading 候选（digest）\n
   - 容器候选（高文本密度）\n
3) 更新 Nitro prompt 输入结构：从仅 candidates 扩展到 `digestLite + candidatesTiered`。\n
4) 将 candidates 数量控制在可控范围（例如 500~3000）。\n

### 2.3 验收指标（新增）
- `AvgLLMCalls/Tokens`（或近似：输入 candidates 数量/输入字节）\n
- `FallbackTriggerRate`（仍未实现 fallback 时可以先记录为 0）\n
- `digestMs/candidatesMs` 的时延分解（meta.durationMs 扩展采集点）\n

## 3) MVP-2：WorkflowCache 回放 + 自愈（目标：线上可用的“可回放工作流”）
> 对齐 Stagehand v3 cache 心智模型：cache hit 仍需执行/验证，若自愈导致产物变化则刷新 entry。

### 3.1 关键决策点（状态机）
1) `cache.get`：hit/miss\n
2) hit 后 `validate`：ok/fail\n
3) fail 后 `repair`：\n
   - 重采集 candidates/digest\n
   - 重新 PickXPath\n
   - 必要时截图 fallback（见 3.2）\n
4) repair 成功：`cache.patch` 刷新 xpaths/validation/history/updatedAt\n

### 3.2 screenshot fallback（从“可用”到“更稳”的关键）
你已经有异步截图能力（tool-call）。MVP-2 的产品化步骤是：\n
- 定义“何时触发截图 fallback”的阈值：\n
  - `ZeroHitRate` 高\n
  - 关键字段（basics.name/email/phone）0 命中\n
  - iframe/shadow 迹象强\n
- 定义 fallback 输出：\n
  - LLM 输出短文本 anchors（不直接输出 xpath）\n
  - 端上 `TextToDomLocator` 把 anchors 回贴到 DOM，再由 `XPathStabilizer` 生成稳定 xpath\n
- 定义 fallback 结束条件：\n
  - 达到 `FieldUniqueMatchRate >= 0.95` 或时间预算耗尽\n

### 3.3 WorkflowCache 的写入策略（put vs patch）
- **首次成功**：`put(entry)`\n
- **回放后刷新**：`patch({validation, updatedAt, history, qualityScore})`\n
- **自愈后变更**：`patch({xpaths, validation, history, updatedAt})`\n

## 4) 日常执行 Runbook（线上/迭代）
### 4.1 新站点/新模板接入
- 先用 MVP-0 跑 20~50 个样本，收集失败分布。\n
- 若 `LLMInvalidOutput` 高：先收紧 candidates 与 prompt。\n
- 若 `ZeroHitRate` 高：优先排查 iframe/OOPIF 覆盖与 DOM 深度（见 playbook）。\n

### 4.2 回归策略
- 每次修改 prompt/digest/candidates 策略都要跑：\n
  - `RefreshStability`\n
  - `FieldUniqueMatchRate`（首轮/自愈后）\n
  - `CacheHitRatio`（上线后核心指标）\n

## 5) 常见失败与排查入口（索引）
详见：`mimorepo/docs/next-move/03-dataflow.md` 与 `.refer/docs/stagehand/xpath-generage/07-failure-modes-playbook.md`。\n
优先排查顺序（经验）：\n
1) URL 是否可扫描（非 http/https）\n
2) DevTools 是否占用 debugger attach\n
3) iframe/OOPIF 是否覆盖\n
4) DOM 深度/CBOR 限制\n
5) 候选污染导致多命中\n

