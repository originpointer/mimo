import { eventHandler } from "h3";

export default eventHandler(() => {
  const runtime = globalThis.__mimo;
  if (!runtime) {
    return {
      ok: true,
      data: {
        windows: [],
        tabs: [],
        tabGroups: [],
        activeWindowId: null,
        activeTabId: null,
        lastUpdated: 0,
        connected: false,
        ageMs: 0,
        stale: true,
      },
    };
  }

  const snapshot = runtime.snapshotStore.getSnapshot();
  return {
    ok: true,
    data: snapshot,
  };
});
