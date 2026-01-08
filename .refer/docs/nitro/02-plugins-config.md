# Nitro Plugins 配置（plugins 选项）

本文整理自 Nitro 官方文档的 Plugins 指南：[`https://nitro.build/guide/plugins`](https://nitro.build/guide/plugins)。

## 默认约定：plugins/ 目录自动注册

如果你的插件文件放在项目的 `plugins/` 目录下，Nitro 会自动注册并在首次初始化时按文件名顺序执行（详见概览篇）。

## 自定义插件目录：使用 plugins 配置项

当插件不在 `plugins/` 目录时，可以通过 `plugins` 选项显式指定插件入口文件路径。

### Nitro（nitro.config.ts）

```ts
export default defineNitroConfig({
  plugins: ['my-plugins/hello.ts']
})
```

### Nuxt（nuxt.config.ts）

```ts
export default defineNuxtConfig({
  nitro: {
    plugins: ['my-plugins/hello.ts']
  }
})
```

## 小结

- `plugins/` 目录：自动注册、按文件名顺序执行
- `plugins` 配置项：用于把任意目录下的插件文件加入 Nitro 启动流程


