import { eventHandler, getQuery } from 'h3';
import { getExtensionIdByName, getExtensionRegistrationById } from '@/server/stores/extensionConfigStore';

export default eventHandler(async (event) => {
  const query = getQuery(event);

  // Backward compatible: original nitro-app behavior was query by extensionName.
  // We also support query by extensionId for convenience/debugging.
  const extensionId = String(query?.extensionId || '').trim();
  if (extensionId) {
    try {
      const latest = await getExtensionRegistrationById(extensionId);
      if (!latest) {
        event.node.res.statusCode = 404;
        return { ok: false, error: 'extension not registered' };
      }

      return { ok: true, ...latest };
    } catch {
      event.node.res.statusCode = 500;
      return { ok: false, error: 'failed to load extension registration' };
    }
  }

  const extensionName = String(query?.extensionName || '').trim();
  if (!extensionName) {
    event.node.res.statusCode = 400;
    return { ok: false, error: 'missing extensionName' };
  }

  try {
    const latest = await getExtensionIdByName(extensionName);
    if (!latest) {
      event.node.res.statusCode = 404;
      return { ok: false, error: 'extensionId not set' };
    }

    return {
      ok: true,
      extensionId: latest.extensionId,
      extensionName: latest.extensionName,
      updatedAt: latest.updatedAt,
    };
  } catch {
    event.node.res.statusCode = 500;
    return { ok: false, error: 'failed to load extensionId' };
  }
});

