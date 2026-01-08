## 09 MVP 落地检查清单（仅设计）

### 通信与可靠性
- [ ] `taskId/actionId` 全链路携带
- [ ] `next` 重试不产生语义重复 action
- [ ] `report` 重复上报可去重
- [ ] 单任务单 action 执行锁（server+extension）

### MV3 约束
- [ ] 不依赖 SW 常驻
- [ ] DOM 操作仅在 content script
- [ ] 截图仅在扩展上下文（SW）执行

### 权限与安全
- [ ] 默认无全域 host 权限
- [ ] optional host permissions + UI 授权流程
- [ ] 高风险动作强制二次确认
- [ ] 脱敏/上传白名单策略

### 协议与校验
- [ ] Action/Observation schema 校验（两端都做）
- [ ] 工具白名单（click/type/...）
- [ ] 错误码规范与恢复策略映射

### 审计与回放
- [ ] JSONL 审计事件（每步一条）
- [ ] 截图/证据与 actionId 绑定
- [ ] 回放页面/导出包定义

### 与 skills 的集成
- [ ] 编排器在规划阶段调用 `/api/skills/search`
- [ ] 将命中的规范（最小权限/风控/流程）注入提示上下文
