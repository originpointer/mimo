import { defineConfig } from "vitest/config"

export default defineConfig(async () => {
  // `vite-tsconfig-paths` 是 ESM-only。Vitest/Vite 可能会以 CJS 方式加载 config，
  // 这里用 dynamic import 避免 require() 报错。
  const { default: tsconfigPaths } = await import("vite-tsconfig-paths")

  return {
    // 自动读取 tsconfig.json 的 paths（本项目：@/* -> server/*）
    plugins: [tsconfigPaths()],
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"]
    }
  }
})


