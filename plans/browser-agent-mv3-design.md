## 浏览器插件形态的浏览器 Agent（MV3）设计计划

> 状态：设计文档（不执行实现）
> 
> 目标场景：**后端编排（Nitro）+ 插件执行（Chrome MV3）**，支持**高风险操作**的二次确认、审计与回放。

---

## 1. 背景与现状（基于当前仓库）

当前仓库核心能力是「知识/技能索引与检索」：启动时构建 skills 索引（Orama + 中文 tokenizer/stopwords），并提供 `/api/skills/search` 检索 API，以及一个简单的页面用于快速搜索。

这对浏览器 Agent 的价值是：可以作为 **检索工具**，在 Agent 规划/纠错时召回操作规范、策略、站点流程等（以 `SKILL.md` 形式沉淀）。

---

## 2. MVP 目标与非目标

### 2.1 MVP 目标
- **后端 Nitro 作为编排器**：支持多步任务（Observe→Plan→Act→Verify 循环）、失败重试、暂停等待用户确认。
- **浏览器插件（MV3）作为执行端**：提供受控工具（读页面信息、点击、输入、滚动、等待、提取字段、截图、导航）。
- **高风险操作可控**：对提交/发送/支付/删除/权限变更等动作强制二次确认（Human-in-the-loop）。
- **审计与可回放**：记录每一步动作、参数、页面证据（截图/关键字段/URL/时间），可导出。
- **LLM 在服务端**：模型 key 与调用逻辑只在 Nitro 侧。
- **认证先走本地单用户**：extension 与后端通过本地共享 secret 鉴权（MVP）。

### 2.2 非目标（MVP 不做）
- 多用户账号体系/OAuth
- 云端托管与分发
- 跨浏览器（Firefox/Safari）兼容
- 复杂的反自动化/验证码绕过

---

## 3. 总体架构

### 3.1 组件
- **Nitro（服务端）**：
  - Agent 编排（状态机、策略、LLM 调用、工具调用协议）
  - Skills 检索（复用现有 `/api/skills/search`）
  - 审计落盘与任务回放数据
  - 本地控制台（页面/UI，可选但建议）

- **Chrome Extension（MV3）**：
  - **Service Worker（background）**：与后端通信、调度任务、转发指令给 content script
  - **Content Script**：执行 DOM 相关操作（点击/输入/提取/观察）
  - **UI（side panel / popup）**：展示任务状态、待确认动作、允许用户授权域名与确认高风险动作

### 3.2 数据流（高层）
1) 用户在插件 UI 或本地控制台发起任务（自然语言目标）
2) Nitro 编排器生成下一步结构化 Action（JSON），并标注风险等级/是否需确认
3) 插件执行端校验 Action schema + 权限策略
4) content script 在页面执行，回传 Observation（结构化结果 + 证据引用）
5) Nitro 写审计事件，进入下一轮（直到完成/失败/等待确认）

---

## 4. MV3 关键约束与纠偏（本方案需要特别明确）

> 这一节用于修正「对 MV3 理解不清楚」的部分，避免在实现阶段踩坑。

### 4.1 Service Worker（background）不是常驻进程
- MV3 background 是 **service worker**，会被浏览器按需挂起/回收。
- 结论：
  - **不能依赖常驻内存状态**（必须持久化到 `chrome.storage` 或后端）。
  - **长时间 WebSocket 连接不可靠**（可能因 SW 终止而断）。
  - 任何“长任务”必须假设会被中断：需要**幂等 actionId**、可重试、可恢复。

#### 4.1.1 通信模型选型（轮询 vs Offscreen Document）

| 维度 | 轮询/短请求（MVP 推荐） | Offscreen Document（进阶） |
|---|---|---|
| **实现复杂度** | 低：纯 `fetch` + `chrome.alarms` 或用户点击触发 | 高：需要管理 offscreen 生命周期与消息转发 |
| **可靠性** | 高：SW 被回收也无影响（下次继续拉取） | 中：offscreen 能更常驻，但仍需处理异常与权限 |
| **实时性** | 一般（取决于轮询间隔） | 好（可承载长连接/更及时） |
| **资源消耗** | 可控（间隔越短消耗越高） | 相对更高（更接近常驻） |
| **调试难度** | 低 | 中-高 |
| **适合阶段** | MVP/早期试错 | 产品化/需要更强实时性时 |

**推荐结论（本设计 MVP）：**
- 采用 **轮询/短请求**。
- 触发机制优先：用户在 UI 点击“继续/执行下一步”（强控、利于高风险场景）。
- 可选增强：`chrome.alarms` 每 N 秒拉取一次任务状态，但对“高风险待确认”必须以用户交互为准。

#### 4.1.2 轮询协议建议（避免重复执行）
- 后端下发 action 必须带 `actionId`（幂等键）与 `taskId`。
- 插件执行后用 `POST /api/agent/report` 回传 `actionId` 与结果。
- 后端必须做到：
  - 同一 `actionId` 的 report 重复到达时可安全去重。
  - 插件重复拉取 `next` 时，不会生成“相同语义但不同 actionId”的新动作（除非显式重试）。

