# 项目文件结构说明（逐模块/逐文件用途）

> 说明：本文按仓库当前结构整理（忽略 `node_modules/`、`audit/`、构建产物等运行时目录）。核心目标是让你能快速回答：
> - 代码入口在哪里？
> - 每个目录/文件负责什么？
> - 验证入口与对应实现在哪里？

---

## 顶层（repo root）

- `.gitignore`
  - Git 忽略规则。
  - 已包含 `audit/`（Phase9/10 证据链产物）、`node_modules/`、Nitro 构建产物等。
- `.env`
  - 本地环境变量（不应提交）。
- `README.md`
  - 项目入口说明（如何启动/验证/概览）。
- `package.json`
  - Node 项目依赖与脚本入口（如 `pnpm dev`、测试脚本等）。
- `pnpm-lock.yaml`
  - 依赖锁定文件。
- `tsconfig.json`
  - TypeScript 编译配置。
- `vitest.config.ts`
  - Vitest 测试配置。
- `nitro.config.ts`
  - Nitro（服务端）配置。
- `llms.txt`
  - 面向 LLM/工具链的项目描述入口（索引/提示用途）。

运行产物/本地缓存（不逐文件说明）：
- `node_modules/`：依赖安装产物。
- `audit/`：证据链产物（JSONL + screenshots），已移出版本控制。
- `.output/`、`.nitro/`、`dist/`：构建产物。
- `.pnpm-store/`：pnpm 本地缓存。
- `.logs/`：本地日志。

---

## `server/`（控制端服务：Nitro + h3 路由）

### `server/routes/`（所有 HTTP 路由）

命名约定：`*.get.ts` / `*.post.ts` 对应 GET/POST；`*.html.get.ts` 返回 HTML 测试页。

- `server/routes/index.ts`
  - 服务根入口路由（默认页/聚合入口）。
- `server/routes/skills.ts`
  - skills 相关路由入口（用于加载/展示技能索引）。
- `server/routes/.well-known/`
  - `.well-known/jwks.json.get.ts`（以目录内实际文件为准）
    - JWKS 公钥暴露（扩展验签用）。
- `server/routes/api/`
  - 对外 API（非 control 专用）。

测试页（用于 Phase 验证）：
- `server/routes/test-*.html.get.ts`
  - 一组可控测试页面：快/慢加载、多资源、iframe、OOPIF 等。
- `server/routes/slow-image.png.get.ts`
  - 延迟返回的图片资源端点（制造网络活动，用于 networkIdle/stability）。
- `server/routes/test-stagehand*.get.ts`
  - 固定布局按钮/输入框/iframe 测试页（Phase6/7/8/9/10 的统一基准）。


### `server/routes/control/`（核心：控制、编排、审计、验证）

基础控制通道：
- `server/routes/control/stream.ts`
  - SSE 命令流（server → verify/webapp），推送 `control.command` envelope。
- `server/routes/control/callback.post.ts`
  - 扩展执行结果回调入口（扩展 → server），校验 callback token 并写入 bus。
- `server/routes/control/events.post.ts` / `server/routes/control/events.get.ts`
  - 扩展转发的 CDP 事件落地与查询（调试/验证）。
- `server/routes/control/sessions.get.ts`
  - 会话/子 session 信息查询（便于调试 OOPIF/iframe session）。

命令下发与编排：
- `server/routes/control/enqueue.post.ts`
  - 单条 CDP 命令下发（签名后通过 SSE 发给扩展）。
- `server/routes/control/enqueue-batch.post.ts`
  - 批量下发 CDP 命令。
- `server/routes/control/run.post.ts`
  - 多步编排执行（顺序下发 + 等待 callback + 模板变量解析）。

能力 API：
- `server/routes/control/wait.post.ts`
  - 稳定性等待 API（pageLoad/domReady/networkIdle/stable）。
- `server/routes/control/act.post.ts`
  - 基础动作 API（较早期/简化动作入口）。
- `server/routes/control/act2.post.ts`
  - 确定性语义动作 API（selector→node→boxModel→Input），并承载 Phase9/10 的闭环字段（Policy/Confirm/Audit）。
- `server/routes/control/extract.post.ts`
  - 抽取 API（表达式/selector/全量信息抽取）。
- `server/routes/control/observe.post.ts`
  - 观测 API（文档、a11y tree、截图、frame tree 等）。

LLM Planner（Phase10）：
- `server/routes/control/plan.post.ts`
  - LLM 生成动作计划（严格 JSON + allowlist 校验），调用 OpenAI 兼容 `/v1/chat/completions`（本地 Qwen3）。

审计产物：
- `server/routes/control/replay/[taskId].get.ts`
  - 审计回放页（时间线 + before/after + 下载）。
- `server/routes/control/export/[taskId].get.ts`
  - 导出审计产物（默认 zip；`?format=json` 返回 JSON 用于断言/调试）。

一键验证页集合：
- `server/routes/control/verify/`
  - `phase5.get.ts`：wait/stability 验证。
  - `phase6.get.ts`：Stagehand 最小 act/extract/observe 验证。
  - `phase7.get.ts`：确定性 act2（同文档 + 同源 iframe 降级）验证。
  - `phase8.get.ts`：后台不打扰输入验证（边界与策略）。
  - `phase9.get.ts`：可控执行闭环验证（Confirm+Audit+Replay+Export 自动断言）。
  - `phase10.get.ts`：LLM 端到端验证（Plan→Act2→Confirm→Audit）。
  - `README.md`：verify 页索引与运行说明。


### `server/utils/`（服务端工具）

