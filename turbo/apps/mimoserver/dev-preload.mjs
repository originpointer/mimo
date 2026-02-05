// Preload hook for dev: ensure unhandled rejections are handled before Nitro boots.
if (process.env.NODE_ENV !== "production") {
  const g = globalThis;
  if (!g.__mimoDevSafetyPreloadInstalled) {
    g.__mimoDevSafetyPreloadInstalled = true;

    const ignoredCodes = new Set(["ECONNRESET", "EPIPE"]);

    const normalize = (err) => ({
      code: err?.code,
      message: err?.message ?? String(err),
      stack: err?.stack,
    });

    // Handle unhandled rejections by attaching a dummy handler to the promise
    // This prevents Node.js from logging warnings
    process.on("unhandledRejection", (reason, promise) => {
      const info = normalize(reason);
      if (ignoredCodes.has(info.code)) {
        // Attach a dummy handler to prevent the warning
        promise.catch(() => {
          // Silently swallow known connection errors
        });
        return;
      }
      // eslint-disable-next-line no-console
      console.error("[mimoserver] unhandledRejection (preload)", info);
    });

    process.on("uncaughtException", (err) => {
      const info = normalize(err);
      if (ignoredCodes.has(info.code)) return;
      // eslint-disable-next-line no-console
      console.error("[mimoserver] uncaughtException (preload)", info);
    });
  }
}
