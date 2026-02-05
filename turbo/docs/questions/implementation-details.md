# 实现细节疑问清单

本文档记录系统设计文档中需要进一步澄清的不明确实现细节。

> **MVP 范围说明**：本项目为 MVP 实现，不考虑账号/权限体系、多租户、企业级安全加固等。

最后更新：2026-02-05

---

## 目录

- [一、Snapshot 同步与状态管理](#一-snapshot-同步与状态管理)
- [二、LLM Gateway 与工具调用](#二-llm-gateway-与工具调用)
- [三、Action 执行与并发控制](#三-action-执行与并发控制)
- [四、Artifact 与文件管理](#四-artifact-与文件管理)
- [五、协议兼容与版本演进](#五-协议兼容与版本演进)
- [六、错误处理与边界条件](#六-错误处理与边界条件)
- [七、集成与部署](#七-集成与部署)

---

## 一、Snapshot 同步与状态管理

### 1.1 Snapshot API 缓存策略

**位置**: [contracts.md:142-161](../system-design/contracts.md#L142-L161)

**问题**:
```http
GET /api/snapshot  # 首屏拉取 Snapshot
```

**疑问点**:
- [ ] 快照更新频率（轮询？事件驱动？）
- [ ] 与 Socket 实时同步的数据一致性保证
- [ ] 快照"过期"的判定标准

---

### 1.2 Snapshot 消费去抖策略

**位置**: [code-structure.md:227](../system-design/code-structure.md#L227)

**问题**:
> 用 `lastUpdated` 去抖/覆盖 Snapshot store

**疑问点**:
- [ ] 去抖时长阈值是多少？
- [ ] 增量合并 vs 全量覆盖的选择条件
- [ ] WebSocket 断开重连后的状态恢复策略

---

## 二、LLM Gateway 与工具调用

> **说明**：工具调用统一通过 ai-gateway，本层仅关注与 ai-gateway 的对接接口。

### 2.1 与 ai-gateway 对接接口

**位置**: [agent-runtime.md:226-251](../system-design/agent-runtime.md#L226-L251)

**问题**:
```typescript
export type LlmToolCall = {
  type: "tool_call";
  toolCallId: string;
  name: string;
  arguments: unknown;  // ← 类型不明确
};
```

**疑问点**:
- [ ] ai-gateway 的工具调用结果格式规范
- [ ] ai-gateway 的错误格式与重试策略
- [ ] 工具调用超时时长配置

---

### 2.2 页面准备动作阈值

**位置**: [agent-runtime.md:177-187](../system-design/agent-runtime.md#L177-L187)

**问题**:
> readability 文本通常不大，可直接内联；若超过阈值（如 256KB）再写入 artifact

**疑问点**:
- [ ] 256KB 阈值的依据是什么？
- [ ] 超过阈值时 Web 如何触发 artifact 下载？
- [ ] 边界情况（恰好 256KB）的处理
- [ ] 大文本的内存压力考虑

---

### 2.3 错误分类与处理

**位置**: [agent-runtime.md:251](../system-design/agent-runtime.md#L251)

**问题**:
> 任何不可恢复错误 → structuredOutput + task.status=error

**疑问点**:
- [ ] "可恢复"与"不可恢复"的判定标准
- [ ] 错误分类与错误码规范
- [ ] 部分成功场景的定义与处理

---

## 三、Action 执行与并发控制

### 3.1 Action 超时参数

**位置**: [contracts.md:505-522](../system-design/contracts.md#L505-L522)

**问题**:
- **Ack 超时** `T_ack`：建议 1–2s
- **执行超时** `T_exec`：建议 30–120s

**疑问点**:
- [ ] 不同 action 类型的默认 `T_exec` 值
  - [ ] `browser_screenshot`: ?
  - [ ] `browser_readability_extract`: ?
  - [ ] `browser_click`: ?
  - [ ] `browser_type`: ?
- [ ] 串行执行时的死锁检测与恢复
- [ ] 超时后插件状态清理策略

---

### 3.2 页面准备失败处理

**位置**: [agent-runtime.md:70-75](../system-design/agent-runtime.md#L70-L75)

**问题**:
> 页面准备是强约束：必须先得到 screenshot + readability（或明确失败原因）

**疑问点**:
- [ ] screenshot/readability 失败时的行为
  - [ ] 重试？
  - [ ] 报错终止？
  - [ ] 跳过该步骤？
- [ ] 重试次数上限与退避策略
- [ ] "明确失败原因"的具体格式

---

### 3.3 CDP 降级策略

**位置**: [agent-runtime.md:199-201](../system-design/agent-runtime.md#L199-L201)

**问题**:
> 默认 `strategy=cdp_mouse`，通过 CDP 注入 Input.dispatchMouseEvent

**疑问点**:
- [ ] CDP 连接断开时的降级策略
- [ ] 不支持 CDP 的浏览器版本的回退方案
- [ ] CDP 权限不足时的错误处理

---

## 四、Artifact 与文件管理

### 4.1 Artifact 过期与清理

**位置**: [contracts.md:256-283](../system-design/contracts.md#L256-L283)

**问题**:
```json
{
  "expiresAt": 1730000060000  // ← 推荐时长？
}
```

**疑问点**:
- [ ] 推荐的过期时长（1小时？24小时？）
- [ ] 过期 artifact 的清理策略
  - [ ] 定时任务？
  - [ ] 访问时检查？
  - [ ] LRU 淘汰？
- [ ] 清理失败的容错机制

---

### 4.2 本地开发环境上传

**位置**: [README.md:52](../system-design/README.md#L52)

**问题**:
> 推荐使用 presigned URL 或 HTTP 上传；本地开发可实现成指向 Server 自身的 uploadUrl

**疑问点**:
- [x] 本地开发通过 Server 转存文件（不使用 S3）
- [ ] Server 转存时的存储位置（如 `/tmp/uploads/` 或 `./uploads/`）
- [ ] 上传文件的清理策略（定时任务？LRU？）
- [ ] 文件大小限制与超时配置

---

## 五、协议兼容与版本演进

### 5.1 旧事件名兼容层

**位置**: [code-structure.md:18-25](../system-design/code-structure.md#L18-L25)

**问题**:
| 旧事件名 | 新事件名 |
|---|---|
| `message` | `frontend_message` + `frontend_event` |
| `my_browser_extension_message` | `plugin_message` |
| `twin_state_sync` | `frontend_event` 内的 `snapshotSync` |

**疑问点**:
- [x] MVP 不需要兼容旧事件名
- [x] 新协议优先（若同时收到新旧事件，优先处理新协议）

---

### 5.2 字段命名别名

**位置**: [contracts.md:11-14](../system-design/contracts.md#L11-L14)

**问题**:
> 为兼容旧扩展/旧前端，允许少量 `snake_case` 别名（例如 `screenshot_presigned_url`）

**疑问点**:
- [x] MVP 不需要字段别名，统一用 camelCase
- [x] 新字段优先（若同时存在新旧字段，优先使用 camelCase）

---

## 六、错误处理与边界条件

### 6.1 HTTP 错误码枚举

**位置**: [contracts.md:24-46](../system-design/contracts.md#L24-L46)

**问题**:
```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",  // ← 完整列表？
    "message": "...",
    "details": {}
  }
}
```

**疑问点**:
- [ ] 完整的错误码列表
- [ ] 每种错误码对应的 HTTP 状态码
- [ ] `details` 字段的格式规范

---

### 6.2 部分成功场景

**位置**: [agent-runtime.md:72-74](../system-design/agent-runtime.md#L72-L74)

**问题**:
> 每个 action 都必须可观测：要么收到 ack+result，要么超时进入 error

**疑问点**:
- [ ] 部分成功场景如何处理？
  - [ ] 例如：screenshot 成功但 readability 失败
  - [ ] 例如：click 成功但页面导航超时
- [ ] 复合 action 的原子性保证

---

### 6.3 幂等创建任务

**位置**: [README.md:138-139](../system-design/README.md#L138-L139)

**问题**:
> 收到第一条 `user_message` 时若任务不存在应自动创建

**疑问点**:
- [ ] MVP 无权限系统，`taskId` 冲突时的处理策略
- [ ] 本地存储 taskId 持久化机制

---

## 七、集成与部署

### 7.1 HTTP + Socket 同端口实现

**位置**: [README.md:58-64](../system-design/README.md#L58-L64)

**问题**:
- Server（HTTP + Socket）：`http://localhost:6006`
- Socket.IO namespace：`/mimo`

**疑问点**:
- [ ] 在 Nitro/Node 中如何实现 Socket.IO 与 HTTP 共用端口？
- [ ] Web 通过 Next rewrite 代理时的配置示例
- [ ] 生产环境的反向代理配置（Nginx？）

---

### 7.2 跨 Repo 协议共享

**位置**: [code-structure.md:232-241](../system-design/code-structure.md#L232-L241)

**问题**:
> 若插件代码不放进 Turbo：仍建议复用 `packages/mimo-protocol`（通过私有 npm package 或 git submodule）

**疑问点**:
- [ ] 私有 npm package vs git submodule 的优劣对比
- [ ] CI/CD 中的版本同步策略
- [ ] 变更发布的流程与规范

---

### 7.3 Task 专用 Tab 识别

**位置**: [agent-runtime.md:213-216](../system-design/agent-runtime.md#L213-L216)

**问题**:
> Task 动作只能在 task 专用 tab 上执行

**疑问点**:
- [ ] 如何识别"task 专用 tab"？
  - [ ] 特殊标记？
  - [ ] URL 白名单？
  - [ ] tab 元数据？
- [ ] 误在非 task tab 执行的防护措施
- [ ] Tab 被用户关闭时的状态迁移

---

## 优先级建议

| 优先级 | 问题 | 影响范围 |
|--------|------|----------|
| P0 | clientId 生成与防冲突 | 插件识别 |
| P0 | 与 ai-gateway 对接接口 | LLM 集成 |
| P1 | Action 超时与重试参数 | 用户体验 |
| P1 | Snapshot 同步一致性保证 | UI 正确性 |
| P1 | 页面准备失败处理 | 任务可靠性 |
| P2 | Artifact 清理策略 | 资源管理 |
| P2 | 部分成功场景处理 | 边界情况 |
| P3 | 协议兼容层（建议 MVP 不考虑） | 技术债务 |
| P3 | HTTP+Socket 同端口实现细节 | 部署配置 |

---

## MVP 简化建议

以下内容在 MVP 阶段建议简化或暂不实现：

| 原设计问题 | MVP 建议 |
|-----------|----------|
| Socket 鉴权（token） | MVP 暂不实现，仅依赖 `clientId` 识别 |
| 用户接管状态（takeover） | 已纳入状态机（MVP 可先不开启 UI） |
| LLM 跨 provider 统一 | 统一通过 ai-gateway |
| 文件存储（S3/presign） | MVP 本地开发通过 Server 转存 |
| 协议版本化（`X-Mimo-Protocol`） | MVP 暂不需要 |
| 旧事件名/字段别名兼容 | MVP 不考虑，使用新协议 |
| 权限校验 | MVP 无多用户，跳过 |
| 本地 bridge 安全白名单 | MVP 本地开发，`localhost` 即可 |

---

## 文件存储方案（MVP）

本地开发环境文件上传流程：

```
插件 → multipart/form-data → Server (/api/artifacts/upload)
                                  ↓
                            存储到本地文件系统
                            (如 ./uploads/artifacts/)
                                  ↓
                            返回 downloadUrl
```

**生产环境可扩展**：
- 切换到 S3/OSS + presigned URL
- Server 仅生成 presigned URL，不处理文件流
