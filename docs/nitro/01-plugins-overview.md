# Nitro Plugins 概览

本文整理自 Nitro 官方文档的 Plugins 指南：[`https://nitro.build/guide/plugins`](https://nitro.build/guide/plugins)。

## Plugins 是什么

Nitro 插件（Nitro plugins）用于**扩展 Nitro 运行时行为**。

- 插件会在服务端**启动时执行一次**
- 插件会收到 `nitroApp` 上下文，可用来注册 runtime hooks 等

## 自动注册与执行顺序

Nitro 会从 `plugins/` 目录**自动注册**插件，并在 Nitro **首次初始化时同步执行**。

- **执行时机**：服务器启动 / 首次 Nitro 初始化
- **执行次数**：每次启动仅一次（不是每个请求一次）
- **执行顺序**：按插件文件名顺序（建议用 `01-xxx.ts` 之类命名来显式控制顺序）

## 最小示例：创建一个插件

在 `server/plugins/test.ts`：

```ts
export default defineNitroPlugin((nitroApp) => {
  console.log('Nitro plugin', nitroApp)
})
```

> 提示：上面示例展示了插件入口形态与 `nitroApp` 入参；更常见的用法是结合 hooks（见下一篇与 runtime hooks 文档）。


