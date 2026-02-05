import { z } from "zod";

const base = {
  v: z.number().optional(),
};

export const activateExtensionSchema = z.object({
  ...base,
  type: z.literal("activate_extension"),
  id: z.string(),
  clientId: z.string(),
  ua: z.string(),
  version: z.string(),
  browserName: z.string(),
  allowOtherClient: z.boolean(),
  skipAuthorization: z.boolean(),
});

export const fullStateSyncSchema = z.object({
  ...base,
  type: z.literal("full_state_sync"),
  windows: z.array(z.any()),
  tabs: z.array(z.any()),
  tabGroups: z.array(z.any()),
  activeWindowId: z.number().nullable(),
  activeTabId: z.number().nullable(),
  timestamp: z.number(),
});

export const tabEventSchema = z.object({
  ...base,
  type: z.literal("tab_event"),
  eventType: z.string(),
  timestamp: z.number(),
  tab: z.any().optional(),
  window: z.any().optional(),
  tabGroup: z.any().optional(),
  tabId: z.number().optional(),
  windowId: z.number().optional(),
  tabGroupId: z.number().optional(),
});

export const browserActionSchema = z.object({
  ...base,
  type: z.literal("browser_action"),
  id: z.string(),
  taskId: z.string(),
  clientId: z.string(),
  timestamp: z.number(),
  action: z.record(z.string(), z.record(z.string(), z.any())),
  screenshotPresignedUrl: z.string().optional(),
});

export const browserActionResultSchema = z.object({
  ...base,
  type: z.literal("browser_action_result"),
  actionId: z.string(),
  taskId: z.string(),
  clientId: z.string(),
  status: z.enum(["success", "error", "partial"]),
  result: z.record(z.string(), z.any()).optional(),
  error: z.any().optional(),
});

export const pluginMessageSchema = z.discriminatedUnion("type", [
  activateExtensionSchema,
  fullStateSyncSchema,
  tabEventSchema,
  browserActionSchema,
  browserActionResultSchema,
]);
