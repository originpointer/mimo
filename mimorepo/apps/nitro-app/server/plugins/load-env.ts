import { config } from "dotenv";
import { defineNitroPlugin } from "nitropack/runtime";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

export default defineNitroPlugin(() => {
  const cwdEnvPath = path.join(process.cwd(), "apps", "nitro-app", ".env");
  const appEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));
  const repoEnvPath = fileURLToPath(new URL("../../../../.env", import.meta.url));

  if (existsSync(cwdEnvPath)) {
    config({ path: cwdEnvPath });
    return;
  }

  if (existsSync(appEnvPath)) {
    config({ path: appEnvPath });
    return;
  }

  if (existsSync(repoEnvPath)) {
    config({ path: repoEnvPath });
  }
});
