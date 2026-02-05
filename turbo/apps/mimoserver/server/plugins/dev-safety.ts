import { defineNitroPlugin } from "nitropack/runtime";

/**
 * Node.js v22 defaults unhandled promise rejections to `throw`, which can crash `nitro dev`.
 * In local dev we prefer logging + continuing so transient socket errors (e.g. ECONNRESET)
 * don't kill the whole server.
 *
 * IMPORTANT: Install unhandledRejection/uncaughtException handlers BEFORE the plugin
 * to catch errors from early initialization. This must be at module scope level.
 */
if (process.env.NODE_ENV !== "production") {
  // Avoid registering multiple times during dev reloads.
  const g = globalThis as any;
  if (!g.__mimoDevSafetyInstalled) {
    g.__mimoDevSafetyInstalled = true;

    process.on("unhandledRejection", (reason: any) => {
      const code = reason?.code;
      const message = reason?.message ?? String(reason);

      // Silently ignore ECONNRESET/EPIPE - these are expected during normal WebSocket operation
      if (code === "ECONNRESET" || code === "EPIPE") {
        return;
      }

      // Keep it noisy but non-fatal in dev for other errors.
      // eslint-disable-next-line no-console
      console.error("[mimoserver] unhandledRejection", { code, message, stack: reason?.stack });
    });

    process.on("uncaughtException", (err: any) => {
      const code = err?.code;
      if (code === "ECONNRESET" || code === "EPIPE") {
        return;
      }
      // eslint-disable-next-line no-console
      console.error("[mimoserver] uncaughtException", { code: err?.code, message: err?.message, stack: err?.stack });
    });
  }
}

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV === "production") return;

  // Note: The listen hook doesn't exist in Nitro's plugin API.
  // Socket.IO is now integrated via nitroApp.router.use() in the mimo-bus plugin.
  // Error handling is done at the process level above and in the Socket.IO handlers.

  // Log when the plugin is loaded
  // eslint-disable-next-line no-console
  console.log("[mimoserver] dev-safety: Plugin loaded (process-level handlers active)");
});
