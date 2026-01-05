### Storage：providers / models / settings / history（background 使用视角）

Nanobrowser 把扩展配置与历史数据封装在 `packages/storage`，background 通过这些 store 读取配置并驱动执行。

---

### 1) 总入口

- `packages/storage/lib/index.ts` 主要 re-export：
  - `settings/*`
  - `chat/*`
  - `profile/*`

---

### 2) LLM Providers：`llmProviderStore`

文件：`packages/storage/lib/settings/llmProviders.ts`

- `llmProviderStore.getAllProviders()`：background 在 `setupExecutor()` 用它拿到所有 provider configs
- providerConfig 关键字段：
  - `apiKey`（Ollama 允许本地占位）
  - `baseUrl`（Custom OpenAI / OpenRouter / Azure endpoint 等）
  - Azure 专用：`azureDeploymentNames`、`azureApiVersion`
- 兼容性：`ensureBackwardCompatibility()` 会补齐缺失字段，并清理 Azure 上遗留的 `modelNames`

---

### 3) Agent Models：`agentModelStore`

文件：`packages/storage/lib/settings/agentModels.ts`

- `agentModelStore.getAllAgentModels()`：返回 `agents: Record<AgentNameEnum, ModelConfig>`
- `cleanupLegacyValidatorSettings()`：删除旧 `validator` 配置（background 会在每次 setupExecutor 先调用）
- `ModelConfig`：
  - `provider`：指向 `llmProviderStore` 的 key（不是展示名称）
  - `modelName`：具体模型名
  - `parameters`：temperature/topP 等，会与默认参数合并
  - `reasoningEffort`：OpenAI o-series / GPT-5 reasoning models 使用

---

### 4) Firewall：`firewallStore` 与 URL 过滤

- store：`packages/storage/lib/settings/firewall.ts`
  - `enabled` + `allowList/denyList`
- background 会把 allow/deny 写入 `BrowserContext` config
- URL 检查逻辑在：`chrome-extension/src/background/browser/util.ts`（`isUrlAllowed`）
  - 永久阻断：`chrome://`、`chrome-extension://`、`javascript:`、`data:`、`file:`、`ws:`、`wss:`、Chrome Web Store 等

---

### 5) General Settings：`generalSettingsStore`

文件：`packages/storage/lib/settings/generalSettings.ts`

- 影响 Executor：`maxSteps/maxFailures/maxActionsPerStep/useVision/planningInterval/replayHistoricalTasks`
- 影响 BrowserContext：`displayHighlights/minWaitPageLoad`

---

### 6) Analytics Settings：`analyticsSettingsStore`

文件：`packages/storage/lib/settings/analyticsSettings.ts`

- `enabled` 默认 true
- 自动生成 `anonymousUserId` 并持久化
- background 订阅 `analyticsSettingsStore.subscribe`，在变化时调用 `analytics.updateSettings()`

---

### 7) Chat / Task History：`chatHistoryStore`

文件：`packages/storage/lib/chat/history.ts`

- session metadata 存在 `chat_sessions_meta`（Local + liveUpdate）
- 每个 session 的 messages 单独存 `chat_messages_<sessionId>`
- agent step history 也按 session 存储（`chat_agent_step_<sessionId>`）
- background 的使用点：
  - `Executor.execute()` finally：若 `generalSettings.replayHistoricalTasks` 开启，则写入 `storeAgentStepHistory(taskId, task, historyJson)`
  - `replay` 消息：从 UI 提供 `historySessionId`，调用 `Executor.replayHistory(historySessionId)`
