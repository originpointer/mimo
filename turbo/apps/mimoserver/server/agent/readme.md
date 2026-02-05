## Agent / Intent 拆解

这里的 `analyzeIntent()` 负责把用户输入拆解成：

- `isBrowserRequired: boolean`：是否必须启用浏览器/插件能力
- `url: string | null`：明确目标 URL（没有则为 `null`，表示沿用当前页或无需跳转）

入口实现：`turbo/apps/mimoserver/server/agent/llm-gateway.ts`。

## 问题背景：为什么会“所有任务都需要浏览器”

之前的实现会让 AI **几乎总返回需要浏览器**，主要原因是：

1) **读取了错误的字段导致结果恒为空**
   - AI SDK v6 的 `generateText()` 返回 `toolCalls[].input`
   - 旧代码读取 `toolCalls[0].args`，因此拿不到结果，触发兜底逻辑

2) **兜底逻辑过于激进**
   - 当解析失败 / 没拿到 tool call / 甚至没配置 key 时，默认返回 `isBrowserRequired: true`
   - 这会让编排器（`orchestrator.ts`）走浏览器准备流程，表现为“什么都要开网页”

3) **上下文没有正确注入**
   - system prompt 里写了 `\${context.xxx}`（被转义），导致 LLM 实际看不到 `status/currentUrl`

## 解决方案（当前实现）

### 1) 修复 tool call 解析

- 改为读取 `toolCalls[0].input`（并用 Zod 校验结构）
- 校验失败时返回保守结果：`{ isBrowserRequired: false, url: null }`

### 2) 本地启发式优先（减少误判 + 省 token）

在调用意图模型前，先用轻量规则快速判断：

- **显式 URL** → `isBrowserRequired=true`，`url=<该 URL>`
- **搜索请求（例如“搜/搜索 …”）** → `isBrowserRequired=true`，`url=https://www.google.com/search?q=...`
- **浏览器/网页关键词**（“网页/网站/link/tab/地址栏”等）→ `isBrowserRequired=true`
- **继续当前页面操作**（“滚动/点击/下一页/返回”等）且 `context.currentUrl` 存在 → `isBrowserRequired=true`
- **明显非浏览器任务**（代码/报错/翻译/总结/计算等）→ `isBrowserRequired=false`
- **显式否定**（“不需要/不用浏览器/不要上网”等）→ `isBrowserRequired=false`

启发式无法确定时，才交给 LLM 做最终判定。

### 3) 更安全的失败策略（fail-closed）

任意异常（没 key、模型失败、解析失败）都默认：

- `isBrowserRequired=false`
- `url=null`

这样“意图识别挂了”不会把系统强行推到插件/浏览器路径。

### 4) 修复上下文注入 + 收紧提示词

system prompt 改为实际插入 `${context.status}` / `${context.currentUrl}`，并明确：

- **默认返回 FALSE**
- 仅在“确实需要浏览器”时返回 TRUE（打开网站/搜索/网页交互/延续浏览会话）

## 快速验证用例

- `“帮我写一个 TS 函数实现防抖”` → `isBrowserRequired=false`
- `“搜索一下 mimo ai gateway”` → `isBrowserRequired=true` + Google 搜索 URL
- `“打开 https://example.com”` → `isBrowserRequired=true` + 该 URL
- 已有 `currentUrl` 时：`“往下滚动一点”` → `isBrowserRequired=true`（延续会话）
