## 05 高风险策略与二次确认闭环

### 1) 风险分级
- **high（必须确认）**：提交表单、发送消息/邮件、支付/下单、删除/批量删除、权限/设置变更、发布内容、任何不可逆操作。
- **medium**：可能改变状态但可撤销（加入购物车、切换开关等）。
- **low**：纯读取/导航/滚动/搜索/展开折叠。

---

### 2) policy 的职责边界
- 服务端 policy 负责：
  - 基于 action.type + 目标页面上下文 + params 判断 `risk` 与 `requiresConfirmation`。
  - 生成“风险原因说明”（给 UI 展示）。
- 插件侧 policy 负责：
  - 最小权限校验（未授权域名直接拒绝）。
  - 若服务端标记 high 但 UI/用户未确认：必须拒绝执行并上报 `CONFIRMATION_REQUIRED`。

---

### 3) 二次确认的 UX/证据要求
确认面板至少展示：
- 将要执行的 action（类型、目标、关键参数）
- 当前页面（URL、标题）
- 风险原因（例如“提交表单可能产生不可逆影响”）
- 证据（建议：确认前截图 + extracted 关键字段）

---

### 4) confirm API 行为（建议）
- `POST /api/agent/confirm`：`{ taskId, actionId, approved, reason? }`
- approved=false 视为：
  - 任务进入 `CANCELED` 或 `WAITING_CONFIRMATION`（看产品策略）
  - 必须写审计（用户拒绝的原因与时间）

---

### 5) 可配置性（后续）
不同业务对 high/medium 的界线不同，建议最终支持：
- 可配置的 high 动作白名单/黑名单
- 按域名/业务线覆盖默认策略
