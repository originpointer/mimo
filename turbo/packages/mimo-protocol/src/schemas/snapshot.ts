import { z } from "zod";

export const snapshotStateSchema = z.object({
  windows: z.array(z.any()),
  tabs: z.array(z.any()),
  tabGroups: z.array(z.any()),
  activeWindowId: z.number().nullable(),
  activeTabId: z.number().nullable(),
  lastUpdated: z.number(),
});
