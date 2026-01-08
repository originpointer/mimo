## 04 Action/Observation 协议（幂等、锁、错误码）

> 目标：让 LLM 输出严格结构化动作；插件只执行白名单工具；并在 MV3 中断/重试下保持可恢复。

---

### 1) Action（Server → Extension）

必备字段：
- `taskId`: string
- `actionId`: string（幂等键）
- `type`: `click | type | scroll | waitFor | extract | screenshot | navigate | ...`
- `target`: `{ by: 'text' | 'role' | 'selector'; value: string }`
- `params`: object
- `risk`: `low | medium | high`
- `requiresConfirmation`: boolean

建议字段：
- `preconditions`: array（例如“页面必须包含某文本/URL 必须匹配某模式”）
- `timeoutMs`: number
- `notes`: string（用于 UI 展示“为什么这么做”）

---

### 2) Observation（Extension → Server）

必备字段：
- `taskId`
- `actionId`
- `url`, `title`
- `extracted`: object
- `errors`: `{ code: string; message: string }[]

建议字段：
- `visibleTextSnippet`: string（截断）
- `artifacts`: `{ screenshots?: string[]; }`（建议为“服务端返回的引用/路径”）

---

### 3) 幂等与重试规则（必须明确）
- 插件可能重复拿到同一个 action（轮询/重试/恢复）。
- 规则：
  - 同一 `actionId` 的执行结果应可重复上报；服务端必须去重。
  - 对 low/medium 动作：尽量设计为“可重复执行无副作用”。
  - 对 high 动作：必须确认；确认后执行仍应记录证据，且尽量避免“重复提交”。

---

### 4) 并发锁与顺序
- 同一 `taskId` 同时只能执行一个 action。
- 插件侧维护执行锁；服务端侧维护任务锁（避免并发 next/report）。

---

### 5) 错误码建议（用于恢复策略）
- `PERMISSION_DENIED`
- `TARGET_NOT_FOUND`
- `TARGET_NOT_INTERACTABLE`
- `NAVIGATION_IN_PROGRESS`
- `TIMEOUT`
- `CONFIRMATION_REQUIRED`

建议：错误码应触发服务端不同的恢复策略：重试、换定位方式、请求用户授权、进入等待确认等。
