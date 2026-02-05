export const MIMO_NAMESPACE = "/mimo" as const;

export const MimoSocketEvent = {
  FrontendMessage: "frontend_message",
  FrontendEvent: "frontend_event",
  PluginMessage: "plugin_message",
} as const;

export type MimoSocketEvent = (typeof MimoSocketEvent)[keyof typeof MimoSocketEvent];
