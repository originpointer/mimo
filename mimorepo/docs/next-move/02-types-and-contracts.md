# 02 类型与契约（协议、数据结构、稳定边界）

本篇把“跨三端的数据结构”固定为可评审的契约，避免实现分叉。

## 1) next-app ↔ plasmo-app：消息协议（External Message）
### 1.1 Message Type 常量（单一真源）
`next-app` 侧类型定义聚合在：
- `mimorepo/apps/next-app/types/plasmo.ts`

`plasmo-app` 侧同名常量/类型分散在：
- `mimorepo/apps/plasmo-app/src/types/stagehand-xpath.ts`
- `mimorepo/apps/plasmo-app/src/types/stagehand-screenshot.ts`
- `mimorepo/apps/plasmo-app/src/types/resume-blocks.ts`
- `mimorepo/apps/plasmo-app/src/types/resume-validate.ts`
- `mimorepo/apps/plasmo-app/src/types/list-tabs.ts`

这些消息由插件端 `StagehandXPathManager` 同时通过：
- `chrome.runtime.onMessage`（同扩展内）
- `chrome.runtime.onMessageExternal`（next-app 外部调用）
处理（见 `mimorepo/apps/plasmo-app/src/background/index.ts`）。

### 1.2 现有 message 契约（字段必须对齐）
#### A) `STAGEHAND_XPATH_SCAN`
- **用途**：扫描“可交互元素”并返回 stagehand 风格 XPath 列表。
- **payload**：`StagehandXPathScanPayload`（maxItems/selector/includeShadow/targetTabId?）
- **response**：`StagehandXPathScanResponse`

#### B) `RESUME_BLOCKS_EXTRACT`
- **用途**：抽取 blocks + candidates（给 LLM 选择/给 UI 调试）。
- **payload**：`ResumeBlocksExtractPayload`
- **response**：`ResumeBlocksExtractResponse`
  - 必备：`page, blocks`
  - 可选：`mainContainer, candidates, meta`

#### C) `RESUME_XPATH_VALIDATE`
- **用途**：对一组 XPath 进行客观验证（matchedCount/snippet）。
- **payload**：`ResumeXpathValidatePayload`（xpaths[] 必填）
- **response**：`ResumeXpathValidateResponse`

#### D) `STAGEHAND_VIEWPORT_SCREENSHOT`
- **用途**：对当前 viewport 截图（天然包含 iframe 可视区域）。
- **payload**：`StagehandViewportScreenshotPayload`（taskId? 用于与 Nitro tool-call 关联）
- **response**：`StagehandViewportScreenshotResponse`（dataUrl/base64/meta）

#### E) `LIST_TABS`
- **用途**：列出 tabs（next-app 选择目标页）。
- **payload**：`ListTabsPayload`（includeAllWindows?）
- **response**：`ListTabsResponse`

### 1.3 协议稳定性要求（产品级）
- **不可破坏**：`type` 字符串、response shape（`ok` + `error`）、`meta.durationMs`（用于指标）。
- **必须具备**：错误信息可读（参见 `07-failure-modes-playbook.md` 的症状→修复）。
- **建议扩展方式**：只增字段不删字段；新增 message type 时同步维护 `next-app/types/plasmo.ts`。

## 2) next-app ↔ nitro-app：HTTP/WS 契约
### 2.1 Extension 注册与选择
- `POST /api/extension/extension-id`：插件启动上报 `{ extensionId, extensionName }`
  - 实现：`mimorepo/apps/nitro-app/server/routes/api/extension/extension-id.post.ts`
- `GET /api/extension/extension-list`：next-app 拉取扩展列表以获得 `extensionId`
  - 实现：`mimorepo/apps/nitro-app/server/routes/api/extension/extension-list.get.ts`

### 2.2 LLM 解析与反馈（离线评估必需）
- `POST /api/resume/parse`
  - body：`{ sample: ResumeSample }`
  - resp：`{ ok, sampleId, jsonResumeXPath, meta }`
  - prompt：`mimorepo/apps/nitro-app/server/lib/prompts/jsonresume_xpath.ts`
    - **强约束**：只能使用 candidates 中出现的 xpath；输出必须严格 JSON（不带 codefence）。
- `POST /api/resume/feedback`
  - body：`{ sampleId, feedback }`
  - resp：`{ ok, sampleId }`

### 2.3 Tool-call（截图异步任务）与 WebSocket 推送
用途：让 next-app 不必等待插件截图完成，以任务形式接收结果。

- `POST /api/tool-call/request`
  - body：`{ extensionId, toolType: "viewportScreenshot", targetTabId? }`
  - resp：`{ ok, taskId, instruction: { type: "STAGEHAND_VIEWPORT_SCREENSHOT", payload: { taskId, targetTabId? }}}`
  - 实现：`mimorepo/apps/nitro-app/server/routes/api/tool-call/request.post.ts`

