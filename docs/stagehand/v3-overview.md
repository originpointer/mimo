### V3 概览：Stagehand v3 的编排器

`V3` 是 Stagehand v3 的高层编排器：屏蔽浏览器运行环境差异（本地 Chrome vs Browserbase），对外暴露一致的 `act` / `extract` / `observe` / `agent` API，并在内部管理 LLM、CDP 上下文、缓存与日志。

### 关键入口

- **导出**：`lib/v3/index.ts` 导出 `V3`，同时 `export { V3 as Stagehand }`
- **实现**：`lib/v3/v3.ts`（`export class V3`）

### 生命周期（constructor / init / close）

- **constructor(V3Options)**
  - 解析 `model`（字符串或 `{ modelName, ...clientOptions }`）
  - 创建并持有：
    - `LLMProvider`（用于按 model/provider 选择 `LLMClient` 实现）
    - 默认 `llmClient`（通过 `LLMProvider.getClient()`）
    - `CacheStorage` + `ActCache` + `AgentCache`（缓存依赖通过回调注入：`getActHandler/getContext/resolveLlmClient/...`）
    - 绑定 per-instance logger（`bindInstanceLogger` + `withInstanceLogContext`）
    - 初始化 `SessionFileLogger`（用于流程日志/回放事件记录）

- **init()**：初始化三大 handler，并建立 CDP 上下文
  - 初始化 handlers：`ActHandler` / `ExtractHandler` / `ObserveHandler`
    - 依赖注入点：`resolveLlmClient(modelOverride)`、`systemPrompt`、`domSettleTimeoutMs`、metrics 回调
  - 根据 `opts.env` 选择浏览器环境：
    - **LOCAL**：`launchLocalChrome()` 或 attach 到现有 `cdpUrl`，随后 `V3Context.create(ws)`
    - **BROWSERBASE**：`createBrowserbaseSession()`，随后 `V3Context.create(ws)`
  - **可选 API 模式**：Browserbase 下会尝试初始化 `StagehandAPIClient`
    - API client 负责把 act/extract/observe/agentExecute 代理到服务器；SDK 侧仍保留本地 handler 作为 fallback

- **close({force?})**：释放资源
  - 结束 `StagehandAPIClient` session（若存在）
  - 关闭 `V3Context`（CDP connection）
  - 本地 Chrome：`chrome.kill()` + 清理临时 profile（若创建且未 preserve）
  - 解绑 instance logger，清空 event bus listeners，重置内部状态

### 环境分支：LOCAL vs BROWSERBASE

- **LOCAL**：
  - 连接来源：
    - attach：`localBrowserLaunchOptions.cdpUrl`
    - launch：`launchLocalChrome({ chromeFlags, headless, userDataDir, ... })`
  - 建链：`V3Context.create(ws, { env: "LOCAL" })`

- **BROWSERBASE**：
  - 会话：`createBrowserbaseSession(apiKey, projectId, params, resumeSessionId?)`
  - 建链：`V3Context.create(ws, { env: "BROWSERBASE", apiClient })`
  - 额外元数据：`browserbaseSessionId/sessionUrl/debugUrl`

### API mode / experimental / disableAPI

- `disableAPI=true`：强制不走 `StagehandAPIClient`（即使在 Browserbase 环境）
- `experimental=true`：部分 provider（例如 vertex）在非 disableAPI 时会抛 `ExperimentalNotConfiguredError`；同时 agent 分支有额外校验
- 当 `opts.llmClient` 由用户直接注入时，SDK 会把 `disableAPI` 设为 true（避免 API 端依赖 modelApiKey 等）

### 日志与指标

- **实例级日志路由**：`lib/v3/logger.ts`
  - `withInstanceLogContext(instanceId, fn)` 建立 AsyncLocalStorage 上下文
  - `v3Logger()` 在 handler 内被大量使用，用于路由到当前实例 logger
- **流程日志**：`lib/v3/flowLogger.ts`
  - 记录 StagehandStep / UnderstudyAction / CDP / LLM 等事件（可用于回放与排障）
- **metrics**：`V3.updateMetrics()` 聚合 act/extract/observe/agent 的 token/time 统计（API 模式时可从服务器拉取 replay metrics）
