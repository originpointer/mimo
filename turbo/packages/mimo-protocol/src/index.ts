export * from "./version";
export * from "./socket";
export * from "./http";

export * from "./messages/frontend";
export * from "./messages/plugin";
export * from "./messages/snapshot";

export * from "./schemas/frontend";
export * from "./schemas/plugin";
export * from "./schemas/snapshot";

import { frontendToServerMessageSchema } from "./schemas/frontend";
import { pluginMessageSchema } from "./schemas/plugin";
import type { FrontendToServerMessage } from "./messages/frontend";
import type { PluginMessage } from "./messages/plugin";

export function parseFrontendMessage(payload: unknown): FrontendToServerMessage | null {
  const parsed = frontendToServerMessageSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parsePluginMessage(payload: unknown): PluginMessage | null {
  const parsed = pluginMessageSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