### 4.2 DOM 操作必须在 Content Script（或注入脚本）中完成
- SW 无法直接访问页面 DOM。
- 点击/输入/读取页面文本/定位元素都应在 **content script** 执行。
- 跨 frame（iframe）与 Shadow DOM 需要单独策略（MVP 可先不覆盖）。

### 4.3 权限模型：host permissions / optional host permissions / activeTab
- MV3 中对网页的访问依赖权限：
  - `host_permissions`：安装即授权（风险高，不建议全量）。
  - `optional_host_permissions` + `permissions.request()`：运行时向用户申请指定域名（符合最小权限）。
  - `activeTab`：对当前激活 tab 临时授权（常用于用户触发后的注入）。

**MVP 建议：**
- 默认不声明全域 `host_permissions`。
- 采用 `optional_host_permissions` + UI 引导用户对特定域名授权。

#### 4.3.1 推荐的授权交互流程（高风险场景更安全）
- 插件 UI 展示当前域名与所需权限（例如 `https://example.com/*`）。
- 用户点击“授权此站点”后调用 `chrome.permissions.request({ origins: [...] })`。
- 只有在权限已授予时，才允许执行 `click/type/extract` 等动作。
- 对高风险动作：即使已有站点权限，也仍然走二次确认（见第 6 节）。

#### 4.3.2 注入时机与 activeTab
- 如果希望在“用户显式触发”后临时注入脚本，可以结合 `activeTab`：
  - 适用于只在当前页面执行一次的读/写操作。
  - 不适合需要跨页面、跨域名长期运行的任务（仍需 optional host permissions）。

### 4.4 截图能力的正确位置
- 截图通常使用 `chrome.tabs.captureVisibleTab`（在 extension 上下文调用），不是 content script。
- 需要相应权限/上下文（常见组合：`activeTab` + 当前 tab）。

#### 4.4.1 截图与证据采集的最小实现建议
- content script 负责“告诉后端/插件 UI：当前需要证据”（例如在高风险动作前后各截一次）。
- background/service worker 负责实际调用 `chrome.tabs.captureVisibleTab` 获取截图数据。
- 截图应关联 `taskId` + `actionId` + 时间戳，便于审计与回放。

### 4.5 文件落盘与证据存储
- extension 侧写文件不便（沙箱限制）。
- **MVP 推荐：证据上传到后端**（截图 base64 或 blob 上传），由 Nitro 落盘（例如 `./.data/audit/` 或其它可配置目录）。

#### 4.5.1 证据上传策略（减少泄露与体积）
- 优先上传：截图（before/after）、结构化提取字段、URL/title。
- 谨慎上传：HTML snapshot、全量 DOM、全量可见文本（容易包含隐私/敏感信息）。
- 默认脱敏：密码输入框、token/cookie/localStorage、邮箱/手机号等可配置过滤。

---

## 5. 工具调用协议（Action/Observation）

> 目标：让 LLM 只产出“结构化动作”，插件严格校验与执行；并在 MV3 可能中断/重试的前提下保证可恢复。

### 5.1 Action（Nitro → 插件）
最小字段：
- `taskId`: string（任务标识）
- `actionId`: string（幂等与审计）
- `type`: `click | type | scroll | waitFor | extract | screenshot | navigate | ...`
- `target`: `{ by: 'selector' | 'text' | 'role'; value: string }`（优先可见文本/role，selector 作为 fallback）
- `params`: object（如输入文本、等待超时、滚动距离等）
- `risk`: `low | medium | high`
- `requiresConfirmation`: boolean（由服务端 policy 判定，high 默认 true）

#### 5.1.1 幂等与重试约束（强烈建议写进协议）
- `actionId` 必须可重复执行或可检测“已执行”：
  - 例如 `click` 在某些页面可能是不可逆的，因此对 high 风险必须走确认。
  - 对 low/medium，允许“可重复点击但不重复提交”的策略（例如点击展开/打开菜单等）。
- 后端应在审计中记录 action 的执行状态：`pending | running | done | failed | canceled`。

#### 5.1.2 并发与锁
- 同一 `taskId` 同一时间只允许一个 `actionId` 处于执行中（避免 SW 多次触发导致并发）。
- 插件侧也应维护“执行锁”，避免重复消费同一 action。

### 5.2 Observation（插件 → Nitro）
- `taskId`
- `actionId`
- `url`, `title`
- `visibleTextSnippet`（截断）
- `domSummary`（可选，避免泄露隐私）
- `extracted`: object（结构化字段）
- `artifacts`: `{ screenshots?: string[]; htmlSnapshot?: string; }`（建议以引用/上传结果为主）
- `errors`: `{ code: string; message: string; }[]`

#### 5.2.1 错误码建议（便于自动恢复）
- `PERMISSION_DENIED`：未授权域名/无权限
- `TARGET_NOT_FOUND`：元素未找到
- `TARGET_NOT_INTERACTABLE`：元素不可点击/被遮挡/不可见
- `NAVIGATION_IN_PROGRESS`：页面跳转中
- `TIMEOUT`：等待超时
- `CONFIRMATION_REQUIRED`：需要用户确认但未确认

