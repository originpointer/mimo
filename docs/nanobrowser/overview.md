### 概览：Nanobrowser core_ext 的运行形态

Nanobrowser 是一个 MV3 Chrome 扩展。核心执行引擎运行在 **background service worker** 中，通过 side-panel 的 `Port` 长连接接收任务、推送执行事件，并使用 Puppeteer + Chrome APIs 在浏览器里完成“观察→计划→执行”的自动化。

### 1) 核心目录

- **执行引擎**：`chrome-extension/src/background/`
  - `index.ts`：连接 side-panel、路由消息、初始化 Executor
  - `agent/`：多 agent（Planner/Navigator）+ actions + messages + event
  - `browser/`：BrowserContext/Page/DOM service（Puppeteer + chrome.scripting）
  - `services/`：analytics、speechToText、guardrails

- **存储抽象**：`packages/storage/lib/`
  - `settings/*`：providers / agent models / firewall / general settings / analytics settings
  - `chat/history.ts`：任务历史与 agent step history

### 2) Background 的核心入口与消息协议

文件：`chrome-extension/src/background/index.ts`

- **长连接来源**：`chrome.runtime.onConnect`
  - 仅接受 `port.name === "side-panel-connection"`
  - 校验 `sender.url === chrome.runtime.getURL('side-panel/index.html')` 且 `sender.id === chrome.runtime.id`

- **主要消息类型**（port.onMessage）：
  - `new_task`：创建 Executor → 订阅事件 → `Executor.execute()`
  - `follow_up_task`：`executor.addFollowUpTask()` → 再次 `execute()`
  - `pause_task` / `resume_task` / `cancel_task`
  - `screenshot` / `state` / `nohighlight` / `speech_to_text` / `replay`

- **任务结束清理**：当收到 `ExecutionState.TASK_OK|TASK_FAIL|TASK_CANCEL` 事件时，`subscribeToExecutorEvents()` 会触发 `currentExecutor.cleanup()`。

### 3) 浏览器控制：Puppeteer in extension

文件：`chrome-extension/src/background/browser/page.ts`

- Page 在 `attachPuppeteer()` 时通过 `ExtensionTransport.connectTab(tabId)` 建立 CDP 连接，并使用 `puppeteer-core` 的 `connect()` 获取 `Browser`/`Page`。
- 会注入 anti-detection 脚本（`evaluateOnNewDocument`），并强制 Shadow DOM open。

### 4) DOM 观察：构建 DOM tree 与 clickable map

文件：`chrome-extension/src/background/browser/dom/service.ts`

- 使用 `chrome.scripting.executeScript` 调用页面内注入的 `window.buildDomTree(args)`。
- 对跨域 iframe 等场景有 fallback：
  - 先在主 frame 构建 tree
  - 若检测到可见 iframe 加载失败，会遍历 `chrome.webNavigation.getAllFrames`，对失败 frame 单独执行 buildDomTree，再合并成 frame tree。

### 5) 多 Agent 执行模型

文件：`chrome-extension/src/background/agent/executor.ts`

- `Executor` 内部持有：
  - `AgentContext`（AbortController、step 计数、BrowserContext、MessageManager、EventManager、options、history）
  - `PlannerAgent`：周期性规划（`planningInterval`）并产出 done/next_steps
  - `NavigatorAgent`：执行动作（ActionBuilder 构建的 action toolset）

- 事件/状态机：`ExecutionState`（task/step/act）通过 `EventManager.emit()` 推送给 UI。

### 6) 配置来源（Storage）

- LLM Providers：`llmProviderStore.getAllProviders()`
- Agent model 绑定：`agentModelStore.getAllAgentModels()`（Planner/Navigator）
- 防火墙：`firewallStore.getFirewall()`（URL allow/deny）
- 通用执行参数：`generalSettingsStore.getSettings()`（maxSteps/maxFailures/useVision/displayHighlights/...）
- 历史回放开关：`generalSettings.replayHistoricalTasks`（影响是否写 `chatHistoryStore.storeAgentStepHistory`）
