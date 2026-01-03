# Nitro runtime hooks

本文整理自 Nitro 官方文档的 Plugins 指南：[`https://nitro.build/guide/plugins`](https://nitro.build/guide/plugins)。

## 什么是 runtime hooks

Nitro 允许你在插件内注册 hooks，以在生命周期事件发生时执行自定义逻辑（同步或异步均可）。

注册方式是在 `defineNitroPlugin` 内对 `nitro.hooks`（或 `nitroApp.hooks`）进行 `hook(...)` / `hookOnce(...)`。

## 基本用法（注册一个 hook）

```ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("close", async () => {
    // Will run when nitro is being closed
  });
})
```

## 可用 hooks（文档列出的条目）

> 注：官方文档提示“可用 hooks 的完整列表请看源码”；此处仅整理该页面明确列出的 hooks。

- `"close", () => {}`
- `"error", (error, { event? }) => {}`
- `"render:response", (response, { event }) => {}`
- `"request", (event) => {}`
- `"beforeResponse", (event, { body }) => {}`
- `"afterResponse", (event, { body }) => {}`

## 参数与使用要点（以示例为准）

- **`request`**：入参为 `event`，可用 `event.path` 等信息做请求级处理/日志。
- **`beforeResponse` / `afterResponse`**：回调签名包含 `event` 与 `{ body }`，可在响应前/后观测返回内容。
- **`error`**：回调签名为 `(error, { event })`，可按 `event.path` 记录统一错误日志；`event` 在类型上可选（`event?`）。
- **`render:response`**：回调签名为 `(response, { event })`，可检查或修改 renderer response（限制见示例文档）。


