## 08 插件组件拆分（SW/CS/UI）

### 1) Service Worker（background）职责
- 与后端通信：start/next/report/confirm/status
- 调度：避免并发、做执行锁
- 截图：调用 `chrome.tabs.captureVisibleTab` 并上传服务端
- 消息路由：UI ↔ CS ↔ Server 的中转

不应做：
- 依赖常驻内存状态
- DOM 读写

---

### 2) Content Script 职责
- 观察页面：URL/title、可见文本片段、目标元素状态
- 执行动作：click/type/scroll/waitFor/extract
- 产出 observation（结构化）
- 触发证据采集请求（例如 high 风险 before/after）

不应做：
- 直接与 LLM 对话
- 存储大量敏感数据

---

### 3) UI（side panel / popup）职责
- 展示任务状态、最近步骤、错误
- 引导域名授权（optional host permissions）
- 高风险二次确认（approve/deny）
- 用户驱动推进（Continue）

---

### 4) 推荐的消息通道
- UI ↔ SW：`chrome.runtime.sendMessage` / ports
- SW ↔ CS：`chrome.tabs.sendMessage`
- SW ↔ Server：`fetch`

---

### 5) 最小权限建议
- UI 驱动授权，执行前检查已授权 origins。
- 若未授权：直接拒绝执行并提示用户授权。
