# 05 类职责清单（按 next / plasmo / nitro 分组）

本篇是“以类名为索引”的产品说明书：每个类/模块负责什么、输入输出是什么、依赖谁、如何观测与失败如何处理。\n
其中 **已存在** 的类以现有文件为准；**拟新增** 的类来自 `.refer/docs/stagehand/xpath-generage/02-classes-and-responsibilities.md`，并按三端架构映射。

## A) next-app（UI + 流程编排层）
### A1. `ToolsPage`（已存在）
- **位置**：`mimorepo/apps/next-app/app/tools/page.tsx`
- **职责**：提供人工/半自动闭环：调用插件工具、调用 Nitro LLM/Cache、展示结果、下载样本、回传反馈。
- **关键能力点**：\n
  - 通过 `sendToExtension()` 调用插件消息\n
  - 通过 fetch 调用 Nitro `/api/resume/*`、`/api/tool-call/*`\n
  - 通过 WebSocket 订阅 `tool-call:result`

### A2. `ExtensionBridge`（已存在）
- **位置**：`mimorepo/apps/next-app/lib/extension-bridge.ts`
- **职责**：统一 next→插件消息发送与错误封装（`chrome.runtime.sendMessage`）。
- **输入/输出**：`message` → Promise<response>
- **失败**：extensionId 为空 / chrome.runtime 不可用 / runtime.lastError。

### A3. `NitroApiClient`（建议抽象，拟新增/或以函数集合形式存在）
- **职责**：封装 Nitro 的 HTTP/WS 调用：\n
  - `/api/resume/parse|feedback`\n
  - `/api/workflow-cache/get|put|patch`\n
  - `/api/tool-call/request|ws`
- **好处**：让 `ToolsPage` 从“业务流程”中剥离请求细节，便于复用到其它 UI（如 next-app 的生产页面）。

### A4. `ResumeXpathWorkflowController`（建议抽象，拟新增）
- **职责**：把 MVP-2 的状态机固化：\n
  - `runGenerate()`：采集→parse→validate→feedback→cache put\n
  - `runReplay()`：cache get→validate→patch 或 repair\n
  - `runRepair()`：重采集→parse→validate→patch\n
- **输入**：`extensionId, targetTabId, taskSchemaVersion, options(timeBudget, maxIterations, enableFallback...)`\n
- **输出**：`WorkflowRunResult`（xpaths, validationSummary, cache{hit,wrote,patched}, debugRefs）

## B) plasmo-app（Runtime Tools / 确定性执行层）
### B1. `StagehandXPathManager`（已存在）
- **位置**：`mimorepo/apps/plasmo-app/src/background/index.ts`
- **职责**：消息路由 + 参数校验 + 选择目标 tab + 错误可读化。
- **对外协议**：实现 `STAGEHAND_XPATH_SCAN/RESUME_BLOCKS_EXTRACT/RESUME_XPATH_VALIDATE/STAGEHAND_VIEWPORT_SCREENSHOT/LIST_TABS`。

### B2. `StagehandXPathScanner`（已存在）
- **位置**：`mimorepo/apps/plasmo-app/src/background/libs/StagehandXPathScanner.ts`
- **职责**：通过 CDP 扫描跨 iframe/OOPIF 的候选元素，生成 stagehand 风格 XPath，并处理 frame 前缀拼接语义。
- **输出**：`StagehandXPathItem[]`（xpath/tagName/textSnippet...）

### B3. `StagehandViewportScreenshotter`（已存在）
- **位置**：`mimorepo/apps/plasmo-app/src/background/libs/StagehandViewportScreenshotter.ts`
- **职责**：viewport 截图（可异步 tool-call），返回 base64/dataUrl/meta。
- **观测**：`meta.durationMs`，并在异步场景通过 `postToolCallResult()` 回传 Nitro。

### B4. `ResumeBlocksExtractor`（已存在，但产品定位需调整）
- **位置**：`mimorepo/apps/plasmo-app/src/background/libs/ResumeBlocksExtractor.ts`
- **职责（现状）**：抽取 blocks 与 candidates 作为 LLM 输入。\n
- **产品定位（建议）**：作为 **候选来源之一/调试工具**；长期由 `CdpDomDigestBuilder`（结构化 digest）替代为核心输入（对齐 xpath-generage 指导）。