---

## 6. 高风险动作策略（Policy & Human-in-the-loop）

### 6.1 风险分类（建议）
- **high（默认必须确认）**：提交表单、发送消息/邮件、支付/下单、删除/批量删除、权限/设置变更、发布内容、任何不可逆操作
- medium：可能造成状态变化但可撤销（例如切换开关、加入购物车）
- low：纯读取/导航/滚动/搜索/展开折叠

### 6.2 确认闭环
- Nitro 下发 `requiresConfirmation=true` 的 action 时：
  - 插件 UI 展示「将要执行的动作 + 风险原因 + 目标页面信息 + 证据」
  - 用户点击确认后，插件调用后端 `/api/agent/confirm`（携带 actionId）
  - Nitro 继续下发下一步

---

## 7. 审计与回放

### 7.1 审计事件（建议 JSONL）
每步写一条：
- timestamp
- taskId
- action（type/target/params/risk）
- observation（url/title/extracted/errors）
- artifacts 引用（截图文件名/URL）
- confirmation（是否需要、是否确认、确认时间）

### 7.2 回放
- 以审计事件序列为基础，提供：
  - 任务复盘页面（按步骤展示）
  - 导出（JSONL/zip 截图）

---

## 8. 后端 API（建议，MVP 形态）

> 设计原则：接口语义要“可重试、可幂等、可审计”。高风险动作必须可暂停并等待确认。

- `POST /api/agent/start`：创建任务（goal、初始 tab/url 可选）
  - 返回：`taskId`、初始状态、可选 `nextAction`（如果立即产生）
- `POST /api/agent/next`：获取下一步 action（或推进一步）
  - 输入：`taskId`、可选 `sinceActionId`（用于避免重复下发）
  - 返回：`action | null`（null 表示等待用户/等待页面/已完成）
- `POST /api/agent/report`：提交 observation
  - 输入：`taskId`、`actionId`、`observation`
  - 要求：对同一 `actionId` 重复 report 必须去重
- `POST /api/agent/confirm`：确认高风险 action
  - 输入：`taskId`、`actionId`、`approved=true/false`、可选 `reason`
- `POST /api/agent/cancel`：取消任务
- `GET  /api/agent/status?taskId=`：查询状态

#### 8.1 任务状态（建议）
- `RUNNING`：可继续执行
- `WAITING_CONFIRMATION`：等待用户确认
- `WAITING_PAGE`：等待页面达到条件（可由插件持续上报或用户触发下一步）
- `SUCCEEDED` / `FAILED` / `CANCELED`

#### 8.2 本地单用户鉴权（MVP）
- 插件每次请求带 `Authorization: Bearer <shared-secret>`（或自定义 header）。
- 后端仅监听 `localhost`（或仅在开发环境启用）。
- 审计事件中记录请求来源（extension id / 浏览器信息）以便排查。

---

## 9. 与现有 skills 索引的集成方式

- 编排器在规划阶段调用 `/api/skills/search?q=...`，将命中的 `SKILL.md` 摘要作为上下文约束：
  - allowed-tools/最小权限
  - 常见站点操作 SOP
  - 风险识别规则

---

## 10. 里程碑（仅设计，不执行）

1) 协议与策略：Action/Observation schema + 风险 policy + 审计事件格式
2) 插件最小闭环：可在当前 tab 执行 click/type/waitFor/extract，并回传结果
3) 编排器最小闭环：能在后端生成下一步 action，并接收 observation 推进状态机
4) 高风险确认：确认 UI + confirm API + 审计记录
5) 端到端 demo：挑一个包含高风险确认的流程跑通并可回放

---

## 11. 未决问题（需要在实现前定稿）

- 通信模型最终选型：轮询（MVP） vs Offscreen Document 常驻连接（见 4.1.1）
- 证据采集边界：截图频率、是否采集 HTML snapshot、脱敏规则（PII/密码/token）（见 4.5.1）
- 选择器策略：文本定位优先还是 selector 优先；如何做 fallback 与自愈
- 多 tab / 多窗口支持：MVP 只支持单 tab 还是支持任务内切换
- 高风险动作的“强制确认”名单是否需要可配置（不同业务场景差异巨大）
- 是否需要引入 Offscreen Document 来支撑更强实时性（产品化阶段再评估）

#### 11.1 建议的 MVP 默认决策（降低风险）
- 通信：轮询 + 用户点击推进
- 权限：optional host permissions 按域名授权
- 证据：截图为主，默认不采集 HTML snapshot
- 安全：高风险动作一律确认；失败时宁可停在 WAITING_CONFIRMATION/WAIING_PAGE，也不要“猜测性提交”

---

## 12. 结语

本设计把现有仓库的优势（skills/知识检索）作为 Agent 的“可检索操作规范库”，并在 MV3 的真实约束下给出可落地的插件执行端结构。后续如要进入实现阶段，建议先从“轮询式 MVP + 强制二次确认 + 审计落盘”开始，避免被 MV3 常驻连接/复杂权限拖慢。