- `POST /api/tool-call/result`（插件回传）
  - body：`{ taskId, extensionId, toolType, ok, dataUrl?, base64?, meta?, error? }`
  - 特性：Nitro 会把 base64 落盘为 upload，并返回 `imageUrl`；同时通过 WS 广播结果
  - 实现：`mimorepo/apps/nitro-app/server/routes/api/tool-call/result.post.ts`

- `WS /api/tool-call/ws`
  - 消息：`{ type:"tool-call:result", taskId, toolType, ok, imageUrl?, meta?, error? }`
  - 实现：`mimorepo/apps/nitro-app/server/routes/api/tool-call/ws.ts` + `server/lib/toolCallWsHub.ts`

## 3) WorkflowCache：Key/Entry/Patch 契约（远端可回放工作流）
### 3.1 类型定义（Nitro 单一真源）
定义在：`mimorepo/apps/nitro-app/server/stores/workflowCacheStore.ts`

核心类型：
- `WorkflowCacheKey`
- `WorkflowCacheEntry`
- `ValidationSummary`（字段级 matchedCount 汇总）
- `PageSignature`（用于避免错用 cache）

### 3.2 cacheId 的计算（决定兼容性）
- 计算逻辑：`mimorepo/apps/nitro-app/server/lib/workflowCacheKey.ts`
  - `stableStringify(key)`：对象 key 排序，确保确定性
  - `sha256Hex(prefix + canonical)`：生成 full hash
  - `cacheId = fullHash.slice(0, shortLen)`：默认 24 位短 id

**产品约束**：只要 `WorkflowCacheKey` 语义不变，cacheId 必须稳定；否则会造成“命中率断崖式变化”。

### 3.3 API 契约
实现端点：
- `POST /api/workflow-cache/get`（`server/routes/api/workflow-cache/get.post.ts`）
- `POST /api/workflow-cache/put`（`.../put.post.ts`）
- `POST /api/workflow-cache/patch`（`.../patch.post.ts`）

共同字段：都要求 `extensionId`（用于隔离不同扩展/团队的数据）。

### 3.4 PageSignature 规范（对齐 06-metrics-and-quality）
`PageSignature` 用于防止“不同页面误复用 cache”。建议包含：
- `host`
- `pathPattern`（去 query/fragment 的粗粒度 path）
- `titleHash?`
- `domDigestHash`（digest 的结构/文本摘要哈希）
- `framesSummary?`（frameCount/oopifCount）

**现状**：类型已存在，但 `domDigestHash` 的来源需要在“执行步骤”里定义（见 `04-execution-steps.md`）。

### 3.5 WorkflowCacheEntry.history 规范
`history[]` 是产品“可解释/可自愈”的关键。建议统一：
- `iteration`：第几轮（从 0 或 1 统一）
- `action`：`pick | validate | fallback | locate | stabilize | repair`
- `note/delta`：只存结构化小对象，禁止存 base64、大段文本

## 4) 输出数据：JSON Resume XPath 结构约束

### 4.1 Nitro `resume/parse` 的输出形态
`nitro-app` 当前会返回：
- `jsonResumeXPath`: 任意 JSON（由 LLM 生成）

为了让后续“验证/缓存/自愈”可规模化，产品层建议将 LLM 输出收敛成两级：
- **字段级（scalar）**：值为 xpath 字符串，期望 `matchedCount == 1`
- **容器级（container）**：值为 xpath 字符串，允许 `matchedCount >= 1`（但标记为弱通过）

### 4.2 next-app 侧 flatten 规则（用于验证）
next-app 当前会把 `jsonResumeXPath` 中所有看起来像 XPath 的字符串 flatten 成数组并发送 `RESUME_XPATH_VALIDATE`。\n
产品约束建议：
- 只要字符串以 `/` 开头即可视为 XPath（现状逻辑即如此）。
- 对数组路径要保留 `fieldPath` 以便反馈与指标统计（例如 `work[0].company`）。

### 4.3 ValidationSummary 生成（用于 WorkflowCache）
从插件返回的 `results[]` 生成（建议由 next-app 统一生成并上送 Nitro）：\n
- `total`: 字段数\n
- `okCount`: matchedCount==1 的数量\n
- `zeroHitCount`: matchedCount==0\n
- `multiHitCount`: matchedCount>1\n
- `items`: 字段级详细（用于离线分析/自愈策略）

## 5) 错误语义（跨端一致性）
为便于 UI 引导与 playbook 对齐，建议统一把错误归入以下类（以字符串前缀或 errorCode 可选实现）：\n
- **AttachError**：`chrome.debugger.attach` 失败（如 DevTools 已占用）\n
- **NotScannableUrl**：tab url 非 http/https\n
- **EvaluateError**：`Runtime.evaluate/document.evaluate` 异常\n
- **CoverageError**：iframe/OOPIF 覆盖不足导致 0 命中\n
- **LLMInvalidOutput**：非 JSON 或 xpath 不在 candidates\n
\n
> 说明：目前协议仅返回 `{ ok:false, error:string }`，不要求立刻引入 errorCode；但文档中先固定分类，便于后续演进且不破坏兼容性。

