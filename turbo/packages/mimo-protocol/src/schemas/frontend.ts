import { z } from "zod";

export const frontendUserMessageSchema = z.object({
  v: z.number().optional(),
  type: z.literal("user_message"),
  id: z.string(),
  timestamp: z.number(),
  taskId: z.string(),
  content: z.string(),
});

export const frontendToServerMessageSchema = z.discriminatedUnion("type", [frontendUserMessageSchema]);

export type FrontendUserMessageSchema = z.infer<typeof frontendUserMessageSchema>;
