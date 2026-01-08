# Nitro Custom Presets（自定义预设）

本文整理自 Nitro 官方文档的 Custom Preset 示例：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)。

## 适用场景

当你需要：

- 使用 Nitro 尚未内置支持的部署提供商（provider）
- 或者想在现有 preset 基础上做定制化修改

可以在项目内创建**本地自定义 preset**（custom preset）。

> 文档提示：Custom local preset support 属于 experimental（实验性功能）。详见来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)。

## 自定义 preset 的组成

一个本地 preset 目录通常包含两类入口：

- **preset 配置入口**：定义 builder 配置 + runtime 入口（entry point）
- **runtime 入口文件**：最终被你的 server/provider 使用的启动入口，可完全自定义行为

## 示例：创建 preset/nitro.config.ts

在项目中新建 `preset/nitro.config.ts`：

```ts
import type { NitroPreset } from "nitropack";
import { fileURLToPath } from "node:url"

export default <NitroPreset>{
  // extends: "node-server", // You can extend existing presets
  entry: fileURLToPath(new URL("./entry.ts", import.meta.url)),
  hooks: {
    compiled() {
      // ...
    },
  },
};
```

要点：

- **`extends`（可选）**：可以基于现有 preset 扩展（示例里注释了 `node-server`）
- **`entry`（必需）**：指定 runtime 入口文件（例如 `preset/entry.ts`）
- **`hooks.compiled()`（可选）**：编译完成后触发的 hook，可用于注入额外逻辑（示例留空）

来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)

## 示例：runtime entry.ts（Workers 形态）

```ts
import "#internal/nitro/virtual/polyfill";

const nitroApp = useNitroApp();

export default {
  fetch(request: Request) {
    const url = new URL(request.url);
    return nitroApp.localFetch(url.pathname + url.search, {
      context: {},
      host: url.hostname,
      protocol: url.protocol,
      method: request.method,
      headers: request.headers,
      body: undefined,
    });
  },
};
```

要点：

- 通过 `#internal/nitro/virtual/polyfill` 引入 Nitro 运行时所需的 polyfill
- 使用 `useNitroApp()` 获取 Nitro 全局 app
- 在 `fetch(request)` 中把外部请求映射为 `nitroApp.localFetch(...)` 调用
- `localFetch` 的 `context` 可用于传入自定义上下文（示例给了空对象）

来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)

## 示例：runtime entry.ts（Node.js 形态）

```ts
import "#internal/nitro/virtual/polyfill";
import { Server } from "node:http";
import { toNodeListener } from "h3";

const nitroApp = useNitroApp();
const server = new Server(toNodeListener(nitroApp.h3App));

// @ts-ignore
server.listen(3000, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Listening on http://localhost:3000 (custom preset)`);
});
```

要点：

- 使用 `toNodeListener(nitroApp.h3App)` 把 Nitro 的 h3 app 变成 Node HTTP listener
- 用 `Server(...).listen(...)` 启动服务（示例监听 3000）

来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)

## 在项目中启用自定义 preset

在 `nitro.config.ts` 中指定 preset 路径（示例为 `./preset`）：

```ts
export default defineNitroConfig({
  preset: "./preset",
});
```

> Nuxt 项目则使用 `defineNuxtConfig({ nitro: { preset: "./preset" } })`（同一段落示例）。

来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)

## 进一步参考

文档建议：如需更深入理解 presets 与 entry points，直接参考 Nitro 源码；并提到 `nitrojs/nitro-preset-starter` 作为可用模板。来源：[`https://nitro.build/deploy/custom-presets#example`](https://nitro.build/deploy/custom-presets#example)。