### B5. `ResumeXpathValidator`（已存在：最终真相）
- **位置**：`mimorepo/apps/plasmo-app/src/background/libs/ResumeXpathValidator.ts`
- **职责**：批量验证 XPath，输出 `matchedCount/firstTextSnippet`。\n
- **产品约束**：任何 cache hit/LLM 输出都必须经过它验证后才算“成功”。

### B6. （拟新增）`CdpDomDigestBuilder`
- **职责**：从 CDP DOM 构建可控体积 `DomDigest`：采样/裁剪/上限/抗注入 notes（对齐 `03-dom-digest-spec.md`）。
- **输入**：tabId + includeShadow + limits\n
- **输出**：结构化 digest + `domDigestHash`（用于 PageSignature 与 cache key）。

### B7. （拟新增）`XPathCandidateProvider`
- **职责**：输出“LLM 允许选择的候选集合”（抑制 hallucination 的关键边界）。\n
- **输入**：digest +（可选）scanner 输出\n
- **输出**：`candidates[]`（含 xpath/text/layout/frameId/signal）\n
- **约束**：候选量必须可控（例如 500~3000）。

### B8. （拟新增）`TextToDomLocator`
- **职责**：把 screenshot 产生的短文本 anchors 映射回 DOM 元素候选。\n
- **输入**：anchors + digest\n
- **输出**：字段→候选元素（xpath+score+reason）

### B9. （拟新增）`XPathStabilizer`
- **职责**：从“元素候选”生成更稳定 xpath（abs/iframePrefixed/relativeToContainer），并输出多候选供验证选优。\n

## C) nitro-app（LLM + Persist + Broadcast）
### C1. `ResumeParseService`（已存在：`/api/resume/parse`）
- **位置**：`mimorepo/apps/nitro-app/server/routes/api/resume/parse.post.ts`
- **职责**：构建 prompt、调用模型、解析 JSON、落盘样本与事件。\n
- **强约束**：prompt 明确“xpath 必须来自 candidates、输出严格 JSON”（`server/lib/prompts/jsonresume_xpath.ts`）。

### C2. `ResumeFeedbackStore`（已存在：`/api/resume/feedback`）
- **位置**：`mimorepo/apps/nitro-app/server/routes/api/resume/feedback.post.ts`
- **职责**：保存字段级验证反馈（用于离线评估、提示词迭代与质量追踪）。

### C3. `WorkflowCacheService`（已存在：`/api/workflow-cache/*`）
- **位置**：\n
  - routes：`mimorepo/apps/nitro-app/server/routes/api/workflow-cache/*`\n
  - store：`mimorepo/apps/nitro-app/server/stores/workflowCacheStore.ts`\n
  - key hashing：`mimorepo/apps/nitro-app/server/lib/workflowCacheKey.ts`\n
- **职责**：按 `extensionId + cacheId` 读写 entry；支持 patch（自愈刷新）。\n
- **产品约束**：禁止存 screenshot base64 与大段页面文本，只存引用/摘要（对齐 Stagehand v3 cache 的体积控制精神）。

### C4. `ToolCallService` + `ToolCallWsHub`（已存在）
- **位置**：\n
  - request：`server/routes/api/tool-call/request.post.ts`\n
  - result：`server/routes/api/tool-call/result.post.ts`\n
  - ws：`server/routes/api/tool-call/ws.ts`\n
  - hub：`server/lib/toolCallWsHub.ts`\n
- **职责**：把截图类工具变成异步任务；result 到来时落盘 upload 并 ws 广播。\n

### C5. `ExtensionRegistry`（已存在）
- **位置**：`server/routes/api/extension/*` + `stores/extensionConfigStore`（间接）\n
- **职责**：记录 extensionId/extensionName，供 next-app 拉取列表与选择。\n

## D) 关键跨层约束（必须写进评审标准）
- **`ResumeXpathValidator` 是最终判定器**：任何 LLM/cache 输出都必须验证。\n
- **LLM 必须被 candidates 边界约束**：不能让模型自由编造 xpath。\n
- **cache hit 必须再验证，失败必须自愈并 patch**：对齐 Stagehand v3 的 self-heal refresh。\n
- **隐私与体积控制**：截图走 upload+url，cache/样本禁止存 base64。\n

