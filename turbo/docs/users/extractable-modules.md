# Extractable Modules

此文档记录可在 MVP 稳定后抽离为独立 package 的模块。

## 候选

- `apps/mimoserver/server/agent/*` → `packages/mimo-agent`
- `apps/mimoserver/server/modules/action-scheduler.ts` → `packages/mimo-agent`
- `apps/mimocrx/src/background/*` 中的执行器

## 原则

- 先在 apps 内稳定接口，再抽离。
- 保持协议层 `mimo-protocol` 为单一事实来源。
