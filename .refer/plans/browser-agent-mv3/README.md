## Browser Agent（Chrome MV3）设计文档索引

> 本目录用于沉淀“浏览器插件形态的浏览器 Agent（MV3）”设计与约束，**仅设计不实现**。
> 
> 编排端：Nitro（服务端）；执行端：Chrome Extension（MV3）；目标：覆盖高风险操作并可控（强制二次确认 + 审计回放）。

---

### 阅读顺序（推荐）

1. [00-范围与架构](./00-scope-and-architecture.md)
2. [01-MV3 约束与生命周期](./01-mv3-basics-and-lifecycle.md)
3. [02-通信模型（轮询 vs Offscreen）与时序](./02-communication-model.md)
4. [03-权限与安全（最小权限 + 脱敏 + 风控边界）](./03-permissions-and-security.md)
5. [04-Action/Observation 协议（幂等、锁、错误码）](./04-action-observation-protocol.md)
6. [05-高风险策略与二次确认闭环](./05-risk-policy-and-confirmation.md)
7. [06-证据采集、审计与回放](./06-artifacts-audit-replay.md)
8. [07-后端 API 契约（MVP）](./07-backend-api-contract.md)
9. [08-插件组件拆分（SW/CS/UI）](./08-extension-components.md)
10. [09-MVP 落地检查清单](./09-implementation-checklist.md)
11. [术语表](./glossary.md)

---

### 与仓库现状的关系

- 本仓库已有 skills 检索 API（`/api/skills/search`），可作为 Agent 的“检索工具”。
- 本目录不包含任何代码实现；仅定义协议、约束与可验证的验收标准。

---

### 归档（单文件版本）

- 单文件历史版本：`/Users/sodaabe/codes/opensources/MetaGPT/mimo/plans/browser-agent-mv3-design.md`（已停止维护）
- 本目录（`plans/browser-agent-mv3/`）是当前**唯一维护入口**，请以这里为准。
