### Nanobrowser（core_ext）文档

本目录整理 `/Users/sodaabe/codes/coding/mimo/.sources/nanobrowser` 的 **核心扩展（core_ext）** 代码与文档：聚焦 `chrome-extension/src/background`（执行引擎/多 agent/DOM）与 `packages/storage`（配置与历史）。

### 快速入口（代码）

- **Background 入口**：`chrome-extension/src/background/index.ts`
- **任务编排**：`chrome-extension/src/background/agent/executor.ts`（`class Executor`）
- **浏览器抽象**：
  - `chrome-extension/src/background/browser/context.ts`（`class BrowserContext`）
  - `chrome-extension/src/background/browser/page.ts`（`class Page`）
- **DOM/可点击元素**：`chrome-extension/src/background/browser/dom/service.ts`
- **存储**：`packages/storage/lib/settings/*`、`packages/storage/lib/chat/history.ts`

### 文档索引

- **架构概览**：[`overview.md`](./overview.md)
- **实现类清单 + 依赖关系**：[`dependencies.md`](./dependencies.md)
- **任务执行链路（new_task -> Executor.execute）**：[`flows-task-execution.md`](./flows-task-execution.md)
- **DOM 注入与观察链路（DOM tree / iframe fallback / clickable map）**：[`flows-dom-and-observation.md`](./flows-dom-and-observation.md)
- **Storage（providers/models/settings/history）**：[`storage.md`](./storage.md)

### 范围说明

- **包含**：background/service worker、BrowserContext/Page、Executor/Planner/Navigator、ActionBuilder、MessageManager/EventManager、DOM service、`packages/storage` 中被 background 使用的 stores。
- **不包含**：UI pages（side-panel/options/content）与其它 packages（shared/ui/i18n/schema-utils/hmr 等）。
