# Nitro Plugins 示例（hooks 的典型用法）

本文整理自 Nitro 官方文档的 Plugins 指南：[`https://nitro.build/guide/plugins`](https://nitro.build/guide/plugins)。

## 1) Capturing errors：捕获全局错误

通过 `error` hook 统一捕获应用错误：

```ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("error", async (error, { event }) => {
    console.error(`${event.path} Application error:`, error)
  });
})
```

## 2) Graceful shutdown：优雅关闭

在 Nitro 关闭时执行清理逻辑（`hookOnce` 只触发一次）：

```ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hookOnce("close", async () => {
    // Will run when nitro is closed
    console.log("Closing nitro server...")
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Task is done!");
  });
})
```

## 3) Request/Response lifecycle：请求与响应生命周期

使用 `request`、`beforeResponse`、`afterResponse` 在请求/响应链路打点或观测：

```ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    console.log("on request", event.path);
  });

  nitroApp.hooks.hook("beforeResponse", (event, { body }) => {
    console.log("on response", event.path, { body });
  });

  nitroApp.hooks.hook("afterResponse", (event, { body }) => {
    console.log("on after response", event.path, { body });
  });
});
```

## 4) Renderer response：修改渲染器响应（render:response）

该 hook 可用于检查/修改 renderer response：

```ts
export default defineNitroPlugin((nitro) => {

  nitro.hooks.hook('render:response', (response, { event }) => {
    // Inspect or Modify the renderer response here
    console.log(response)
  })
})
```

重要限制（文档说明）：

- 仅对通过 renderer 定义的 render handler 生效
- **不会**对其它 api/server routes 调用
- 在 Nuxt 中，该 hook 会对 Server-side rendered pages 调用


