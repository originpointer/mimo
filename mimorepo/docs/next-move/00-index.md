# next-move：Resume XPath（Stagehand 思路）产品方案文档索引

本目录沉淀“在 `mimorepo` 现有三端架构下（`plasmo-app` 插件 + `next-app` UI + `nitro-app` 服务），稳定生成/验证/回放/自愈 JSON Resume 字段 XPath”的产品方案文档。

## 适用范围
- **目标**：输出一份 JSON Resume（或业务 schema）的 **字段 → XPath** 映射，并提供：
  - **可验证**：插件端 CDP 对每个 XPath 进行客观验证（`matchedCount`）。
  - **可回放**：WorkflowCache 命中后可直接回放（仍需验证）。
  - **可自愈**：验证失败时触发 fallback/修复，并将结果写回 cache（patch）。
- **运行环境**：
  - 插件：Chrome MV3（background service worker + `chrome.debugger`）。
  - Web：`next-app` 作为工具面板与流程编排 UI。
  - 服务：`nitro-app` 作为 LLM/落盘/缓存/WS 广播中心。

## 快速入口（与仓库现有实现对齐）
- **Next 工具页（编排 UI）**：`mimorepo/apps/next-app/app/tools/page.tsx`
- **插件 Background 入口（工具能力）**：`mimorepo/apps/plasmo-app/src/background/index.ts`
- **Nitro 端点**：
  - LLM：`POST /api/resume/parse`、`POST /api/resume/feedback`
  - WorkflowCache：`POST /api/workflow-cache/get|put|patch`
  - Tool-call（截图异步）：`POST /api/tool-call/request`、`POST /api/tool-call/result`、`WS /api/tool-call/ws`
  - 扩展注册/列表：`POST /api/extension/extension-id`、`GET /api/extension/extension-list`

## 文档列表（建议阅读顺序）
1. **依赖与分层（Stagehand → mimorepo 映射）**：`01-dependencies-and-layering.md`
2. **类型与契约（key/entry/validation/pageSignature 等）**：`02-types-and-contracts.md`
3. **三端数据流转（含 tool-call ws、workflow-cache 回放）**：`03-dataflow.md`
4. **由浅入深的执行步骤（MVP-0 → MVP-2）**：`04-execution-steps.md`
5. **类职责清单（按 next/plasmo/nitro 分组）**：`05-classes-and-responsibilities.md`

## 术语表
- **Candidates**：允许 LLM 选择的 XPath 列表（必须可控规模，用于抑制 hallucination）。
- **PickXPath**：LLM 在 candidates 限定集合内选择字段 XPath（强约束输出）。
- **Validator**：插件端 CDP `document.evaluate` 验证（最终真相）。
- **WorkflowCache**：远端缓存“可回放工作流”的结果与历史（cache hit 仍需验证）。

