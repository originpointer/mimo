import { defineNitroConfig } from "nitropack/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineNitroConfig({
  compatibilityDate: "latest",
  srcDir: "server",
  // Narrow scanning to this app's server directory to avoid watching the whole monorepo.
  scanDirs: [path.join(__dirname, "server")],
  // Enable experimental WebSocket support for Socket.IO integration
  experimental: {
    websocket: true,
  },
  // Keep Nitro dev watcher from scanning the whole monorepo (prevents EMFILE on macOS).
  devServer: {
    watch: ["server", "nitro.config.ts"],
  },
  watchOptions: {
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.data/**",
      "**/.output/**",
      "**/dist/**",
      "**/build/**",
      "**/uploads/**",
    ],
  },
  alias: {
    "@": path.join(__dirname, "./server"),
  },
  routeRules: {
    "/api/**": {
      cors: true,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  },
  storage: {
    data: {
      driver: "fs",
      base: ".data/kv",
    },
  },
});
