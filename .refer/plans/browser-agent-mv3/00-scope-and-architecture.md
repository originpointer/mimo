## 00 范围与架构

### 目标
构建一个“浏览器插件形态”的浏览器 Agent：
- **后端（Nitro）负责编排**：多步任务循环、LLM 调用、策略/风控、状态机、审计落盘。
- **插件（Chrome MV3）负责执行**：在网页中执行受控工具（读/点/填/等/提取/截图/导航）。
- 覆盖 **高风险操作**：强制二次确认（Human-in-the-loop）并形成可回放证据链。

### 非目标（MVP 不做）
- 多用户 OAuth/账号体系
- 云端托管与对外分发
- 验证码绕过/反爬攻防
- 全站点通用自动化（MVP 只要求在目标站点/少量站点可用）

---

### 组件划分

- **Nitro（Server Orchestrator）**
  - 任务创建/状态机（RUNNING/WAITING_CONFIRMATION/...）
  - LLM 调用（结构化输出 -> Action）
  - 风险策略（哪些动作必须确认）
  - 审计事件与证据存储（JSONL + 截图文件）
  - Skills 检索工具（复用 `/api/skills/search`）

- **Chrome Extension（MV3 Executor）**
  - Service Worker（background）：与后端通信、调度、截图、转发指令
  - Content Script：DOM 观察与动作执行
  - UI（side panel/popup）：任务面板、域名授权、二次确认入口

---

### 关键设计原则

- **结构化动作**：LLM 只能产出 JSON（Action），插件只执行白名单工具。
- **幂等与可恢复**：MV3 可能中断/重试，所有步骤必须可安全重放或可检测已执行。
- **最小权限**：按域名授权；默认不全域 host 权限。
- **高风险强控**：不做“猜测性提交”，宁可停在 WAITING_CONFIRMATION。
- **可审计可回放**：每一步都能解释“做了什么、为什么、证据是什么”。

---

### 数据流（高层）

1) 用户输入目标（插件 UI 或本地控制台）
2) Nitro 生成下一步 Action（含风险标注与确认要求）
3) 插件校验 + 执行，回传 Observation 与证据
4) Nitro 写审计并推进状态机
5) 遇到高风险动作：进入 WAITING_CONFIRMATION，等待用户确认后继续
