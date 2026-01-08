## 07 后端 API 契约（MVP）

> 目标：接口语义必须“可重试、可幂等、可审计”。

---

### 1) `POST /api/agent/start`
- 输入：`{ goal: string, initialUrl?: string }`
- 输出：`{ taskId: string, status: string }`

---

### 2) `POST /api/agent/next`
- 输入：`{ taskId: string, sinceActionId?: string }`
- 输出：`{ action: Action | null, status: string }`

语义：
- `action=null` 表示：已完成/等待页面/等待确认/无可执行动作。
- 重复调用不得产生“语义重复但 actionId 不同”的动作（除非显式 retry）。

---

### 3) `POST /api/agent/report`
- 输入：`{ taskId: string, actionId: string, observation: Observation }`
- 输出：`{ ok: true }`

要求：
- 对同一 `actionId` 重复 report 必须去重。

---

### 4) `POST /api/agent/confirm`
- 输入：`{ taskId: string, actionId: string, approved: boolean, reason?: string }`
- 输出：`{ ok: true }`

---

### 5) `POST /api/agent/cancel`
- 输入：`{ taskId: string, reason?: string }`
- 输出：`{ ok: true }`

---

### 6) `GET /api/agent/status?taskId=`
- 输出：`{ taskId, status, lastActionId?, pendingConfirmation? }`

---

### 7) 本地单用户鉴权（MVP）
- 请求头：`Authorization: Bearer <shared-secret>`
- 后端建议仅开放 localhost（或开发环境启用）。

---

### 8) 错误返回约定
- 统一：`{ ok: false, error: string, code?: string }`
- 建议 code：`UNAUTHORIZED | INVALID_SCHEMA | TASK_NOT_FOUND | CONFLICT | ...`
