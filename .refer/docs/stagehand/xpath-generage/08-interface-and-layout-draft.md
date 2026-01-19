## 08 接口 / 文件布局草案（远端 WorkflowCache + JSON Resume）

本草案用于把 `xpath-generage` 文档落到可实现的工程结构。\n
前提选择：
- WorkflowCache：**远端服务持久化**（跨设备/团队共享）
- 字段 schema：**JSON Resume**（basics/work/education/projects/skills/...）

> 说明：这是“接口与目录草案”，不是最终实现；可按实际仓库命名与分层微调。

---

## A. 插件端建议目录（Plasmo / MV3）

以 `mimorepo/apps/plasmo-app/src/background/` 为基底，建议新增：

```text
mimorepo/apps/plasmo-app/src/
  background/
    libs/
      resume-xpath-workflow/
        ResumeXpathWorkflowOrchestrator.ts
        CdpDomDigestBuilder.ts
        XPathCandidateProvider.ts
        LlmResumeUnderstandingClient.ts
        TextToDomLocator.ts
        XPathStabilizer.ts
        WorkflowCacheClient.ts
        MetricsCollector.ts
        jsonResume/
          schema.ts
          flatten.ts
          fieldTypes.ts
      # 复用既有
      StagehandXPathScanner.ts
      StagehandViewportScreenshotter.ts
      ResumeXpathValidator.ts
    stagehandSnapshot.ts
    index.ts

  types/
    resume-xpath-workflow.ts
    workflow-cache.ts
    dom-digest.ts
    json-resume-xpath.ts

  apis/
    workflowCache.ts
    # 已有：apis.ts 等（若存在）
```

### 关键约束（落地时必须坚持）
- `XPathValidator` 必须是“最终判定器”（matchedCount），cache hit 也必须先验证（见 `04-hybrid-workflow.md`）。
- PickXPath 输出必须 **只允许使用 candidates 中的 xpath**（强约束，抑制幻觉）。

---

## B. TypeScript 接口草案（插件端）

### 1) JSON Resume XPath 输出类型（简化）

```ts
export type JsonResumeXpath = {
  basics?: { xpath: string }
  work?: Array<{ xpath: string }>
  education?: Array<{ xpath: string }>
  projects?: Array<{ xpath: string }>
  skills?: Array<{ xpath: string }>
  summary?: { xpath: string }
}
```

> 注：你们 repo 里已有类似定义（`mimorepo/apps/next-app/lib/resumeJsonResumeXpath.ts`、`mimorepo/apps/plasmo-app/src/utils/resumeJsonResumeXpath.ts`），建议复用/统一到 `types/json-resume-xpath.ts`。

### 2) PageSignature（用于 cacheKey）

```ts
export type PageSignature = {
  host: string
  pathPattern: string
  titleHash?: string
  domDigestHash: string
  framesSummary?: { frameCount: number; oopifCount: number }
}
```

对应说明见 `06-metrics-and-quality.md` 的 PageSignature。

### 3) 验证结果

```ts
export type XPathValidationItem = {
  xpath: string
  matchedCount: number
  firstTextSnippet?: string
}

export type ValidationSummary = {
  total: number
  okCount: number
  zeroHitCount: number
  multiHitCount: number
  items: XPathValidationItem[]
}
```

### 4) WorkflowCache 条目

```ts
export type WorkflowCacheKey = {
  host: string
  pageSignature: PageSignature
  taskSchemaVersion: string
  digestVersion: string
  promptVersion: string
  modelId: string
}

export type WorkflowCacheEntry = {
  key: WorkflowCacheKey
  xpaths: JsonResumeXpath
  validation: ValidationSummary
  qualityScore?: number
  createdAt: number
  updatedAt: number
  history: Array<{
    at: number
    iteration: number
    action: "pick" | "validate" | "fallback" | "locate" | "stabilize" | "repair"
    note?: string
    delta?: unknown
  }>
}
```

### 5) 远端 cache client（插件端）

```ts
export interface WorkflowCacheClient {
  get(key: WorkflowCacheKey): Promise<{ hit: true; entry: WorkflowCacheEntry } | { hit: false }>
  put(entry: WorkflowCacheEntry): Promise<{ ok: true } | { ok: false; error: string }>
  patch(input: {
    key: WorkflowCacheKey
    patch: Partial<Pick<WorkflowCacheEntry, "xpaths" | "validation" | "updatedAt" | "history">>
  }): Promise<{ ok: true } | { ok: false; error: string }>
}
```

> `patch` 用于 self-healing：验证/回放成功但步骤/结果变化时更新条目（对齐 `../v3-cache.md` 的“回放后刷新 entry”）。

---

## C. 远端服务 API 草案（WorkflowCache Service）

建议在你们现有 Nitro 服务（`mimorepo/apps/nitro-app/server/routes/api/`）下新增：

```text
mimorepo/apps/nitro-app/server/routes/api/workflow-cache/get.post.ts
mimorepo/apps/nitro-app/server/routes/api/workflow-cache/put.post.ts
mimorepo/apps/nitro-app/server/routes/api/workflow-cache/patch.post.ts
```

### 1) `POST /api/workflow-cache/get`
- **body**：`{ key: WorkflowCacheKey }`
- **resp**：
  - hit：`{ ok: true, hit: true, entry: WorkflowCacheEntry }`
  - miss：`{ ok: true, hit: false }`

### 2) `POST /api/workflow-cache/put`
- **body**：`{ entry: WorkflowCacheEntry }`
- **resp**：`{ ok: true } | { ok: false, error }`

### 3) `POST /api/workflow-cache/patch`
- **body**：`{ key, patch }`
- **resp**：`{ ok: true } | { ok: false, error }`

### 安全/鉴权（必须做）
- **tenant/extensionId**：至少按 extensionId 或 teamId 分区，避免不同团队互相污染 cache。\n
- **权限**：写入/patch 需要鉴权（token / session）。\n
- **敏感字段**：不要把截图 base64、原始页面大段文本直接写入 cache（体积与隐私风险）。

---

## D. Orchestrator 的最小接口（便于从 UI 调用）

```ts
export type ResumeXpathWorkflowRunOptions = {
  includeShadow?: boolean
  enableScreenshotFallback?: boolean
  maxIterations?: number
  timeBudgetMs?: number
}

export type ResumeXpathWorkflowResult =
  | { ok: true; xpaths: JsonResumeXpath; validation: ValidationSummary; cache: { hit: boolean; wrote: boolean } }
  | { ok: false; error: string; validation?: ValidationSummary }
```

---

## E. 与现有代码的对齐点（避免重复造轮子）
- **验证器**：直接复用 `mimorepo/apps/plasmo-app/src/background/libs/ResumeXpathValidator.ts`（已输出 matchedCount + snippet）。\n
- **iframe/OOPIF xpath 拼接语义**：对齐 `StagehandXPathScanner.ts` 与 `stagehandSnapshot.ts`。\n
- **LLM parse/feedback**：当前已有 `resume/parse` 与 `resume/feedback`；WorkflowCache 可复用同样的落盘/事件记录方式。\n

