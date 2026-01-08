### Agent：AISDK tools 与 CUA 两条路径

Stagehand v3 的 `V3.agent()` 根据配置进入两种不同体系：

- **AISDK tools agent**（默认）：基于 AI SDK 的 tool calling，工具落在 `lib/v3/agent/tools/*`
- **CUA agent**（`mode: "cua"` 或旧 `cua: true`）：对接各厂商 Computer Use Agent（OpenAI/Anthropic/Google/Microsoft）

---

### 1) 入口选择：`V3.agent(options)`

- 判定：`isCuaMode = options?.mode === "cua" || options?.cua === true`
- CUA 模式会做 `validateExperimentalFeatures(...)`，并验证模型属于 CUA 允许集合（否则抛 `CuaModelRequiredError`）

---

### 2) AISDK tools agent：`V3AgentHandler`

#### 2.1 handler 构造与依赖

- 构造：`new V3AgentHandler(v3, logger, llmClient, executionModel?, systemInstructions?, mcpTools?, mode?)`
- 关键依赖：
  - `LLMClient.getLanguageModel()`：拿到 `LanguageModelV2` 供 AI SDK `generateText/streamText` 使用
  - `createAgentTools(v3, { executionModel, mode, provider, excludeTools })`
  - `resolveTools(integrations, userTools)`：把 MCP server 的 tools 拉进来，合并进 ToolSet

#### 2.2 tools 机制（mode 裁剪）

`createAgentTools()` 先组装全量工具，再按 mode 裁剪：

- **dom mode（默认）**：移除坐标工具（`click/type/dragAndDrop/clickAndHold/fillFormVision`）
- **hybrid mode**：移除 DOM 表单工具 `fillForm`，保留坐标版 `fillFormVision`；`scroll` 也切到 vision 版本

> tool 的具体实现会调用 `v3.act/v3.extract/v3.observe` 或直接走 page 的 Understudy 方法，并把 replay step 记录到 `V3.recordAgentReplayStep(...)`。

#### 2.3 execute/stream 与停止条件

- `execute()`：`llmClient.generateText({ tools, stopWhen, onStepFinish, ... })`
- `stream()`：`llmClient.streamText({ tools, stopWhen, onChunk/onFinish, ... })`
- 停止条件：如果最后一步的 toolCalls 里出现 `close`，就 stop；否则按 `maxSteps` 限制

---

### 3) CUA agent：`V3CuaAgentHandler` + `AgentProvider`

#### 3.1 角色分工

- **`V3CuaAgentHandler`**：把“截图 → agent 决策 → 执行动作（坐标/键盘/滚动等）→ 再截图”串起来
- **`AgentProvider`**：按 model/provider 选择具体 `AgentClient`（OpenAI/Anthropic/Google/Microsoft）

#### 3.2 关键依赖注入

`V3CuaAgentHandler.setupAgentClient()` 会向 `agentClient` 注入两类能力：

- **ScreenshotProvider**：从 `v3.context.awaitActivePage().screenshot()` 获取 base64 PNG；部分 client 需要额外设置截图尺寸
- **ActionHandler**：把 agent 的动作（click/drag/type/keys/scroll/close 等）落到 Understudy `Page` 上执行

#### 3.3 replay 录制与 cache

- 当 `V3` 的 `AgentCache` 处于 recording 状态时（cacheContext 存在），`V3CuaAgentHandler` 会在执行动作时记录 replay step（例如把坐标 click 转为 xpath selector）
- cache hit 时，`AgentCache.tryReplay()` 会用 `V3Context` + `ActHandler.takeDeterministicAction()` 回放步骤，并在必要时自愈更新 steps

---

### 4) MCP integrations（只在 AISDK tools agent 可用）

- `resolveTools()` 会对每个 MCP client（或 URL）调用 `listTools`，并把工具转成 AI SDK ToolSet
- API 模式下（`StagehandAPIClient.agentExecute`），如果 `agentConfig.integrations` 非空会抛 `ExperimentalNotConfiguredError("MCP integrations")`
