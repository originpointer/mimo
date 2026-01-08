## 06 证据采集、审计与回放

### 1) 为什么必须做证据链
高风险场景下，必须能回答：
- 做了什么（Action）
- 为什么这么做（notes/policy reason）
- 在哪做的（URL/title）
- 结果是什么（Observation）
- 证据是什么（截图/字段）

---

### 2) 证据采集（Artifacts）

#### 推荐（MVP）
- 截图：高风险动作 **before/after** 各一张
- 提取字段：表单关键字段、订单金额、收件人等（结构化 extracted）

#### 谨慎（默认关闭）
- HTML snapshot / 全量 DOM / 全量可见文本：容易包含隐私与体积巨大

---

### 3) 审计事件格式（JSONL）
每步一条：
- `ts`
- `taskId`
- `action`: `{ actionId,type,target,params,risk,requiresConfirmation }`
- `policy`: `{ reason }`
- `page`: `{ url,title }`
- `observation`: `{ extracted, errors }`
- `artifacts`: `{ screenshots: [ref...] }`
- `confirmation`: `{ required, approved?, ts? }`

---

### 4) 存储建议
- 审计：`audit/<taskId>.jsonl`
- 证据：`audit/<taskId>/screenshots/<actionId>-before.png` 等

---

### 5) 回放与导出
- 本地回放页面（按步骤渲染 JSONL + 证据图片）
- 导出：打包 JSONL + screenshots 目录

---

### 6) 脱敏规则（强烈建议做成配置）
- 禁止上传：cookie/localStorage/token/密码字段
- PII（邮箱/手机号/地址）默认打码或只保留后四位
