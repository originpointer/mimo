import { eventHandler } from 'h3';
import { listExtensionRegistrations } from '@/server/stores/extensionConfigStore';

export default eventHandler(async (event) => {
  let items = [];
  try {
    items = await listExtensionRegistrations();
  } catch {
    event.node.res.statusCode = 500;
    return { ok: false, error: 'failed to load extension list' };
  }

  const extensions = [...items].sort((a, b) => a.extensionName.localeCompare(b.extensionName));
  const latest = extensions.reduce<null | (typeof extensions)[number]>((acc, it) => {
    if (!acc || it.updatedAt > acc.updatedAt) return it;
    return acc;
  }, null);

  return {
    ok: true,
    extensions,
    latest,
  };
});