- `server/utils/logger.ts`
  - 统一 logger 封装。

- `server/utils/llm/openaiCompat.ts`
  - OpenAI 兼容 `/v1/chat/completions` 最小客户端（对接本地 Qwen3）。

- `server/utils/control/`（控制内核）
  - `keys.ts`：生成/管理签名密钥，签发 JWS，提供 JWKS。
  - `base64url.ts`：base64url 编解码工具（JWS 用）。
  - `bus.ts`：控制总线（SSE subscribers、pending command、callback waiters）。
  - `orchestrator.ts`：`/control/run` 多步编排实现（顺序执行 + 模板变量）。
  - `driverAdapter.ts`：服务端 Driver 适配器（发送 CDP、封装 click/type/screenshot/wait 等）。
  - `waitHelpers.ts`：wait/stability 底层辅助。
  - `sessionRegistry.ts`：tab/session/child session registry（OOPIF/iframe 支持）。
  - `taskExecution.ts`：Phase9 幂等/锁（task 锁、action 去重、错误码透传）。
  - `auditStore.ts`：审计落盘（JSONL + screenshots）与读取（回放/导出）。
  - `zipStore.ts`：最小 zip 打包器（store 模式，用于 export zip）。
  - `policy.ts`：Phase9-B Policy 判定（服务端权威 risk/confirm/reason，且不可被降级）。

### `server/plugins/`

- `server/plugins/skillsIndex.ts`
  - skills 索引插件（加载/构建 skillsIndex）。

### `server/types/`

- `server/types/skillsIndex.d.ts`
  - skillsIndex 类型声明。

---

## `extension/`（MV3 Chrome 扩展：CDP 执行侧）

- `extension/manifest.json`
  - 扩展声明（permissions、externally_connectable、action popup、notifications 权限等）。
- `extension/background.js`
  - Service Worker 主逻辑：
    - SSE 命令转发执行（`chrome.debugger` attach/send/detach）
    - JWS/JWKS 验签
    - 回调 server `/control/callback`
    - 事件转发 `/control/events`
    - Phase9 确认：`chrome.notifications` Approve/Reject + 降级 popup
    - 通知去重/点击打开 replay 等体验增强
- `extension/popup.html` / `extension/popup.js`
  - popup UI：查看 pending、手动 Approve/Reject、Test Notification、Open replay。
- `extension/jwks.js`
  - 拉取/缓存 JWKS 并验签相关逻辑入口。
- `extension/ecdsa.js`
  - ES256 验签实现。
- `extension/base64url.js`
  - base64url 工具（扩展侧）。
- `extension/icons/128.png`
  - 通知 icon（mac 通知中心兼容）。
- `extension/icons/128.svg`
  - 备用 icon（不保证通知中心可用）。
- `extension/README.md`
  - 扩展开发/加载说明。

---

## `verification/`（研发验证档案：每个 phase 的设计/验收/结论）

- `verification/contracts/contracts.md`
  - 控制端↔扩展通信契约（SSE、JWS/JWKS、callback 等）。
- `verification/inventory/`
  - `cdp_methods_inventory.md`：CDP 方法盘点。
  - `chrome_debugger_coverage.md`：chrome.debugger 覆盖度盘点。
- `verification/phase0-*.md` … `verification/phase8-*.md`
  - 各 phase 的验证记录与结论。
- `verification/phase9b-*.md`、`phase9c-*.md`、`phase9d-*.md`、`phase10b-*.md`
  - Phase9-B/C/D 与 Phase10-B 的分部计划文档。
- `verification/round*.log*`
  - 轮次运行日志归档。
- `verification/routing/`、`verification/smoke/`、`verification/notes/`
  - 路由发现、冒烟测试说明、复用决策记录等。

---

## `tests/`（自动化测试）

- `tests/verification/phase2.test.ts`
  - Phase2 相关的自动化测试（Vitest）。
- `tests/routes/api/`
  - API 路由测试集合（目录内逐文件为各 API 的测试用例）。

---

## `docs/`（知识库/外部文档整理）

- `docs/trusted-click-findings.md`
  - 可信 click/type 发现总结（Phase7/8 结论汇总）。
- `docs/产品概览-浏览器自动化能力建设.md`
  - 产品级能力建设总览。
- `docs/data-flow/`
  - 数据流/桥接落地记录（每篇为一次设计/验证总结）。
- `docs/nanobrowser/`、`docs/stagehand/`、`docs/skills/`、`docs/nitro/`
  - 各子系统的机制/依赖/流程文档。
- `docs/orama/`
  - Orama 文档镜像/翻译（大量编号章节 + `index.json`），用于检索与参考。

---

## `plans/`（前置设计方案/里程碑计划）

- `plans/browser-agent-mv3/`
  - MV3 浏览器代理分专题设计（协议、风险、审计、组件等）。
- `plans/browser-agent-mv3-design.md`
  - 设计总文档。
- `plans/stagenano/`
  - Stagehand×Nanobrowser×WebApp bridge 方案草案。

---

## `skills/`（Skill 示例/分发）

- `skills/allowed-tools-minimal/SKILL.md`
  - 最小允许工具示例。
- `skills/subagents-parallel/SKILL.md`
  - 并行子代理示例。
- `skills/troubleshoot-skills-loading/SKILL.md`
  - skills 加载排错示例。

---

## `sources/`（外部来源同步/清单）

- `sources/manifest.yml`
  - 来源清单。
- `sources/README.md`
  - 来源说明。
- `sources/sources-sync.ts`
  - 同步脚本（将外部来源同步到 `.sources/` 等）。
