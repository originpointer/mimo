### Cache：ActCache 与 AgentCache

Stagehand v3 的缓存以 `CacheStorage` 为基础，提供两类缓存：

- **ActCache**：缓存 `act(instruction)` 生成的动作序列（便于后续同页同变量快速回放）
- **AgentCache**：缓存 agent 的 replay steps + 最终结果（支持 execute 与 stream）

---

### 1) `CacheStorage`：文件系统读写与启用条件

文件：`lib/v3/cache/CacheStorage.ts`

- `CacheStorage.create(cacheDir, logger)`
  - 若 `cacheDir` 为空：`enabled=false`（整个缓存关闭）
  - 若 mkdir 失败：降级为 disabled（写日志）
- 提供：`readJson<T>(fileName)` / `writeJson(fileName, data)`

---

### 2) `ActCache`：instruction → actions replay

文件：`lib/v3/cache/ActCache.ts`

#### 2.1 cache key

- `cacheKey = sha256({ instruction, url, variableKeys })`
- `url` 来自 `safeGetPageUrl(page)`

#### 2.2 replay

- `tryReplay(context, page, timeout)`：读取 `${cacheKey}.json`
- 命中后：对 entry.actions 逐个调用 `ActHandler.takeDeterministicAction(...)`
- 若回放成功且 actions 与 entry 不一致：会更新 cache entry（自愈后刷新）

#### 2.3 依赖注入

- ActCache 不直接持有 handler，而是通过 `getActHandler()` 在 replay 时获取（避免 init 前引用）

---

### 3) `AgentCache`：agent 录制/回放/stream 兼容

文件：`lib/v3/cache/AgentCache.ts`

#### 3.1 configSignature 与 cacheKey

- `configSignature` 包含：
  - v3 基础 model + systemPrompt
  - agent 是否 cua
  - agent model / executionModel（非 cua 才用）
  - tools keys / integrations signatures
- `cacheKey = sha256({ instruction, startUrl, options, configSignature })`

#### 3.2 recording（由 V3 触发）

- `beginRecording()`：开始收集 replay steps
- `recordStep(step)`：工具执行时写入（`cloneForCache`）
- `endRecording()` / `discardRecording()`：由 V3 在执行成功/失败后收尾

#### 3.3 replay

- `tryReplay(context)`：
  - 读取 `agent-${cacheKey}.json`
  - 使用 `V3Context.awaitActivePage()` + `ActHandler.takeDeterministicAction()` 回放 steps
  - 如 steps 发生变化（selector 自愈等）：更新 cache entry
  - 返回的 `AgentResult` 会补上 `usage=0` 并在 metadata 标记 `cacheHit/cacheTimestamp`

#### 3.4 streaming cache hit

- `tryReplayAsStream(context)`：把缓存结果包装成“伪 stream”
- `wrapStreamForCaching(context, streamResult, beginRecording, endRecording, discardRecording)`：对真实 streaming 结果加缓存落盘逻辑

#### 3.5 安全与体积控制

- `sanitizeModelOptionsForCache()`：会过滤 `apikey/api_key/api-key` 等敏感字段
- `pruneAgentResult()`：对 screenshot action 删除 base64 字段，避免 cache 文件过大
