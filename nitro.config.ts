import { defineNitroConfig } from "nitropack/config"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

// https://nitro.build/config
export default defineNitroConfig({
  compatibilityDate: "latest",
  srcDir: "server",
  alias: {
    "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "server")
  },
  imports: false
});
