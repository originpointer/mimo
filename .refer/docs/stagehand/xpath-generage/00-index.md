## xpath-generage 文档索引

本目录用于沉淀“在浏览器里稳定生成简历区域 XPath”的 AI 任务流设计文档（面向 `plasmo-app` 插件架构 + CDP）。

### 适用范围
- **目标**：生成一组可复用、可验证、可自愈的 XPath，用于快速抽取页面中的简历信息（区域/字段）。
- **环境**：Chrome MV3 扩展（background service worker + CDP `chrome.debugger`）。
- **输入**：页面 DOM（含 iframe/OOPIF）、viewport 截图（可选）、任务 schema/字段列表。
- **输出**：JSON Resume（或业务字段 schema）的 **XPath 映射** + 验证结果 + 自愈记录。

### 明确不依赖的能力
- **不依赖** `mimorepo/apps/plasmo-app/src/background/libs/ResumeBlocksExtractor.ts` 的“硬编码关键词切块”方案。
  - 该能力可以作为临时 Debug/可视化工具，但 **不作为稳定任务流的核心前置条件**。
  - 本方案改用：**CDP DOM 树 → 可控体积的 DOM/HTML 摘要（结构化 digest）→ LLM 生成/选择 → 端上定位/稳定化 → CDP 验证 → 自愈循环**。

### 与现有实现/文档的关系（推荐先读）
- Stagehand v3 依赖对象图与注入点：`../v3-dependencies.md`
- Stagehand v3 缓存/回放/self-healing 心智模型：`../v3-cache.md`
- 插件侧 CDP DOM 索引（backendNodeId→XPath + iframe contentDocument）：`mimorepo/apps/plasmo-app/src/background/stagehandSnapshot.ts`
- 插件侧跨 iframe/OOPIF XPath 扫描：`mimorepo/apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts`
- 插件侧 viewport 截图：`mimorepo/apps/plasmo-app/src/background/libs/StagehandViewportScreenshotter.ts`
- 插件侧 XPath 验证：`mimorepo/apps/plasmo-app/src/background/libs/ResumeXpathValidator.ts`
- Nitro LLM 解析与反馈落盘：
  - prompt：`mimorepo/apps/nitro-app/server/lib/prompts/jsonresume_xpath.ts`
  - parse：`mimorepo/apps/nitro-app/server/routes/api/resume/parse.post.ts`
  - feedback：`mimorepo/apps/nitro-app/server/routes/api/resume/feedback.post.ts`

### 文档清单
- `01-architecture.md`：总体架构、模块边界、数据流与依赖图
- `02-classes-and-responsibilities.md`：插件架构需要实现/抽象的类（职责/输入输出/错误处理）
- `03-dom-digest-spec.md`：DOM/HTML 摘要（digest）规范：采样/裁剪/上限/抗注入
- `04-hybrid-workflow.md`：hybrid 主流程与 fallback、自愈循环（含决策表）
- `05-optimizations.md`：稳定性/性能/成本优化项与落地点
- `06-metrics-and-quality.md`：指标、采集点、阈值建议、回归策略
- `07-failure-modes-playbook.md`：常见失败模式与排查/修复手册
- `08-interface-and-layout-draft.md`：接口/文件布局草案（远端 WorkflowCache + JSON Resume）

