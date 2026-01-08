## 01 MV3 约束与生命周期

> 目的：把 MV3 的“真实约束”写清楚，避免用 MV2/常驻进程思路误设计。

---

### 1) Service Worker（background）不是常驻
- MV3 background 是 **service worker**：会被浏览器按需挂起/回收。
- 结论：
  - **不能依赖内存常驻状态**（必须落地到后端或 `chrome.storage`）。
  - **长连接不可靠**（WebSocket/SSE 可能因 SW 终止而断）。
  - 任何长任务必须具备：**幂等 actionId + 可恢复状态机 + 可重试协议**。

---

### 2) DOM 操作必须由 Content Script 执行
- SW 无法直接访问页面 DOM。
- click/type/extract/waitFor 等都应在 **content script**（或注入脚本）执行。
- iframe / Shadow DOM 的覆盖成本高：MVP 可明确“不支持或有限支持”。

---

### 3) 截图能力与页面证据
- 截图通常由扩展上下文调用：`chrome.tabs.captureVisibleTab`。
- content script 负责“触发截图需求/提供上下文”；SW 执行截图并上传/返回引用。

---

### 4) 权限模型（与安全强相关）
- `host_permissions`：安装即授权，风险高。
- `optional_host_permissions`：运行时按域名申请授权（推荐）。
- `activeTab`：用户触发后对当前 tab 的临时授权（适合一次性操作）。

MVP 推荐：
- 默认不申请全域权限。
- 通过 UI 引导对目标域名授权后才允许执行自动化动作。

---

### 5) 存储与持久化
- 插件侧只能存少量状态（`chrome.storage`）。
- **任务真实状态**建议以服务端为准（taskId/actionId/审计事件）。
- 证据（截图）建议上传服务端落盘，避免插件侧文件写入限制。
